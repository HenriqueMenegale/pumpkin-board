### Aby White‑Board (React + PixiJS)

A small test project for Aby showcasing a canvas/WebGL whiteboard built with PixiJS and React. It demonstrates adding images and videos by URL, selecting and moving elements, basic property editing, and canvas panning.

### Deployed URL:
https://aby-board-odcr5.ondigitalocean.app/

#### Tech stack
- Build: Vite (vite@^7) + TypeScript (TS 5.9)
- UI: React 19
- State: Zustand 5
- Rendering: PixiJS v8 (core `pixi.js`)

#### Constraints and environment notes
- WebGL + CORS for media
  - Images and videos are sampled by WebGL as GPU textures. Cross‑origin URLs must send `Access-Control-Allow-Origin` (e.g., `*` or your origin) or the browser will block usage as a texture.
  - The whiteboard uses Pixi’s retained scene graph (no full‑canvas React re‑painting). Sprites and textures are updated in place.
  - Placeholders are shown immediately while media loads, swapping to real textures once ready. Async creation is coalesced to avoid duplicate work.
  - Resource cleanup is performed on removal/unmount (sprites destroyed, videos paused, pending loads cleared).

#### WebGL usage
- Rendering is handled by PixiJS v8 (WebGL renderer). Both images and videos are uploaded as GPU textures:
  - Images: `Texture.from(imageElement)` after loading; placeholder `Texture.WHITE` visible immediately.
  - Videos: `Texture.from(videoElement)`, updating frame‑by‑frame on the GPU.
- Image blend modes are supported and can be changed from the Properties panel (e.g., Normal, Multiply, Screen, Overlay...).

#### Running it
- How to run locally
  1. `npm install`
  2. `npm run dev` → open the printed local URL (typically `http://localhost:5173`)
  3. Add media via toolbar buttons, or seed via Debug panel.
- How to build
  - `npm run build` (outputs to `dist/`).
- WebGL & CORS in deployments
  - If hosting media on a different origin, enable CORS headers: `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods: GET, HEAD, OPTIONS`, correct `Content-Type`.
  - Alternatively, host assets under the same origin (e.g., place under `public/`).
- Optional walkthrough
  - A short Loom/video walkthrough can accompany the submission to demonstrate interactions (selection, drag, scale, rotate, layer reordering, per‑video controls, panning) and performance seeding via the Debug panel.

#### Keyboard shortcuts
- Space: Hold to pan the canvas
- Delete / Backspace: Delete the currently selected layer (ignored while typing in inputs)

#### Getting started
1) Install dependencies
```
npm install
```
2) Start the dev server
```
npm run dev
```
3) Open the printed local URL (typically http://localhost:5173)

#### Adding content
- Use the Toolbar buttons “Add image via URL” or “Add video via URL” and paste a direct URL.
- Local assets: place files in `public/` and reference by absolute path (e.g., `/logo.png`, `/video/v-01.mp4`).

#### Project structure (high‑level)
- `src/components/WhiteboardCanvas.tsx` — mounts Pixi `Application`, handles panning and hosts UI chrome
- `src/components/ImagesLayer.tsx` — manages image sprites (placeholder → texture)
- `src/components/VideosLayer.tsx` — manages video sprites (placeholder → video texture) + per‑video controls
- `src/components/LayersSidebar.tsx` — Photoshop‑style layers list (select/delete)
- `src/components/PropertiesPanel.tsx` — editable X/Y/W/H/Rotation for the selected element
- `src/components/Toolbar.tsx` — top‑left controls (global video controls, add by URL, debug)
- `src/components/DebugPanel.tsx` — seeders and stats; URLs in `src/debug/debugConfig.ts`
- `src/store/canvasStore.ts` — Zustand store: objects, selection, viewport (panning), video playback
- `public/` — static assets served at root


#### Shortcomings / next steps
- No persistence (refresh clears state)
- No z‑order UI yet (store has bringToFront/sendToBack if needed)
- No zoom (only pan); zoom can extend the viewport model later