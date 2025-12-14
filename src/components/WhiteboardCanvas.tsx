import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
import { canvasStore, useCanvasStore } from '../store/canvasStore';
import { UrlModal } from './UrlModal';
import { Toolbar } from './Toolbar';
import { ImagesLayer } from './ImagesLayer';
import { VideosLayer } from './VideosLayer';
import { LayersSidebar } from './LayersSidebar';
import { DebugPanel } from './DebugPanel';
import { PropertiesPanel } from './PropertiesPanel';

export function WhiteboardCanvas() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [urlOpen, setUrlOpen] = useState(false);
  const [imgUrlOpen, setImgUrlOpen] = useState(false);
  const [vidUrlOpen, setVidUrlOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [imagesContainer, setImagesContainer] = useState<Container | null>(null);
  const [videosContainer, setVideosContainer] = useState<Container | null>(null);
  const dragRef = useRef<null | { id: string; dx: number; dy: number }>(null);
  const viewport = useCanvasStore((s) => s.viewport);
  const setViewport = useCanvasStore((s) => s.setViewport);
  const panningMode = useCanvasStore((s) => s.panningMode);
  const setPanningMode = useCanvasStore((s) => s.setPanningMode);
  const [panningActive, setPanningActive] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const app = new Application();
    let destroyed = false;
    let appended = false;
    let initPromise: Promise<void> | null = null;
    let canvasEl: HTMLCanvasElement | null = null;
    let scene: Container | null = null;
    let unsubscribe: (() => void) | null = null;

    initPromise = (async () => {
      try {
        await app.init({
          resizeTo: window,
          background: '#ffffff',
          antialias: true,
        });
        if (destroyed) return;
        canvasEl = app.canvas;
        if (canvasEl) {
          mountRef.current?.appendChild(canvasEl);
          appended = true;
        }

        // single parent container for all display objects so global z-order works across types
        scene = new Container();
        (scene as any).sortableChildren = true;
        app.stage.addChild(scene);
        
        // apply initial viewport offset
        scene.position.set(viewport.x, viewport.y);
        // use the same scene container for images and videos layers
        setImagesContainer(scene);
        setVideosContainer(scene);

        const render = (
          objects: ReturnType<typeof canvasStore.getState>['objects'],
          selectedId: string | null = null
        ) => {
          if (!scene) return;
          // Clear only previous rectangle graphics from the shared scene
          const toRemove: any[] = [];
          for (const child of scene.children) {
            if ((child as any).__isRect) toRemove.push(child);
          }
          for (const child of toRemove) {
            if (child.parent === scene) scene.removeChild(child);
            child.destroy?.({ children: true });
          }

          for (const obj of objects) {
            if (obj.type === 'rect') {
              const g = new Graphics();
              const fill = (obj as any).fill ?? 0x2ecc71;
              const alpha = (obj as any).alpha ?? 1;
              g.rect(obj.x, obj.y, obj.width, obj.height).fill(fill, alpha);
              const stroke = (obj as any).stroke;
              if (stroke) {
                const sc = stroke.color ?? 0x000000;
                const sw = stroke.width ?? 1;
                const sa = stroke.alpha ?? 1;
                g.stroke({ color: sc, width: sw, alpha: sa });
              }
              // selection outline
              if (selectedId === obj.id) {
                g.rect(obj.x - 2, obj.y - 2, obj.width + 4, obj.height + 4).stroke({ color: 0x3b82f6, width: 2, alpha: 1 });
              }
              if ((obj as any).rotation) {
                g.rotation = (obj as any).rotation;
              }
              // mark and assign global z-index according to store order
              (g as any).__isRect = true;
              const globalIndex = canvasStore.getState().objects.findIndex((oo) => oo.id === obj.id);
              (g as any).zIndex = Number.isFinite(globalIndex) ? globalIndex : 0;
              // interactivity for selection/drag
              g.eventMode = 'static' as any;
              g.cursor = 'pointer';
              g.on('pointerdown', (e: any) => {
                if (useCanvasStore.getState().panningMode) return; // don't start object drag while panning
                const pos = e.global;
                // convert to scene-local by removing viewport offset
                const local = { x: pos.x - useCanvasStore.getState().viewport.x, y: pos.y - useCanvasStore.getState().viewport.y };
                useCanvasStore.getState().selectObject(obj.id);
                dragRef.current = { id: obj.id, dx: local.x - obj.x, dy: local.y - obj.y };
                (g as any).cursor = 'grabbing';
              });
              g.on('pointerup', () => {
                dragRef.current = null;
                (g as any).cursor = 'pointer';
              });
              g.on('pointerupoutside', () => {
                dragRef.current = null;
                (g as any).cursor = 'pointer';
              });
              scene.addChild(g);
            }
          }
        };

        render(canvasStore.getState().objects, useCanvasStore.getState().selectedId);
        unsubscribe = useCanvasStore.subscribe((state, prev) => {
          if (state.objects !== prev.objects || state.selectedId !== prev.selectedId) {
            render(state.objects, state.selectedId);
          }
          if ((state.viewport.x !== prev.viewport?.x) || (state.viewport.y !== prev.viewport?.y)) {
            if (scene) scene.position.set(state.viewport.x, state.viewport.y);
          }
        });

        // removed auto-seeding of a demo rectangle
      } catch(error) {
        console.error("failed", error);
      }
    })();

    return () => {
      destroyed = true;
      const finalize = () => {
        try {

          if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
          }

          if (scene) {
            scene.destroy({ children: true });
            scene = null;
          }
          if (canvasEl && mountRef.current && appended && canvasEl.parentElement === mountRef.current) {
            mountRef.current.removeChild(canvasEl);
          }
          appended = false;
          canvasEl = null;

          app.destroy(true);
        } catch (error){
          console.error("failed to destroy", error)
        }
      };

      if (initPromise) {
        initPromise.finally(finalize);
      } else {
        finalize();
      }
    };
  }, []);

  // drag listeners
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      // handle panning when active
      if (panningActive && panStartRef.current) {
        const { x, y, vx, vy } = panStartRef.current;
        const dx = e.clientX - x;
        const dy = e.clientY - y;
        setViewport({ x: vx + dx, y: vy + dy });
        return;
      }
      const drag = dragRef.current;
      if (!drag) return;
      const { id, dx, dy } = drag;
      // convert to world coords considering viewport offset
      const pos = { x: e.clientX - viewport.x, y: e.clientY - viewport.y };
      useCanvasStore.getState().updateObject(id, { x: pos.x - dx, y: pos.y - dy } as any);
    };
    const onUp = () => {
      if (dragRef.current) dragRef.current = null;
      if (panningActive) setPanningActive(false);
      panStartRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp as any);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp as any);
    };
  }, [viewport.x, viewport.y, panningActive, setViewport]);

  // activate pan with spacebar
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (!panningMode) setPanningMode(true);
        e.preventDefault();
      }
      // handle delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement | null;
        const isEditing = !!target && (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          (target as any).isContentEditable
        );
        if (isEditing) return; // don't delete while typing in inputs

        const { selectedId, removeObject } = useCanvasStore.getState() as any;
        if (selectedId) {
          removeObject(selectedId);
          e.preventDefault(); // prevent browser navigation on Backspace
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (panningMode) setPanningMode(false);
        // end active pan if any
        if (panningActive) setPanningActive(false);
        panStartRef.current = null;
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown, { passive: false } as any);
    window.addEventListener('keyup', onKeyUp, { passive: false } as any);
    return () => {
      window.removeEventListener('keydown', onKeyDown as any);
      window.removeEventListener('keyup', onKeyUp as any);
    };
  }, [panningMode, panningActive]);

  return (
    <div
      ref={mountRef}
      className={`wb-root${panningMode ? ' wb-panning' : ''}${panningActive ? ' wb-panning-active' : ''}`}
      onPointerDown={(e) => {
        if (panningMode) {
          const t = e.target as HTMLElement;
          // ignore clicks on UI overlays/controls
          if (t && (t.closest('.wb-controls') || t.closest('.wb-video-float') || t.closest('.modal') || t.closest('.modal-backdrop') || t.closest('.wb-sidebar') || t.closest('.wb-props') || t.closest('.wb-debug-panel'))) {
            return;
          }
          setPanningActive(true);
          panStartRef.current = { x: e.clientX, y: e.clientY, vx: viewport.x, vy: viewport.y };
        }
      }}
    >

      <ImagesLayer container={imagesContainer} />
      <VideosLayer container={videosContainer} />

      <Toolbar
        onPlayAll={() => canvasStore.getState().playAllVideos()}
        onPauseAll={() => canvasStore.getState().pauseAllVideos()}
        onAddImage={() => setImgUrlOpen(true)}
        onAddVideo={() => setVidUrlOpen(true)}
        onAddElement={() => setUrlOpen(true)}
        onToggleDebug={() => setDebugOpen((v) => !v)}
      />

      <LayersSidebar />

      <PropertiesPanel />

      <DebugPanel open={debugOpen} onClose={() => setDebugOpen(false)} />

      <UrlModal
        open={imgUrlOpen}
        title="Add Image"
        placeholder="https://example.com/image.png"
        submitLabel="Add Image"
        onClose={() => setImgUrlOpen(false)}
        onSubmit={(url) => {
          canvasStore.getState().addObject({
            type: 'image',
            src: url,
            x: 100,
            y: 100,
            width: 300,
            height: 200,
          } as any);
          setImgUrlOpen(false);
        }}
      />

      {/* Video URL modal */}
      <UrlModal
        open={vidUrlOpen}
        title="Add Video"
        placeholder="https://example.com/video.mp4"
        submitLabel="Add Video"
        onClose={() => setVidUrlOpen(false)}
        onSubmit={(url) => {
          canvasStore.getState().addObject({
            type: 'video',
            src: url,
            x: 150,
            y: 150,
            width: 320,
            height: 180,
            muted: true,
            loop: true,
            autoplay: false,
            playing: false,
          } as any);
          setVidUrlOpen(false);
        }}
      />

      <UrlModal
        open={urlOpen}
        onClose={() => setUrlOpen(false)}
        onSubmit={(url) => {
          console.log('worked:', url);
          setUrlOpen(false);
        }}
      />
    </div>
  );
}

export default WhiteboardCanvas;
