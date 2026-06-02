import { Router } from "express";
import { spawn } from "child_process";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import os from "os";
import type { Response } from "express";

const router = Router();

const YTDLP = "/home/runner/workspace/.pythonlibs/bin/yt-dlp";
const FFMPEG = "ffmpeg";
const JOBS_TTL_MS = 30 * 60 * 1000; // 30 min

type JobStatus = "pending" | "fetching" | "downloading" | "converting" | "done" | "error";

interface JobRecord {
  id: string;
  url: string;
  format: string;
  status: JobStatus;
  progress: number;
  speed: string;
  eta: string;
  filePath?: string;
  filename?: string;
  error?: string;
  clients: Set<Response>;
  createdAt: number;
}

const jobs = new Map<string, JobRecord>();

function broadcast(job: JobRecord) {
  const payload = JSON.stringify({
    status: job.status,
    progress: job.progress,
    speed: job.speed,
    eta: job.eta,
    filename: job.filename,
    error: job.error,
  });
  for (const res of job.clients) {
    try {
      res.write(`data: ${payload}\n\n`);
    } catch {
    }
  }
}

function closeClients(job: JobRecord) {
  for (const res of job.clients) {
    try {
      res.end();
    } catch {
    }
  }
  job.clients.clear();
}

function cleanupOldJobs() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > JOBS_TTL_MS) {
      if (job.filePath) {
        try {
          fs.unlinkSync(job.filePath);
        } catch {
        }
      }
      jobs.delete(id);
    }
  }
}

setInterval(cleanupOldJobs, 10 * 60 * 1000);

function parseProgress(line: string): { pct?: number; speed?: string; eta?: string } {
  const pctMatch = line.match(/(\d+\.?\d*)\s*%/);
  const speedMatch = line.match(/at\s+([\d.]+\s*\S+\/s)/);
  const etaMatch = line.match(/ETA\s+(\d+:\d+(?::\d+)?)/);
  return {
    pct: pctMatch ? parseFloat(pctMatch[1]) : undefined,
    speed: speedMatch ? speedMatch[1] : undefined,
    eta: etaMatch ? etaMatch[1] : undefined,
  };
}

router.get("/video-info", async (req, res) => {
  const url = req.query["url"] as string;
  if (!url) {
    res.status(400).json({ error: "url query param required" });
    return;
  }
  if (!/youtu(\.be|be\.com)/i.test(url)) {
    res.status(400).json({ error: "Invalid YouTube URL" });
    return;
  }

  try {
    const info = await fetchVideoInfo(url);
    res.json(info);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: msg });
  }
});

async function fetchVideoInfo(url: string): Promise<object> {
  return new Promise((resolve, reject) => {
    const args = [
      "--dump-json",
      "--no-playlist",
      "--no-warnings",
      "--skip-download",
      "--socket-timeout",
      "20",
      url,
    ];
    let stdout = "";
    let stderr = "";
    const proc = spawn(YTDLP, args);
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.split("\n").filter(Boolean).slice(-2).join(" ") || "yt-dlp failed"));
        return;
      }
      try {
        const data = JSON.parse(stdout);
        const formats: Record<string, unknown>[] = Array.isArray(data.formats) ? data.formats : [];
        const audioFmt = formats
          .filter((f) => f["acodec"] && f["acodec"] !== "none")
          .sort((a, b) => ((b["abr"] as number) || 0) - ((a["abr"] as number) || 0))[0] || {};
        resolve({
          title: data.title || "Unknown",
          duration: data.duration || 0,
          thumbnail: data.thumbnail || "",
          filesize: (audioFmt["filesize"] as number) || (audioFmt["filesize_approx"] as number) || null,
          bitrate: (audioFmt["abr"] as number) || null,
          videoId: data.id || "",
        });
      } catch {
        reject(new Error("Failed to parse video info"));
      }
    });
    proc.on("error", (e) => reject(new Error(`yt-dlp not found: ${e.message}`)));
  });
}

router.post("/downloads", async (req, res) => {
  const { url, format } = req.body as { url?: string; format?: string };
  if (!url || !format) {
    res.status(400).json({ error: "url and format are required" });
    return;
  }
  if (!["mp3", "m4a", "mp4"].includes(format)) {
    res.status(400).json({ error: "format must be mp3, m4a, or mp4" });
    return;
  }

  const jobId = uuidv4();
  const tmpDir = os.tmpdir();
  const outTemplate = path.join(tmpDir, `ydl_${jobId}_%(title)s.%(ext)s`);

  const job: JobRecord = {
    id: jobId,
    url,
    format,
    status: "pending",
    progress: 0,
    speed: "",
    eta: "",
    clients: new Set(),
    createdAt: Date.now(),
  };
  jobs.set(jobId, job);

  res.status(201).json({ jobId });

  setImmediate(() => runDownload(job, outTemplate, format));
});

