# M4a Downloader

A YouTube audio downloader web app. Paste a YouTube URL, pick your format (M4A, MP3, or MP4), and download directly to your device.

## Live Demo

**[https://m4a-audio-downloaded.netlify.app/](https://m4a-audio-downloaded.netlify.app/)**

## Features

- Download YouTube audio as M4A, MP3, or MP4
- Real-time progress tracking via Server-Sent Events
- Playlist support — fetch all tracks and queue downloads
- Files saved directly to your system's Downloads folder
- Dark mode UI built with React + Tailwind CSS

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS v4, TanStack Query |
| Backend | Node.js, Express 5, yt-dlp, ffmpeg |
| Deployment | Netlify (frontend + functions), Express API server |

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/) v11+
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) — `pip install yt-dlp`
- [ffmpeg](https://ffmpeg.org/) — available on PATH

### Install & Run

```bash
# Install dependencies
pnpm install

# Start the API server (port 3001)
pnpm --filter @workspace/api-server run dev

# Start the frontend (port 3000)
pnpm --filter @workspace/m4a-downloader run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Netlify (Frontend)

The frontend is deployed at **[https://m4a-audio-downloaded.netlify.app/](https://m4a-audio-downloaded.netlify.app/)**.

Build settings (defined in `netlify.toml`):

| Setting | Value |
|---|---|
| Base directory | `artifacts/m4a-downloader` |
| Build command | `npm run build` |
| Publish directory | `dist/public` |
| Node version | 20 |

The `/api/video-info` endpoint is served by a Netlify Function (`netlify/functions/video-info.mts`).

Download jobs (progress events + file serving) require the Express API server to be deployed separately (e.g. Render, Railway) with the `BACKEND_URL` environment variable set in Netlify.

### Manual Build

```bash
pnpm --filter @workspace/m4a-downloader run build
# Output: artifacts/m4a-downloader/dist/public
```

## Project Structure

```
M4a-Downloader/
├── artifacts/
│   ├── api-server/        # Express backend (yt-dlp wrapper)
│   └── m4a-downloader/    # React frontend (Vite)
├── lib/
│   ├── api-client-react/  # Shared API client hooks
│   ├── api-spec/          # API type definitions
│   ├── api-zod/           # Zod validation schemas
│   └── db/                # Database layer
├── netlify/
│   └── functions/         # Netlify serverless functions
├── netlify.toml           # Netlify build & redirect config
└── pnpm-workspace.yaml    # pnpm monorepo config
```

## License

MIT
