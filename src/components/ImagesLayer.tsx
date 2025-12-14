import { useEffect, useRef } from 'react';
import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { useCanvasStore } from '../store/canvasStore';

interface Props {
  container: Container | null;
}

export function ImagesLayer({ container }: Props) {
  const spritesRef = useRef<Map<string, { sprite: Sprite; outline?: Graphics }>>(new Map());
  const unsubscribeRef = useRef<null | (() => void)>(null);
  const dragRef = useRef<null | { id: string; dx: number; dy: number }>(null);
  // track pending texture loads to avoid duplicate sprite creation and stale resets
  const pendingRef = useRef<Map<string, Promise<void>>>(new Map());

  useEffect(() => {
    if (!container) return;

    // ensure predictable draw order if any zIndex is used later
    (container as any).sortableChildren = true;

    const sprites = spritesRef.current;
    let alive = true;

    const loadTextureFromUrl = (url: string): Promise<Texture> => {
      return new Promise((resolve, reject) => {
        try {
          const img = new Image();
          // to aby team: I need to check how safe this is, but necessary for loading externally in this prototype. Some validation is definitely necessary for a production version
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const tex = Texture.from(img);
              resolve(tex);
            } catch (err) {
              reject(err);
            }
          };
          img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
          img.src = url;
        } catch (e) {
          reject(e);
        }
      });
    };

    const apply = async () => {
      const state = useCanvasStore.getState();
      const images = state.objects.filter((o) => o.type === 'image') as ReturnType<typeof useCanvasStore.getState>['objects'];
      const selectedId = state.selectedId;
      const nextIds = new Set(images.map((o) => o.id));

      //cleanup routine
      for (const [id, entry] of sprites) {
        if (!nextIds.has(id)) {
          sprites.delete(id);
          if (entry.outline && entry.outline.parent === container) container.removeChild(entry.outline);
          entry.outline?.destroy();
          if (entry.sprite.parent === container) container.removeChild(entry.sprite);
          entry.sprite.destroy();
        }
      }

      for (const obj of images) {
        let entry = sprites.get(obj.id);
        if (!entry) {
          // Create a placeholder sprite immediately so something is visible right away
          const s = new Sprite(Texture.WHITE);
          // Use the latest object values to avoid snapping back to stale position
          const latest = useCanvasStore.getState().objects.find((o) => o.id === obj.id) as any;
          const lx = latest?.x ?? obj.x;
          const ly = latest?.y ?? obj.y;
          const lw = latest?.width ?? obj.width;
          const lh = latest?.height ?? obj.height;
          const lr = latest?.rotation ?? obj.rotation ?? 0;

          s.x = lx;
          s.y = ly;
          s.rotation = lr;
          s.width = lw;
          s.height = lh;
          s.alpha = 1;
          s.visible = true;
          (s as any).renderable = true;
          // light placeholder tint
          (s as any).tint = 0xdddddd;

          // interactivity
          (s as any).eventMode = 'static';
          (s as any).cursor = 'pointer';
          s.on('pointerdown', (e: any) => {
            const st = useCanvasStore.getState();
            if (st.panningMode) return; // disable item drag when panning
            const pos = e.global;
            const local = { x: pos.x - st.viewport.x, y: pos.y - st.viewport.y };
            st.selectObject(obj.id);
            dragRef.current = { id: obj.id, dx: local.x - s.x, dy: local.y - s.y };
            (s as any).cursor = 'grabbing';
          });
          s.on('pointerup', () => {
            dragRef.current = null;
            (s as any).cursor = 'pointer';
          });
          s.on('pointerupoutside', () => {
            dragRef.current = null;
            (s as any).cursor = 'pointer';
          });
          container.addChild(s);
          sprites.set(obj.id, { sprite: s });

          // Kick off async load if not already pending, then swap the texture
          if (!pendingRef.current.has(obj.id)) {
            const p = (async () => {
              try {
                const tex = await loadTextureFromUrl((obj as any).src);
                if (!tex) {
                  console.error('Failed to create texture from URL', (obj as any).src);
                  return;
                }
                if (!alive || !container || (container as any).destroyed) return;
                const ent = sprites.get(obj.id);
                if (!ent) return;
                ent.sprite.texture = tex;
                // clear placeholder tint
                (ent.sprite as any).tint = 0xFFFFFF;
              } catch (e) {
                console.error('Failed to load image texture', (obj as any).src, e);
              } finally {
                pendingRef.current.delete(obj.id);
              }
            })();
            pendingRef.current.set(obj.id, p);
          }
        } else {
          entry.sprite.x = obj.x;
          entry.sprite.y = obj.y;
          entry.sprite.rotation = obj.rotation ?? 0;
          entry.sprite.width = obj.width;
          entry.sprite.height = obj.height;
          entry.sprite.alpha = 1;
          entry.sprite.visible = true;
        }

        // selection outline
        const shouldShow = selectedId === obj.id;
        // Always re-fetch current entry to avoid stale references when created asynchronously
        const ent = sprites.get(obj.id);
        if (shouldShow && ent) {
          let outline = ent.outline;
          if (!outline) {
            outline = new Graphics();
            outline.zIndex = 9999 as any;
            container.addChild(outline);
            ent.outline = outline;
          }
          outline.clear();
          // Position/rotate the outline graphic like the sprite, then draw at local 0,0
          outline.position.set(obj.x, obj.y);
          outline.rotation = obj.rotation ?? 0;
          outline
            .rect(-2, -2, obj.width + 4, obj.height + 4)
            .stroke({ color: 0x3b82f6, width: 2 });
        } else if (ent?.outline) {
          if (ent.outline.parent === container) container.removeChild(ent.outline);
          ent.outline.destroy();
          delete ent.outline;
        }
      }
    };

    apply();

    const unsub = useCanvasStore.subscribe((state, prev) => {
      if (state.objects !== prev.objects || state.selectedId !== prev.selectedId) apply();
    });
    unsubscribeRef.current = unsub;

    return () => {
      alive = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      for (const [, entry] of sprites) {
        if (entry.outline && entry.outline.parent === container) container.removeChild(entry.outline);
        entry.outline?.destroy();
        if (entry.sprite.parent === container) container.removeChild(entry.sprite);
        entry.sprite.destroy();
      }
      sprites.clear();
      pendingRef.current.clear();
    };
  }, [container]);

  // handle drag
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const { id, dx, dy } = drag;
      const { viewport } = useCanvasStore.getState();
      const pos = { x: e.clientX - viewport.x, y: e.clientY - viewport.y };
      useCanvasStore.getState().updateObject(id, { x: pos.x - dx, y: pos.y - dy } as any);
    };
    const onUp = () => {
      if (dragRef.current) dragRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp as any);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp as any);
    };
  }, []);

  return null;
}

export default ImagesLayer;
