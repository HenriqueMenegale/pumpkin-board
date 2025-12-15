export const APP_BACKGROUND_COLOR = '#ffffff';

export const SELECTION_OUTLINE_PADDING = 2;
export const SELECTION_OUTLINE_WIDTH = 2;
export const SELECTION_OUTLINE_COLOR = '#3b82f6';
export const SELECTION_OUTLINE_ZINDEX = 9999;

// Placeholder sprites
export const PLACEHOLDER_TINT = '#dddddd';

// Transform interactions
export const TRANSFORM_MIN_SIZE = 10;

// Video controls overlay
export const VIDEO_CONTROLS_OFFSET_Y = 6;


// Video playback
export const VIDEO_TIME_EPSILON = 0.25;

// Default sizes/positions for Add via URL
export const DEFAULT_IMAGE = { x: 100, y: 100, width: 300, height: 200 };
export const DEFAULT_VIDEO = { x: 150, y: 150, width: 320, height: 180 };

// Default placement for newly added items (position only)
export const DEFAULT_IMAGE_POSITION = { x: 100, y: 100 };
export const DEFAULT_VIDEO_POSITION = { x: 150, y: 150 };

// Initial max size for newly added images
export const INITIAL_IMAGE_MAX_W = 800;
export const INITIAL_IMAGE_MAX_H = 600;

// Debug seeding ranges and sizes
export const SPAWN_RANGE_MIN_FACTOR = -0.25; // -0.25× viewport
export const SPAWN_RANGE_MAX_FACTOR = 1.25;  // +1.25× viewport
export const DEBUG_IMG_MIN_W = 220;
export const DEBUG_IMG_W_SPREAD = 260; // width = MIN + rand*SPREAD
export const DEBUG_IMG_ASPECT = 2 / 3;
export const DEBUG_VID_MIN_W = 320;
export const DEBUG_VID_W_SPREAD = 200; // width = MIN + rand*SPREAD
export const DEBUG_VID_ASPECT = 9 / 16;

// Rectangle drawing defaults (for rect objects rendered in WhiteboardCanvas)
export const RECT_DEFAULT_FILL = '#2ecc71';
export const RECT_DEFAULT_STROKE = '#000000';
export const RECT_DEFAULT_STROKE_WIDTH = 1;
