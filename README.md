# Indirio Codebase

This repository contains the Next.js source code for [indirio.com.tr](https://indirio.com.tr).

## Architecture

The project is structured as a single Next.js application that handles the web frontend, background tasks, and download processing:

- **Frontend**: Responsive UI built with React, Tailwind CSS, and Framer Motion.
- **Backend API**: Next.js App Router API endpoints (`/api/analyze`, `/api/download`, `/api/stats`).
- **Core Engine**: Integrates with `yt-dlp` and `ffmpeg` to process media streams.
- **Data & Queue**: In-memory task queuing and sliding window rate limiting.

## Requirements

- Node.js 18+
- yt-dlp
- FFmpeg

## License

MIT License.
