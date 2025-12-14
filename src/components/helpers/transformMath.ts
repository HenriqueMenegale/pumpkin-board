// Geometry and transform helpers used by canvas transform interactions

/**
 * Rotate a 2D vector by a given rotation expressed as precomputed cosine and sine.
 *
 * @param {number} x - X component of the vector in local space.
 * @param {number} y - Y component of the vector in local space.
 * @param {number} cos - Cosine of the rotation angle (in radians).
 * @param {number} sin - Sine of the rotation angle (in radians).
 * @returns {{ x: number, y: number }} The rotated vector components.
 */
export function rotate(x: number, y: number, cos: number, sin: number) {
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

/**
 * Convert a world point into object-local coordinates about a chosen anchor.
 *
 * Local space is defined so that its origin is at the provided anchor (in world coordinates)
 * and its axes are aligned with the object's axes prior to rotation.
 *
 * @param {number} wx - World X coordinate to convert.
 * @param {number} wy - World Y coordinate to convert.
 * @param {number} anchorWX - World X of the anchor/origin.
 * @param {number} anchorWY - World Y of the anchor/origin.
 * @param {number} rotation - Object rotation in radians.
 * @returns {{ lx: number, ly: number }} Point in local coordinates (about the anchor).
 */
export function worldToLocalAboutAnchor(
  wx: number,
  wy: number,
  anchorWX: number,
  anchorWY: number,
  rotation: number
) {
  const cos = Math.cos(rotation || 0);
  const sin = Math.sin(rotation || 0);
  const vx = wx - anchorWX;
  const vy = wy - anchorWY;
  // rotate into local space
  const lx = vx * cos + vy * sin;
  const ly = -vx * sin + vy * cos;
  return { lx, ly };
}

/**
 * Convert a point from local space (about an anchor) back into world coordinates.
 *
 * @param {number} lx - Local X (about the anchor).
 * @param {number} ly - Local Y (about the anchor).
 * @param {number} anchorWX - World X of the anchor/origin.
 * @param {number} anchorWY - World Y of the anchor/origin.
 * @param {number} rotation - Object rotation in radians.
 * @returns {{ x: number, y: number }} World coordinates of the point.
 */
export function localToWorldFromAnchor(
  lx: number,
  ly: number,
  anchorWX: number,
  anchorWY: number,
  rotation: number
) {
  const cos = Math.cos(rotation || 0);
  const sin = Math.sin(rotation || 0);
  const w = rotate(lx, ly, cos, sin);
  return { x: anchorWX + w.x, y: anchorWY + w.y };
}

/**
 * Clamp width and height to a minimum absolute size, preserving sign-insensitive magnitude.
 *
 * @param {number} w - Proposed width (can be negative while interacting).
 * @param {number} h - Proposed height (can be negative while interacting).
 * @param {number} [min=10] - Minimum absolute size for each dimension in pixels.
 * @returns {{ w: number, h: number }} Clamped positive width/height.
 */
export function clampSize(w: number, h: number, min = 10) {
  return { w: Math.max(min, Math.abs(w)), h: Math.max(min, Math.abs(h)) };
}

/**
 * Compute a scaled rectangle based on a fixed anchor (opposite corner) and a pointer position.
 *
 * The pointer is converted to the object's local space about the anchor; size is clamped;
 * then the top-left in world space and the new width/height are returned.
 *
 * @param {object} params - Parameters object.
 * @param {number} params.anchorWX - Anchor world X (fixed corner).
 * @param {number} params.anchorWY - Anchor world Y (fixed corner).
 * @param {number} params.pointerWX - Pointer world X.
 * @param {number} params.pointerWY - Pointer world Y.
 * @param {number} params.rotation - Object rotation in radians.
 * @param {number} [params.minSize=10] - Minimum size for width/height in pixels.
 * @returns {{ x: number, y: number, width: number, height: number }} New top-left (world) and size.
 */
export function computeScaledRectFromAnchor(params: {
  anchorWX: number;
  anchorWY: number;
  pointerWX: number;
  pointerWY: number;
  rotation: number;
  minSize?: number;
}) {
  const { anchorWX, anchorWY, pointerWX, pointerWY, rotation, minSize = 10 } = params;
  const { lx, ly } = worldToLocalAboutAnchor(pointerWX, pointerWY, anchorWX, anchorWY, rotation);
  const { w, h } = clampSize(lx, ly, minSize);
  // In local space, top-left relative to anchor is min(0, lx/ly)
  const tlLocalX = Math.min(0, lx);
  const tlLocalY = Math.min(0, ly);
  const topLeftWorld = localToWorldFromAnchor(tlLocalX, tlLocalY, anchorWX, anchorWY, rotation);
  return { x: topLeftWorld.x, y: topLeftWorld.y, width: w, height: h };
}

/**
 * Compute the signed angle delta (radians) between two world points around a given center.
 *
 * Positive values represent counter‑clockwise rotation from start to current.
 *
 * @param {number} startWX - Start world X used as initial direction.
 * @param {number} startWY - Start world Y used as initial direction.
 * @param {number} curWX - Current world X.
 * @param {number} curWY - Current world Y.
 * @param {number} cx - Center world X.
 * @param {number} cy - Center world Y.
 * @returns {number} Angle delta in radians (can be negative).
 */
export function angleDeltaAroundCenter(
  startWX: number,
  startWY: number,
  curWX: number,
  curWY: number,
  cx: number,
  cy: number
) {
  const a = Math.atan2(startWY - cy, startWX - cx);
  const b = Math.atan2(curWY - cy, curWX - cx);
  return b - a;
}

/**
 * Compute the top-left world position of a rotated rectangle when its center is known.
 *
 * @param {number} cx - Center world X of the rectangle.
 * @param {number} cy - Center world Y of the rectangle.
 * @param {number} w - Width in pixels.
 * @param {number} h - Height in pixels.
 * @param {number} rot - Rotation in radians.
 * @returns {{ x: number, y: number }} Top-left world coordinates.
 */
export function topLeftFromCenter(cx: number, cy: number, w: number, h: number, rot: number) {
  const hx = w / 2;
  const hy = h / 2;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  // top-left is center + R(rot) * (-hx, -hy)
  const x = cx + (-hx * cos - (-hy) * sin);
  const y = cy + (-hx * sin + (-hy) * cos);
  return { x, y };
}

/**
 * Compute the world-space center of a rectangle given its top-left, size and rotation.
 *
 * @param {number} x - Top-left world X.
 * @param {number} y - Top-left world Y.
 * @param {number} w - Width in pixels.
 * @param {number} h - Height in pixels.
 * @param {number} rot - Rotation in radians.
 * @returns {{ cx: number, cy: number }} Center world coordinates.
 */
export function centerFromTopLeft(x: number, y: number, w: number, h: number, rot: number) {
  const hx = w / 2;
  const hy = h / 2;
  const cos = Math.cos(rot || 0);
  const sin = Math.sin(rot || 0);
  const cx = x + (hx * cos - hy * sin);
  const cy = y + (hx * sin + hy * cos);
  return { cx, cy };
}

/**
 * Convert local coordinates (about top-left origin) to world coordinates for a rotated rectangle.
 *
 * @param {number} lx - Local X (origin at top-left).
 * @param {number} ly - Local Y (origin at top-left).
 * @param {number} tlx - Top-left world X.
 * @param {number} tly - Top-left world Y.
 * @param {number} rotation - Rotation in radians.
 * @returns {{ x: number, y: number }} World coordinates of the local point.
 */
export function localToWorldFromTopLeft(lx: number, ly: number, tlx: number, tly: number, rotation: number) {
  const cos = Math.cos(rotation || 0);
  const sin = Math.sin(rotation || 0);
  const x = tlx + (lx * cos - ly * sin);
  const y = tly + (lx * sin + ly * cos);
  return { x, y };
}

export type CornerHandle = 'nw' | 'ne' | 'sw' | 'se';

/**
 * Compute the world-space anchor (fixed corner) opposite to a dragged corner handle.
 *
 * The rectangle is defined by its top-left position, width/height and rotation. The handle
 * identifies which corner is being dragged (nw/ne/sw/se). This function returns the fixed
 * corner (the opposite one) in world coordinates, useful when scaling from that handle.
 *
 * @param {number} x - Top-left world X of the rectangle.
 * @param {number} y - Top-left world Y of the rectangle.
 * @param {number} w - Width in pixels.
 * @param {number} h - Height in pixels.
 * @param {number} rotation - Rotation in radians.
 * @param {CornerHandle} handle - The active corner handle ('nw' | 'ne' | 'sw' | 'se').
 * @returns {{ x: number, y: number }} World coordinates of the opposite corner anchor.
 */
export function oppositeCornerAnchorWorld(
  x: number,
  y: number,
  w: number,
  h: number,
  rotation: number,
  handle: CornerHandle
) {
  // In object-local coordinates: TL=(0,0), TR=(w,0), BL=(0,h), BR=(w,h)
  // The anchor is the opposite corner of the dragged handle.
  let lx = 0;
  let ly = 0;
  if (handle === 'se') { lx = 0; ly = 0; }           // dragging BR -> anchor TL
  else if (handle === 'nw') { lx = w; ly = h; }      // dragging TL -> anchor BR
  else if (handle === 'ne') { lx = 0; ly = h; }      // dragging TR -> anchor BL
  else /* 'sw' */ { lx = w; ly = 0; }                // dragging BL -> anchor TR
  return localToWorldFromTopLeft(lx, ly, x, y, rotation || 0);
}
