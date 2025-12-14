import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
import { canvasStore, useCanvasStore } from '../store/canvasStore';
import { UrlModal } from './UrlModal';

export function WhiteboardCanvas() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [urlOpen, setUrlOpen] = useState(false);

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

        //main container for items
        scene = new Container();
        app.stage.addChild(scene);

        const render = (objects: ReturnType<typeof canvasStore.getState>['objects']) => {
          if (!scene) return;
          while (scene.children.length) {
            const child = scene.removeChildAt(0);
            child.destroy?.({ children: true });
          }

          for (const obj of objects) {
            if (obj.type === 'rect') {
              const g = new Graphics();
              const fill = obj.fill ?? 0x2ecc71;
              const alpha = obj.alpha ?? 1;
              g.rect(obj.x, obj.y, obj.width, obj.height).fill(fill, alpha);
              if (obj.stroke) {
                const sc = obj.stroke.color ?? 0x000000;
                const sw = obj.stroke.width ?? 1;
                const sa = obj.stroke.alpha ?? 1;
                g.stroke({ color: sc, width: sw, alpha: sa });
              }
              if (obj.rotation) {
                g.rotation = obj.rotation;
              }
              scene.addChild(g);
            }

          }
        };

        render(canvasStore.getState().objects);
        unsubscribe = useCanvasStore.subscribe((state, prev) => {
          if (state.objects !== prev.objects) {
            render(state.objects);
          }
        });

        const st = canvasStore.getState();
        if (st.objects.length === 0) {
          st.addObject({
            type: 'rect',
            x: 120,
            y: 120,
            width: 240,
            height: 140,
            fill: 0x2ecc71,
          } as any);
        }
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

  return (
    <div ref={mountRef} className="wb-root">
      {/* Overlay controls */}
      <div className="wb-controls">
        <button
          onClick={() => {
            canvasStore.getState().addObject({
              type: 'rect',
              x: Math.random() * 250,
              y: Math.random() * 250,
              width: 240,
              height: 140,
              fill: 0x2ecc71,
            } as any);
          }}
          className="btn btn-green"
        >
          Add green rectangle
        </button>
        <button
          onClick={() => setUrlOpen(true)}
          className="btn btn-blue"
        >
          Add Element
        </button>
      </div>

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
