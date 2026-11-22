# Contributing to Alpemox

Thank you for helping build **Alpemox Creative Suite** (AGPL-3.0-only)!

## Development Setup

```bash
git clone https://github.com/ZypherStudio/alpemox.git
cd alpemox
npm install
npm run build
npm test
npm run dev
```

- Studio dev UI: `http://localhost:5173`
- API + WebSocket server: `http://localhost:4310`

## Architecture Overview

- `packages/shared` — Shared TypeScript types, model catalog, pose presets, suite metadata, and roadmap constants.
- `packages/mcp` — Model Context Protocol (`stdio`) server and CLI (`opencraft-mcp`, `opencraft-cli`).
- `apps/server` — Express REST API, WebSocket live sync (`/ws`), multi-provider AI hub, `.ZIP` asset pack generator, waitlist & feature requests.
- `apps/studio` — React 19 + TypeScript + Tailwind v4 + Three.js + Zustand frontend (`Website`, `Launcher`, `Photo`, `Vector`, `Film`, `3D Stage`, `Moodboard`, `Nodes`).
- `apps/desktop` — Tauri v2 desktop wrapper configuration.

## Great First Contributions
- Add new `.cube` LUT presets or image filters in `Canvas2DEditor.tsx` and `apps/server/src/packs.mjs`.
- Add new SVG shape primitives or keyframe animations in `VectorEditor.tsx`.
- Add new Film transitions/filters or easing presets in `packages/shared` and `FilmEditor.tsx`.
- Improve Tauri v2 desktop builds (`apps/desktop`) for macOS/Windows/Linux.

## Attribution & License
All contributions are licensed under **AGPL-3.0-only**. Please keep trademark rules in `NOTICE` intact.
