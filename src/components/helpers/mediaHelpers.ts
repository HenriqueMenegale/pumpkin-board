/**
 * Load an image and resolve its natural dimensions.
 * Note: crossOrigin='anonymous' is set to allow WebGL sampling when CORS permits.
 *
 * @param {string} url - Image URL
 * @returns {Promise<{ width: number; height: number; element: HTMLImageElement }>} metadata
 */
export function loadImageMeta(url: string): Promise<{ width: number; height: number; element: HTMLImageElement }> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height, element: img });
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Fit a source rectangle within max bounds, preserving aspect ratio.
 * Returns the scaled width/height (never exceeding maxW/maxH) and the scale factor.
 *
 * @param {number} srcW - source width
 * @param {number} srcH - source height
 * @param {number} maxW - max width
 * @param {number} maxH - max height
 * @returns {{ width: number, height: number, scale: number }} fitted size
 */
export function fitWithinMax(srcW: number, srcH: number, maxW: number, maxH: number) {
  if (srcW <= 0 || srcH <= 0) return { width: Math.max(1, Math.min(maxW, srcW)), height: Math.max(1, Math.min(maxH, srcH)), scale: 1 };
  const s = Math.min(maxW / srcW, maxH / srcH, 1); // only downscale
  return { width: Math.round(srcW * s), height: Math.round(srcH * s), scale: s };
}
