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

#### Shortcomings / next steps
- No persistence (refresh clears state)
- No z‑order UI yet (store has bringToFront/sendToBack if needed)
- No zoom (only pan); zoom can extend the viewport model later

#### License
MIT — for test/demo purposes. © Aby.