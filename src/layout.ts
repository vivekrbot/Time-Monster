import { fonts } from './theme';

// Figma frames for this app are all authored on a 393x852 canvas.
export const CANVAS_W = 393;
export const CANVAS_H = 852;

export const pctX = (px: number) => `${(px / CANVAS_W) * 100}%` as const;
export const pctY = (px: number) => `${(px / CANVAS_H) * 100}%` as const;

// The Figma display type is set in a condensed width of Hubot Sans, which the
// static Google Fonts build doesn't ship. Compressing horizontally reproduces
// the designed widths (e.g. the timer's 128px clock lands on its 300px box)
// while keeping the spec's font sizes. DISPLAY_W is wide enough that these
// lines never wrap — the transform is visual only, so layout width must
// already exceed the natural text width.
export const DISPLAY_SCALE = 0.77;
const DISPLAY_W = 480;

export const condensedDisplay = {
  position: 'absolute',
  left: pctX(24),
  width: DISPLAY_W,
  fontFamily: fonts.hubotBlack,
  textTransform: 'uppercase',
  transform: [{ scaleX: DISPLAY_SCALE }],
  transformOrigin: 'left center',
} as const;
