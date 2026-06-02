import type { Context } from "@netlify/functions";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const YTDLP_CANDIDATES = [
  "/home/runner/workspace/.pythonlibs/bin/yt-dlp",
  "/usr/local/bin/yt-dlp",
  "/usr/bin/yt-dlp",
  "yt-dlp",
];

async function findYtdlp(): Promise<string> {
  for (const candidate of YTDLP_CANDIDATES) {
    try {
      await execFileAsync(candidate, ["--version"]);
      return candidate;
    } catch {
      continue;
    }
  }
  throw new Error("yt-dlp not found. Install it: pip install yt-dlp");
}

export default async function handler(req: Request, _ctx: Context) {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url).searchParams.get("url");
  if (!url) {
    return new Response(JSON.stringify({ error: "url query param required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!/youtu(\.be|be\.com)/i.test(url)) {
    return new Response(JSON.stringify({ error: "Invalid YouTube URL" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const ytdlp = await findYtdlp();
    const { stdout } = await execFileAsync(ytdlp, [
      "--dump-json",
      "--no-playlist",
      "--no-warnings",
      "--skip-download",
      "--socket-timeout",
      "18",
      url,
    ]);

    const data = JSON.parse(stdout);
    const formats: Record<string, unknown>[] = Array.isArray(data.formats) ? data.formats : [];
    const audioFmt = formats
      .filter((f) => f["acodec"] && f["acodec"] !== "none")
      .sort((a, b) => ((b["abr"] as number) || 0) - ((a["abr"] as number) || 0))[0] || {};

    const info = {
      title: data.title || "Unknown",
      duration: data.duration || 0,
      thumbnail: data.thumbnail || "",
      filesize: (audioFmt["filesize"] as number) || (audioFmt["filesize_approx"] as number) || null,
      bitrate: (audioFmt["abr"] as number) || null,
      videoId: data.id || "",
    };

    return new Response(JSON.stringify(info), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const config = {
  path: "/api/video-info",
};