function runDownload(job: JobRecord, outTemplate: string, format: string) {
  job.status = "downloading";
  broadcast(job);

  const isVideo = format === "mp4";

  const args = isVideo
    ? [
        "--no-playlist",
        "--no-warnings",
        "--newline",
        "--progress",
        "--socket-timeout",
        "30",
        "-f",
        "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best",
        "--merge-output-format",
        "mp4",
        "--ffmpeg-location",
        FFMPEG,
        "-o",
        outTemplate,
        job.url,
      ]
    : [
        "--no-playlist",
        "--no-warnings",
        "--newline",
        "--progress",
        "--socket-timeout",
        "30",
        "-x",
        "--audio-format",
        format,
        "--audio-quality",
        "0",
        "--ffmpeg-location",
        FFMPEG,
        "-o",
        outTemplate,
        job.url,
      ];

  const proc = spawn(YTDLP, args);
  let stderrBuf = "";

  function parseLine(line: string) {
    if (line.includes("[download]") && line.includes("%")) {
      const { pct, speed, eta } = parseProgress(line);
      if (pct !== undefined) job.progress = Math.min(pct, 99);
      if (speed) job.speed = speed;
      if (eta) job.eta = eta;
      job.status = "downloading";
      broadcast(job);
    } else if (line.includes("[ExtractAudio]") || line.includes("[ffmpeg]") || line.includes("Destination:")) {
      job.status = "converting";
      job.progress = 99;
      broadcast(job);
    }
  }

  proc.stdout.on("data", (chunk: Buffer) => {
    const lines = chunk.toString().split("\n");
    for (const line of lines) parseLine(line.trim());
  });

  proc.stderr.on("data", (chunk: Buffer) => {
    stderrBuf += chunk.toString();
    const lines = stderrBuf.split("\n");
    stderrBuf = lines.pop() || "";
    for (const line of lines) parseLine(line.trim());
  });

  proc.on("close", (code) => {
    if (code !== 0) {
      job.status = "error";
      job.error = stderrBuf.split("\n").filter(Boolean).slice(-2).join(" ") || "Download failed";
      broadcast(job);
      closeClients(job);
      return;
    }

    const tmpDir = path.dirname(outTemplate);
    const prefix = `ydl_${job.id}_`;
    try {
      const files = fs.readdirSync(tmpDir).filter((f) => f.startsWith(prefix) && f.endsWith(`.${format}`));
      if (files.length === 0) {
        job.status = "error";
        job.error = "Output file not found after download";
        broadcast(job);
        closeClients(job);
        return;
      }
      job.filePath = path.join(tmpDir, files[0]);
      job.filename = files[0].replace(prefix, "");
      job.status = "done";
      job.progress = 100;
      broadcast(job);
    } catch (e) {
      job.status = "error";
      job.error = String(e);
      broadcast(job);
    }
    closeClients(job);
  });

  proc.on("error", (e) => {
    job.status = "error";
    job.error = `yt-dlp error: ${e.message}`;
    broadcast(job);
    closeClients(job);
  });
}

router.get("/downloads/:jobId/events", (req, res) => {
  const job = jobs.get(req.params["jobId"]!);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const payload = JSON.stringify({
    status: job.status,
    progress: job.progress,
    speed: job.speed,
    eta: job.eta,
    filename: job.filename,
    error: job.error,
  });
  res.write(`data: ${payload}\n\n`);

  if (job.status === "done" || job.status === "error") {
    res.end();
    return;
  }

  job.clients.add(res);

  req.on("close", () => {
    job.clients.delete(res);
  });
});

router.get("/downloads/:jobId/file", (req, res) => {
  const job = jobs.get(req.params["jobId"]!);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  if (job.status !== "done" || !job.filePath) {
    res.status(400).json({ error: "File not ready" });
    return;
  }
  if (!fs.existsSync(job.filePath)) {
    res.status(410).json({ error: "File has been removed" });
    return;
  }

  const mime = job.format === "mp3" ? "audio/mpeg" : job.format === "mp4" ? "video/mp4" : "audio/mp4";
  const safeFilename = encodeURIComponent(job.filename || `download.${job.format}`);
  res.setHeader("Content-Type", mime);
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${safeFilename}`);

  const stream = fs.createReadStream(job.filePath);
  stream.pipe(res);

  stream.on("close", () => {
    try {
      if (job.filePath) fs.unlinkSync(job.filePath);
    } catch {
    }
    jobs.delete(job.id);
  });
});

export default router;
