import { useEffect, useRef } from 'react';
import { Container, Sprite, Texture } from 'pixi.js';
import { useCanvasStore } from '../store/canvasStore';

interface Props {
  container: Container | null;
}

export function ImagesLayer({ container }: Props) {
  const spritesRef = useRef<Map<string, Sprite>>(new Map());
  const unsubscribeRef = useRef<null | (() => void)>(null);

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
      const images = useCanvasStore
        .getState()
        .objects.filter((o) => o.type === 'image') as ReturnType<typeof useCanvasStore.getState>['objects'];
      const nextIds = new Set(images.map((o) => o.id));

      //cleanup routine
      for (const [id, spr] of sprites) {
        if (!nextIds.has(id)) {
          sprites.delete(id);
          if (spr.parent === container) container.removeChild(spr);
          spr.destroy();
        }
      }

      for (const obj of images) {
        let spr = sprites.get(obj.id);
        if (!spr) {
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
            container.addChild(s);
            sprites.set(obj.id, s);
            spr = s;
          } catch (e) {
            console.error('Failed to load image texture', (obj as any).src, e);
            continue;
          }
        } else {
          spr.x = obj.x;
          spr.y = obj.y;
          spr.rotation = obj.rotation ?? 0;
          spr.width = obj.width;
          spr.height = obj.height;
        }
      }
    };

    apply();

    const unsub = useCanvasStore.subscribe((state, prev) => {
      if (state.objects !== prev.objects) apply();
    });
    unsubscribeRef.current = unsub;

    return () => {
      alive = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      for (const [, spr] of sprites) {
        if (spr.parent === container) container.removeChild(spr);
        spr.destroy();
      }
      sprites.clear();
    };
  }, [container]);

  return null;
}

export default ImagesLayer;
