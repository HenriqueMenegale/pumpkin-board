import { Graphics, Sprite, Texture, Container } from 'pixi.js';
import { useCanvasStore } from '../../store/canvasStore';

/**
 * Represents the current drag interaction state for moving an object.
 * When non-null, the element with `id` is being dragged and the
 * pointer-to-object offset is stored in `dx/dy` (in world coordinates).
 *
 * @typedef DragState
 * @property {string} id - The id of the object being dragged.
 * @property {number} dx - Offset from pointer X to object X captured at pointerdown.
 * @property {number} dy - Offset from pointer Y to object Y captured at pointerdown.
 */
export type DragState = { id: string; dx: number; dy: number } | null;

/**
 * Minimal shape required by layer helpers to position and transform a sprite.
 *
 * @typedef BasicObject
 * @property {string} id - Unique identifier of the object.
 * @property {number} x - Top-left X in world space (pixels).
 * @property {number} y - Top-left Y in world space (pixels).
 * @property {number} width - Width in pixels.
 * @property {number} height - Height in pixels.
 * @property {number} [rotation] - Rotation in radians around top-left (default 0).
 */
export type BasicObject = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
};

/**
 * Create a visible placeholder sprite using a white texture tinted light gray.
 * This is used so items appear immediately while async media loads.
 *
 * @param {BasicObject} obj - Object whose transform should be applied to the sprite.
 * @returns {Sprite} A Pixi Sprite already positioned, sized, and visible.
 */
export function createPlaceholderSprite(obj: BasicObject): Sprite {
  const s = new Sprite(Texture.WHITE);
  updateSpriteTransform(s, obj);
  s.alpha = 1;
  s.visible = true;
  (s as any).renderable = true;
  (s as any).tint = 0xdddddd;
  return s;
}

/**
 * Apply position, rotation and size from an object onto a Pixi sprite.
 *
 * @param {Sprite} sprite - Target sprite to mutate.
 * @param {BasicObject} obj - Source of transform values.
 * @returns {void}
 */
export function updateSpriteTransform(sprite: Sprite, obj: BasicObject) {
  sprite.x = obj.x;
  sprite.y = obj.y;
  sprite.rotation = obj.rotation ?? 0;
  sprite.width = obj.width;
  sprite.height = obj.height;
}

/**
 * Wire pointer events on a sprite to support selection and drag-to-move.
 * Honors panning mode (disabled while space-panning). Offsets account for viewport.
 *
 * @param {Sprite} sprite - The interactive sprite.
 * @param {string} objectId - The id to select/drag for this sprite.
 * @param {(v: DragState) => void} setDrag - Callback to set/clear the drag state.
 * @returns {void}
 */
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

/**
 * Create/update a selection outline Graphics node for an object, or destroy it if not selected.
 * The outline is positioned/rotated to match the object's transform and drawn in local space.
 *
 * @param {Container} container - Parent container where the outline should reside.
 * @param {Graphics | undefined} outline - Existing outline Graphics (if any).
 * @param {BasicObject} obj - The object whose selection outline is being managed.
 * @param {string | null} selectedId - Currently selected object id.
 * @returns {Graphics | undefined} The active outline instance when selected; otherwise undefined.
 */
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

// ===== Selection frame with transform handles (scale + rotate) =====
/**
 * Minimal discriminated union describing the start of a transform interaction
 * (scale or rotate) for an object id. The full state is carried by the
 * `useGlobalTransform` hook; this type is kept for local intent.
 */
export type TransformStart = { mode: 'scale' | 'rotate'; id: string } | null;

/**
 * Ensure a selection frame exists and draw transform handles inside it.
 * The frame is positioned/rotated like the object, and the handles are drawn
 * in the frame's local space so they follow rotation. Four corner scale handles
 * (nw, ne, sw, se) and one rotate handle (above top edge) are created.
 *
 * On pointerdown of a handle, the provided callbacks are invoked with the
 * world-space pointer position corrected by the viewport offset.
 *
 * @param {Container} container - Parent container to host the frame graphics.
 * @param {Graphics | undefined} outline - Existing frame instance (if any).
 * @param {BasicObject} obj - Object whose selection/handles are shown.
 * @param {string | null} selectedId - Current selected object id.
 * @param {(info: { id: string; startX: number; startY: number; handle: 'nw' | 'ne' | 'sw' | 'se' }) => void} onScaleDown - Callback when a scale handle is pressed.
 * @param {(info: { id: string; startX: number; startY: number }) => void} onRotateDown - Callback when the rotate handle is pressed.
 * @returns {Graphics | undefined} The frame graphics when selected; otherwise undefined.
 */
