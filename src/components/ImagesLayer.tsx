import { useEffect, useRef } from 'react';
import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { useCanvasStore } from '../store/canvasStore';
import {
  createPlaceholderSprite,
  updateSpriteTransform,
  setupSpriteInteractivity,
  updateSelectionOutline,
} from './helpers/layerHelpers';
import { useGlobalDrag } from '../hooks/useGlobalDrag';

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
          const s = createPlaceholderSprite({
            id: obj.id,
            // Use latest values to avoid snapping back to stale position
            x: (useCanvasStore.getState().objects.find((o) => o.id === obj.id) as any)?.x ?? obj.x,
            y: (useCanvasStore.getState().objects.find((o) => o.id === obj.id) as any)?.y ?? obj.y,
            width: (useCanvasStore.getState().objects.find((o) => o.id === obj.id) as any)?.width ?? obj.width,
            height: (useCanvasStore.getState().objects.find((o) => o.id === obj.id) as any)?.height ?? obj.height,
            rotation: (useCanvasStore.getState().objects.find((o) => o.id === obj.id) as any)?.rotation ?? obj.rotation ?? 0,
          } as any);
          // interactivity
          setupSpriteInteractivity(s, obj.id, (v) => (dragRef.current = v));
          // z-order within this container follows the global objects array index
          const globalIndex = state.objects.findIndex((oo) => oo.id === obj.id);
          (s as any).zIndex = Number.isFinite(globalIndex) ? globalIndex : 0;
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
                // clear placeholder
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
          updateSpriteTransform(entry.sprite, obj as any);
          const globalIndex = state.objects.findIndex((oo) => oo.id === (obj as any).id);
          (entry.sprite as any).zIndex = Number.isFinite(globalIndex) ? globalIndex : 0;
          entry.sprite.alpha = 1;
          entry.sprite.visible = true;
        }

        // selection outline
        const ent = sprites.get(obj.id);
        if (ent) {
          ent.outline = updateSelectionOutline(container, ent.outline, obj as any, selectedId);
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

  // shared drag wiring
  useGlobalDrag(dragRef);

  return null;
}

export default ImagesLayer;
