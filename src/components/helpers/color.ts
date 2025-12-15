/**
 * Convert a CSS hex color string (e.g. "#3b82f6") to a Pixi numeric color (0xRRGGBB).
 * @param {string} hex - CSS hex color string
 * @returns {number} numeric color value suitable for Pixi APIs like Sprite.tint
 */
export function hexToNumber(hex: string): number {
  const s = hex.startsWith('#') ? hex.slice(1) : hex;
  return parseInt(s, 16);
}
