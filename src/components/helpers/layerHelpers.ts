import { Graphics, Sprite, Texture, Container } from 'pixi.js';
import { useCanvasStore } from '../../store/canvasStore';

export type DragState = { id: string; dx: number; dy: number } | null;

export type BasicObject = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
};

export function createPlaceholderSprite(obj: BasicObject): Sprite {
  const s = new Sprite(Texture.WHITE);
  updateSpriteTransform(s, obj);
  s.alpha = 1;
  s.visible = true;
  (s as any).renderable = true;
  (s as any).tint = 0xdddddd;
  return s;
}

export function updateSpriteTransform(sprite: Sprite, obj: BasicObject) {
  sprite.x = obj.x;
  sprite.y = obj.y;
  sprite.rotation = obj.rotation ?? 0;
  sprite.width = obj.width;
  sprite.height = obj.height;
}

export function setupSpriteInteractivity(sprite: Sprite, objectId: string, setDrag: (v: DragState) => void) {
  (sprite as any).eventMode = 'static';
  (sprite as any).cursor = 'pointer';
  sprite.on('pointerdown', (e: any) => {
    const st = useCanvasStore.getState();
    if (st.panningMode) return; // disable item drag when panning
    const pos = e.global;
    const local = { x: pos.x - st.viewport.x, y: pos.y - st.viewport.y };
    st.selectObject(objectId);
    setDrag({ id: objectId, dx: local.x - sprite.x, dy: local.y - sprite.y });
    (sprite as any).cursor = 'grabbing';
  });
  const reset = () => {
    setDrag(null);
    (sprite as any).cursor = 'pointer';
  };
  sprite.on('pointerup', reset);
  sprite.on('pointerupoutside', reset);
}

export function updateSelectionOutline(
  container: Container,
  outline: Graphics | undefined,
  obj: BasicObject,
  selectedId: string | null
): Graphics | undefined {
  const shouldShow = selectedId === obj.id;
  if (shouldShow) {
    let g = outline;
    if (!g) {
      g = new Graphics();
      // bring above sprites if sortableChildren enabled
      (g as any).zIndex = 9999;
      container.addChild(g);
    }
    g.clear();
    g.position.set(obj.x, obj.y);
    g.rotation = obj.rotation ?? 0;
    g.rect(-2, -2, obj.width + 4, obj.height + 4).stroke({ color: 0x3b82f6, width: 2 });
    return g;
  } else if (outline) {
    if (outline.parent === container) container.removeChild(outline);
    outline.destroy();
    return undefined;
  }
  return outline;
}
