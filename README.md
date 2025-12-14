### Aby White‑Board (React + PixiJS)

A small test project for Aby showcasing a canvas/WebGL whiteboard built with PixiJS and React. It demonstrates adding images and videos by URL, selecting and moving elements, basic property editing, and canvas panning.

### Deployed URL:
https://aby-board-odcr5.ondigitalocean.app/

#### Tech stack
- Build: Vite (vite@^7) + TypeScript (TS 5.9)
- UI: React 19
- State: Zustand 5
- Rendering: PixiJS v8 (core `pixi.js`)

#### Features
- PixiJS canvas bootstrap with StrictMode‑safe lifecycle
- Add by URL:
  - Images: appear instantly (placeholder), swap to real texture when loaded
  - Videos: appear instantly (placeholder), swap to video when ready; start paused
- Selection and transform
  - Click layer or canvas to select; blue outline mirrors rotation
  - Drag to move images, videos, and rectangles
  - Bottom Properties panel: edit Position (X/Y), Size (W/H), Rotation (°)
- Layers sidebar (right)
  - Lists all elements (topmost first), select layer, delete via × button
- Video controls
  - Global: Play all / Pause all
  - Per‑video: Play/Pause controls rendered under each video
- Panning like image editors
  - Hold Space to pan (grab/grabbing cursor); release to exit
- Debug panel (Toolbar → Debug)
  - Seed 10 images or 10 videos at random positions (~1.5× viewport area)
  - Live stats: Total elements, Total visible, Total culled
  - URLs configurable in `src/debug/debugConfig.ts`

#### Constraints and environment notes
- WebGL + CORS for media
  - Images and videos are sampled by WebGL as GPU textures. Cross‑origin URLs must send `Access-Control-Allow-Origin` (e.g., `*` or your origin) or the browser will block usage as a texture.
  - The app creates `HTMLImageElement`/`HTMLVideoElement` with `crossOrigin = 'anonymous'` where applicable.
  - For development, prefer same‑origin assets (place in `public/` and reference `/path.ext`). The Debug video URLs are environment‑aware and use `http://localhost:5173` locally to avoid CORS.
- Browser autoplay policy
  - Videos start paused by design. Browsers often require a user gesture to play audio; keeping `muted = true` allows autoplay if desired. Per‑video controls let you play/pause explicitly.
- Performance scope
  - The whiteboard uses Pixi’s retained scene graph (no full‑canvas React re‑painting). Sprites and textures are updated in place.
  - Placeholders are shown immediately while media loads, swapping to real textures once ready. Async creation is coalesced to avoid duplicate work.
  - Resource cleanup is performed on removal/unmount (sprites destroyed, videos paused, pending loads cleared).
- Project conventions
  - Avoid inline styles for UI; use classes in `src/App.css`.
  - Extract math/geometry into helpers and document them in JSDoc (see `src/components/helpers/transformMath.ts`, `src/components/helpers/layerHelpers.ts`).

#### WebGL usage
- Rendering is handled by PixiJS v8 (WebGL renderer). Both images and videos are uploaded as GPU textures:
  - Images: `Texture.from(imageElement)` after loading; placeholder `Texture.WHITE` visible immediately.
  - Videos: `Texture.from(videoElement)`, updating frame‑by‑frame on the GPU.
- Image blend modes are supported and can be changed from the Properties panel (e.g., Normal, Multiply, Screen, Overlay...).

#### Performance considerations and testing at scale
- Efficient loop: Pixi performs batched draws; we avoid unnecessary display object churn. A single shared scene container with `sortableChildren = true` ensures coherent z‑order across types.
- No full redraws: We mutate sprite transforms/texture pointers instead of redrawing via Canvas2D each frame.
- Culling: The Debug panel shows a simple AABB vs. screen visibility count (informational). Rendering is still delegated to Pixi, which is efficient at this content scale.
- Cleanup: On removal/unmount, sprites and outlines are destroyed and videos are paused.
- How to test:
  1. Open the Debug panel (wrench icon in the toolbar).
  2. Click “Add 10 images” and “Add 10 videos” (or repeat). Elements spawn across ~1.5× the viewport.
  3. Pan (hold Space) and interact — verify smooth dragging, scaling, rotation, and simultaneous video playback.
  4. Watch Total/Visible/Culled stats update as you pan.

#### Submission notes
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

#### PixiJS notes
- Uses core `pixi.js` v8 to render sprites on a single `Application` canvas
- Selection outlines are Pixi `Graphics` positioned/rotated to match sprites
- Media loading is async‑safe (visible immediately via placeholders, then swap)

#### Mapping to requirements (summary)
- Workspace with HTML Canvas/WebGL using PixiJS — done (`WhiteboardCanvas.tsx`).
- Asset manipulation (images/videos) with selection and transforms (move/scale/rotate) — done via layers and properties.
- WebGL usage (GPU textures for images/videos) — done.
- Performance at scale — retained scene graph, debug seeding, simple culling stats, cleanup — demonstrated.
- Simple UI layer (React + TS) with Add Image/Video, optional sidebar — implemented.
- Code quality & README — typed store, helpers with JSDoc, clear structure, this README.

#### Shortcomings / next steps
- No persistence (refresh clears state)
- No z‑order UI yet (store has bringToFront/sendToBack if needed)
- No zoom (only pan); zoom can extend the viewport model later

#### License
MIT — for test/demo purposes. © Aby.