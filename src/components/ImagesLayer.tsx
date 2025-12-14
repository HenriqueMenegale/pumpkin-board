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

  useEffect(() => {
    if (!container) return;

    const sprites = spritesRef.current;
    let alive = true;

    const loadTextureFromUrl = (url: string): Promise<Texture> => {
      return new Promise((resolve, reject) => {
        try {
          const img = new Image();
          // I need to check how safe this is, but necessary for loading externally in this prototype
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
          try {
            const tex = await loadTextureFromUrl((obj as any).src);
            if (!tex) {
              console.error('Failed to create texture from URL', (obj as any).src);
              continue;
            }
            if (!alive || !container || (container as any).destroyed) return;
            const s = new Sprite(tex);
            s.x = obj.x;
            s.y = obj.y;
            s.rotation = obj.rotation ?? 0;
            s.width = obj.width;
            s.height = obj.height;
            // interactivity
            (s as any).eventMode = 'static';
            (s as any).cursor = 'pointer';
            s.on('pointerdown', (e: any) => {
              const pos = e.global;
              useCanvasStore.getState().selectObject(obj.id);
              dragRef.current = { id: obj.id, dx: pos.x - s.x, dy: pos.y - s.y };
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
            entry = { sprite: s };
            sprites.set(obj.id, entry);
          } catch (e) {
            console.error('Failed to load image texture', (obj as any).src, e);
            continue;
          }
        } else {
          entry.sprite.x = obj.x;
          entry.sprite.y = obj.y;
          entry.sprite.rotation = obj.rotation ?? 0;
          entry.sprite.width = obj.width;
          entry.sprite.height = obj.height;
        }

        // selection outline
        const shouldShow = selectedId === obj.id;
        if (shouldShow) {
          let outline = entry.outline;
          if (!outline) {
            outline = new Graphics();
            outline.zIndex = 9999 as any;
            container.addChild(outline);
            entry.outline = outline;
          }
          outline.clear();
          outline.rect(obj.x - 2, obj.y - 2, obj.width + 4, obj.height + 4).stroke({ color: 0x3b82f6, width: 2 });
        } else if (entry.outline) {
          if (entry.outline.parent === container) container.removeChild(entry.outline);
          entry.outline.destroy();
          delete entry.outline;
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
    };
  }, [container]);

  // handle drag
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const { id, dx, dy } = drag;
      const pos = { x: e.clientX, y: e.clientY };
      useCanvasStore.getState().updateObject(id, (prev: any) => ({ x: pos.x - dx, y: pos.y - dy }));
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
