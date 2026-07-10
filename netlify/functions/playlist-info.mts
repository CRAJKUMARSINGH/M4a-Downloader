import type { Context } from "@netlify/functions";

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
    // Extract playlist ID from URL
    const playlistMatch = url.match(/[?&]list=([^&]+)/);
    if (!playlistMatch) {
      return new Response(JSON.stringify({ error: "No playlist ID found in URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const playlistId = playlistMatch[1];
    
    // Use Invidious API (public instance)
    const apiUrl = `https://vid.puffyan.us/api/v1/playlists/${playlistId}`;
    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Invidious API returned ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.videos || data.videos.length === 0) {
      return new Response(JSON.stringify({ error: "No videos found in playlist" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const entries = data.videos.map((video: any) => ({
      url: `https://www.youtube.com/watch?v=${video.videoId}`,
      title: video.title || "Unknown",
      duration: video.lengthSeconds || 0,
      thumbnail: video.videoThumbnails?.find((t: any) => t.quality === "medium")?.url ||
                 video.videoThumbnails?.[0]?.url ||
                 `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`,
    }));

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
