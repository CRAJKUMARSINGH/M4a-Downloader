import type { Context } from "@netlify/functions";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const YTDLP_CANDIDATES = [
  "/opt/buildhome/python3.11/bin/yt-dlp",
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
    const args = [
      "--flat-playlist",
      "--dump-json",
      "--no-warnings",
      "--socket-timeout",
      "30",
      url,
    ];

    const { stdout, stderr } = await execFileAsync(ytdlp, args);

    const lines = stdout.split("\n").filter(Boolean);
    const entries: object[] = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const videoUrl = entry.url?.startsWith("http")
          ? entry.url
          : `https://www.youtube.com/watch?v=${entry.id}`;
        entries.push({
          url: videoUrl,
          title: entry.title || "Unknown",
          duration: entry.duration || 0,
          thumbnail:
            entry.thumbnail ||
            (entry.thumbnails && entry.thumbnails[0]?.url) ||
            `https://i.ytimg.com/vi/${entry.id}/mqdefault.jpg`,
        });
      } catch {
        // Skip invalid JSON lines
      }
    }

    if (entries.length === 0) {
      const errMsg = stderr.split("\n").filter(Boolean).slice(-2).join(" ") || "No entries found in playlist";
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ entries, count: entries.length }), {
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
  path: "/api/playlist-info",
};