export function ensureSelectionFrameWithHandles(
  container: Container,
  outline: Graphics | undefined,
  obj: BasicObject,
  selectedId: string | null,
  onScaleDown: (info: { id: string; startX: number; startY: number; handle: 'nw' | 'ne' | 'sw' | 'se' }) => void,
  onRotateDown: (info: { id: string; startX: number; startY: number }) => void,
): Graphics | undefined {
  const shouldShow = selectedId === obj.id;
  if (!shouldShow) {
    if (outline) {
      if (outline.parent === container) container.removeChild(outline);
      outline.destroy();
    }
    return undefined;
  }

  let frame = outline;
  if (!frame) {
    frame = new Graphics();
    (frame as any).zIndex = 9999;
    container.addChild(frame);
  }

  // Draw frame
  frame.clear();
  frame.position.set(obj.x, obj.y);
  frame.rotation = obj.rotation ?? 0;
  frame.rect(-2, -2, obj.width + 4, obj.height + 4).stroke({ color: 0x3b82f6, width: 2 });

  // Create or update handles as children of the frame in local space
  // children indices:
  // 0 = nw scale, 1 = ne scale, 2 = sw scale, 3 = se scale, 4 = rotate handle
  const ensureHandle = (idx: number) => {
    let h = frame!.children[idx] as Graphics | undefined;
    if (!h || !(h instanceof Graphics)) {
      h = new Graphics();
      frame!.addChild(h);
    }
    return h as Graphics;
  };

  // Helper to wire a scale handle with given local rect and cursor and tag
  const wireScaleHandle = (
    idx: number,
    localX: number,
    localY: number,
    cursor: string,
    handle: 'nw' | 'ne' | 'sw' | 'se'
  ) => {
    const h = ensureHandle(idx);
    h.clear();
    h.rect(localX, localY, 12, 12).fill(0x3b82f6);
    (h as any).eventMode = 'static';
    (h as any).cursor = cursor;
    if (!(h as any).__wired) {
      h.on('pointerdown', (e: any) => {
        e.stopPropagation();
        const st = useCanvasStore.getState();
        if (st.panningMode) return;
        st.selectObject(obj.id);
        const pos = e.global;
        const worldX = pos.x - st.viewport.x;
        const worldY = pos.y - st.viewport.y;
        onScaleDown({ id: obj.id, startX: worldX, startY: worldY, handle });
      });
      (h as any).__wired = true;
    }
  };

  // Corner handles (12x12 squares)
  wireScaleHandle(0, -6, -6, 'nw-resize', 'nw'); // top-left
  wireScaleHandle(1, obj.width - 6, -6, 'ne-resize', 'ne'); // top-right
  wireScaleHandle(2, -6, obj.height - 6, 'sw-resize', 'sw'); // bottom-left
  wireScaleHandle(3, obj.width - 6, obj.height - 6, 'se-resize', 'se'); // bottom-right

  // Rotate handle (circle) above top edge, centered
  const rotateHandle = ensureHandle(4);
  rotateHandle.clear();
  rotateHandle.circle(obj.width / 2, -18, 6).fill(0x3b82f6);
  (rotateHandle as any).eventMode = 'static';
  (rotateHandle as any).cursor = 'alias';
  if (!(rotateHandle as any).__wired) {
    rotateHandle.on('pointerdown', (e: any) => {
      e.stopPropagation();
      const st = useCanvasStore.getState();
      if (st.panningMode) return;
      st.selectObject(obj.id);
      const pos = e.global;
      const worldX = pos.x - st.viewport.x;
      const worldY = pos.y - st.viewport.y;
      onRotateDown({ id: obj.id, startX: worldX, startY: worldY });
    });
    (rotateHandle as any).__wired = true;
  }

  return frame;
}
