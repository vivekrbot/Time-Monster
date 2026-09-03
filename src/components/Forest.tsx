import { useEffect, useRef, useState } from 'react';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import {
  lockedTreeCount,
  plotForCount,
  treesForElapsed,
  type GrowthStage,
  type PlantedTree,
  type Plot,
  type RecapTree,
  type Species,
} from '../state/forest';
import { prefersReducedMotion } from '../motion';
import { colors } from '../theme';

type Props = {
  elapsedSeconds: number;
  totalSeconds: number;
};

// Isometric plot geometry, straight from the design source. A specimen box is 64x104 with
// its tile's top-centre at (32,72) and the canopy growing up into y=0. Tiles interlock on
// both axes: a step across costs half a tile (DX), and a row further back costs only 16px
// of height (DY) instead of a full tile — which is what lets nineteen trees fit the band.
// The empty band the Timer screen already has, between the focus label and the buttons.
const BAND_W = 393;
const BAND_H = 240;

const TILE_W = 64;
const SPEC_H = 104;
const DX = 32;
const DY = 16;
// Trimmed to buy tile size: the 19-tree plot is height-bound in the timer band, so every
// pixel of vertical padding comes straight off how large a tile can be drawn.
const PAD = 6;

// Drawn tile widths, largest first; the art itself is authored in a 64px box, so 72 draws it
// at 112.5%. The first tier is the preferred size, and it is chosen as the largest one where
// the 19-tree (95 minute) plot still clears the shorter of the two bands — so the tile stays
// identical across every preset and only steps for forests beyond the longest one.
//
// Size steps in discrete tiers rather than sliding continuously. `+15` is unbounded, so a
// forest can outgrow its band; when it does, "the forest got deep" should read as a rare,
// deliberate event, not a reshuffle that nudges every tile on every new tree.
const TILE_TIERS = [72, 64, 48, 36, 27];

type PlotLayout = { scale: number; offsetX: number; offsetY: number };

// Fits the plot to a band, centred. Trees stay at the preferred size until the plot genuinely
// outgrows the band — for every current preset (up to 19 trees) the first tier wins.
function layoutPlot(plot: Plot, bandW: number, bandH: number): PlotLayout {
  const plotW = (plot.maxAcross - plot.minAcross) * DX + TILE_W;
  const plotH = (plot.maxDepth - plot.minDepth) * DY + SPEC_H;

  const fit = Math.min(TILE_TIERS[0] / TILE_W, (bandW - PAD * 2) / plotW, (bandH - PAD * 2) / plotH);
  const tier = TILE_TIERS.find((width) => width / TILE_W <= fit);
  // Below the smallest tier, fall back to an exact fit — a forest that deep is far past
  // any preset, and overflowing the band would be worse than one more size.
  const scale = tier !== undefined ? tier / TILE_W : fit;

  return {
    scale,
    offsetX: (bandW - plotW * scale) / 2,
    offsetY: (bandH - plotH * scale) / 2,
  };
}

function slotOrigin(plot: Plot, index: number): { x: number; y: number } {
  const slot = plot.slots[index];
  return {
    x: (slot.across - plot.minAcross) * DX,
    y: (slot.depth - plot.minDepth) * DY,
  };
}

// Shared turf-tile base every specimen sits on. Local coordinates, viewBox-relative
// (0,0)-(64,104), tile top-centre at (32,72).
function Tile() {
  return (
    <>
      <Path d="M0 72 L32 88 L32 92 L0 76 Z" fill="#2FA96A" />
      <Path d="M32 88 L64 72 L64 76 L32 92 Z" fill="#3BBF7C" />
      <Path d="M0 76 L32 92 L32 104 L21.3 93.3 L10.7 98.7 L0 88 Z" fill="#4A3020" />
      <Path d="M32 92 L64 76 L64 88 L53.3 98 L42.7 92 L32 104 Z" fill="#6B4527" />
      <Path d="M32 56 L64 72 L32 88 L0 72 Z" fill="#4FD98E" />
      <Ellipse cx={32} cy={72} rx={15} ry={7.5} fill="#45C97F" />
    </>
  );
}

// Dried-out variant of the same turf tile, for a withered specimen's base.
function DryTile() {
  return (
    <>
      <Path d="M0 72 L32 88 L32 92 L0 76 Z" fill="#8A8471" />
      <Path d="M32 88 L64 72 L64 76 L32 92 Z" fill="#9A947F" />
      <Path d="M0 76 L32 92 L32 104 L21.3 93.3 L10.7 98.7 L0 88 Z" fill="#4A3020" />
      <Path d="M32 92 L64 76 L64 88 L53.3 98 L42.7 92 L32 104 Z" fill="#6B4527" />
      <Path d="M32 56 L64 72 L32 88 L0 72 Z" fill="#A8A18B" />
      <Ellipse cx={32} cy={72} rx={15} ry={7.5} fill="#9B9480" />
    </>
  );
}

// No green survives a stop — reuses the app's existing gray token, not a new color.
function WitheredArt() {
  return (
    <>
      <Path d="M29 71 L30.5 42 L33.5 42 L35 71 Z" fill={colors.gray} />
      <Path d="M32 42 L33.5 42 L35 71 L33 71 Z" fill="#5C5C5C" />
      <Path
        d="M32 56 L20 46 M32 50 L45 42 M32 46 L32 33 M32 40 L24 33"
        stroke={colors.gray}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </>
  );
}

function GrowthArt({ stage }: { stage: Exclude<GrowthStage, 'full'> }) {
  switch (stage) {
    case 'seed':
      return (
        <>
          <Ellipse cx={32} cy={71} rx={5} ry={3} fill="#6B4527" />
          <Ellipse cx={30.5} cy={70} rx={2.6} ry={1.5} fill="#8A5C36" />
        </>
      );
    case 'sprout':
      return (
        <>
          <Path d="M32 71 V58" stroke="#2FA96A" strokeWidth={3} strokeLinecap="round" />
          <Ellipse cx={25} cy={57} rx={7} ry={3.8} fill="#67FFB3" transform="rotate(-16 25 57)" />
          <Ellipse cx={39} cy={57} rx={7} ry={3.8} fill="#3DBE7A" transform="rotate(16 39 57)" />
        </>
      );
    case 'sapling':
      return (
        <>
          <Path d="M29.5 71 L30.5 50 L33.5 50 L34.5 71 Z" fill="#6B4527" />
          <Path d="M32 50 L33.5 50 L34.5 71 L32.8 71 Z" fill="#4A2E1A" />
          <Circle cx={32} cy={45} r={11.5} fill="#1E9E63" />
          <Circle cx={28} cy={41} r={5.5} fill="#3DBE7A" />
        </>
      );
    case 'young':
      return (
        <>
          <Path d="M29 71 L30.5 42 L33.5 42 L35 71 Z" fill="#6B4527" />
          <Path d="M32 42 L33.5 42 L35 71 L33 71 Z" fill="#4A2E1A" />
          <Circle cx={21} cy={40} r={10} fill="#0B5D3B" />
          <Circle cx={43} cy={40} r={10} fill="#0B5D3B" />
          <Circle cx={32} cy={29} r={13} fill="#1E9E63" />
          <Circle cx={27} cy={24} r={6} fill="#3DBE7A" />
        </>
      );
  }
}

function SpeciesArt({ species }: { species: Species }) {
  switch (species) {
    case 'broadleaf':
      return (
        <>
          <Path d="M29 71 L31 40 L34 40 L36 71 Z" fill="#6B4527" />
          <Path d="M32.5 40 L34 40 L36 71 L34 71 Z" fill="#4A2E1A" />
          <Path d="M32 50 L17 42 M32 46 L48 40" stroke="#6B4527" strokeWidth={2.5} strokeLinecap="round" />
          <Circle cx={13} cy={41} r={10} fill="#0B5D3B" />
          <Circle cx={51} cy={41} r={10} fill="#0B5D3B" />
          <Circle cx={23} cy={31} r={12} fill="#1E9E63" />
          <Circle cx={42} cy={32} r={11} fill="#1E9E63" />
          <Circle cx={32} cy={22} r={12} fill="#3DBE7A" />
          <Circle cx={28} cy={17} r={5} fill="#67FFB3" />
        </>
      );
    case 'oak':
      return (
        <>
          <Path d="M29 71 L30.5 46 L33.5 46 L35 71 Z" fill="#6B4527" />
          <Path d="M32 46 L33.5 46 L35 71 L33 71 Z" fill="#4A2E1A" />
          <Circle cx={17} cy={45} r={9} fill="#0B5D3B" />
          <Circle cx={47} cy={45} r={9} fill="#0B5D3B" />
          <Circle cx={32} cy={38} r={12} fill="#0B5D3B" />
          <Circle cx={21} cy={30} r={10.5} fill="#1E9E63" />
          <Circle cx={44} cy={31} r={10} fill="#1E9E63" />
          <Circle cx={32} cy={19} r={13} fill="#3DBE7A" />
          <Circle cx={28} cy={13} r={5.5} fill="#67FFB3" />
        </>
      );
    case 'umbrella':
      return (
        <>
          <Path d="M29.5 71 C29.5 58 27 50 34 42 L37.5 44.5 C32 51 33.5 58 34 71 Z" fill="#6B4527" />
          <Ellipse cx={32} cy={36} rx={24} ry={11} fill="#1E9E63" />
          <Ellipse cx={30} cy={31} rx={17} ry={7.5} fill="#3DBE7A" />
          <Ellipse cx={26} cy={28} rx={7} ry={3.4} fill="#67FFB3" />
        </>
      );
    case 'birch':
      return (
        <>
          <Path d="M30 71 L31 34 L33 34 L34 71 Z" fill="#6B4527" />
          <Path d="M32 34 L33 34 L34 71 L32.7 71 Z" fill="#4A2E1A" />
          <Path
            d="M32 52 L20 43 M32 46 L45 38 M32 40 L26 31 M32 38 L40 31"
            stroke="#6B4527"
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Circle cx={17} cy={41} r={5.5} fill="#0B5D3B" />
          <Circle cx={47} cy={36} r={5} fill="#0B5D3B" />
          <Circle cx={24} cy={28} r={6} fill="#1E9E63" />
          <Circle cx={41} cy={28} r={5.5} fill="#1E9E63" />
          <Circle cx={32} cy={24} r={6.5} fill="#3DBE7A" />
          <Circle cx={29} cy={21} r={3} fill="#67FFB3" />
        </>
      );
    case 'poplar':
      return (
        <>
          <Path d="M30 71 L30.5 54 L33.5 54 L34 71 Z" fill="#6B4527" />
          <Ellipse cx={32} cy={32} rx={13} ry={24} fill="#1E9E63" />
          <Ellipse cx={28.5} cy={27} rx={6.5} ry={14} fill="#3DBE7A" />
          <Ellipse cx={27} cy={20} rx={3} ry={6} fill="#67FFB3" />
        </>
      );
    case 'fir':
      return (
        <>
          <Path d="M30 71 L30.5 58 L33.5 58 L34 71 Z" fill="#6B4527" />
          <Path d="M32 33 L52 62 L12 62 Z" fill="#0B5D3B" />
          <Path d="M32 21 L48 47 L16 47 Z" fill="#1E9E63" />
          <Path d="M32 9 L44 33 L20 33 Z" fill="#3DBE7A" />
          <Path d="M32 9 L37.5 20 L26.5 20 Z" fill="#67FFB3" />
        </>
      );
  }
}

// --- Lock-in pop -----------------------------------------------------------
// A tree reaching its full five minutes is the one real achievement in a session, and it
// used to happen silently — the art just swapped. This marks the moment and nothing else:
// it is over in under half a second, so unlike an ambient effect it never competes with
// the timer for attention.

const POP_MS = 420;
const POP_AMPLITUDE = 0.12;
// The trunk root, in specimen-local coordinates — the point where the tree meets its tile.
// Scaling about here reads as the tree pushing up out of the ground; scaling about the box
// centre would make it slide instead.
const POP_PIVOT_X = 32;
const POP_PIVOT_Y = 71;

// A single front-loaded hump: snaps up to the overshoot in roughly the first third, then
// eases back down. Starts and ends at exactly 1, so a finished pop leaves nothing to reset.
function popScaleAt(t: number): number {
  return 1 + POP_AMPLITUDE * Math.sin(Math.PI * Math.pow(t, 0.6));
}

// Runs a one-shot pop whenever `active` goes false -> true. State lives here rather than in
// Forest so a running pop re-renders only its own specimen — the other eighteen trees, and
// the plot layout, are untouched while it plays.
function usePopScale(active: boolean): number {
  const [scale, setScale] = useState(1);
  // Seeded with whatever `active` is at mount, so arriving on a screen where a tree is
  // already the most recently locked one does not replay a pop the user never earned.
  const wasActive = useRef(active);

  useEffect(() => {
    if (active === wasActive.current) return;
    wasActive.current = active;
    if (!active || prefersReducedMotion()) return;

    let frame = 0;
    const startedAt = Date.now();
    const step = () => {
      const t = Math.min(1, (Date.now() - startedAt) / POP_MS);
      setScale(t < 1 ? popScaleAt(t) : 1);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return scale;
}

// --- Wind ------------------------------------------------------------------
// Runs on both screens, at different strengths — see the two profiles below. Driven from JS
// rather than CSS keyframes: react-native-svg's web layer does forward
// `style`, but only through react-native-web's resolver, and a raw `animation` shorthand
// surviving that is not something worth betting the feature on. The cost is kept down by
// capping the loop well below display rate — at a 4.5s cycle nothing is gained above 30fps —
// and by deriving every tree's angle from one shared phase value, so a frame re-renders the
// specimens and nothing else.

// Two profiles, because the two screens are doing different jobs. Task Done is a reward, so
// the wind there runs at full strength. The Timer screen has to stay liveable behind
// forty-five minutes of focus.
//
// The calming lever there is the period, not the amplitude: what pulls the eye to peripheral
// motion is its speed, not how far it travels, and a sway shrunk below about two pixels of
// crown movement simply stops being visible at all. So the timer keeps most of the amplitude
// and runs a slightly longer cycle than the reward screen.
//
// Both periods sit in the 1-3s band a real canopy sways at. They were originally set far
// slower, on the theory that slower is less distracting — which is true, but past a couple of
// seconds per cycle it stops reading as wind and starts reading as floating. Tested in use,
// and corrected.
//
// gustLagMs is held at roughly 4% of the period on both profiles. It is the lag that makes
// the sway travel, so it has to scale with the cycle: left as a fixed millisecond value it
// would become a large fraction of a shorter period and push opposite ends of the plot into
// antiphase, which reads as chaos rather than a gust.
type WindProfile = {
  periodMs: number;
  // Lag per column-step, which turns nineteen independent wobbles into one gust crossing the
  // plot. This is the whole difference between "a landscape" and "a screensaver".
  gustLagMs: number;
  amplitudeScale: number;
  // Nothing is gained from drawing a multi-second sway at display rate.
  fps: number;
};

const RECAP_WIND: WindProfile = { periodMs: 2400, gustLagMs: 95, amplitudeScale: 1, fps: 30 };
const TIMER_WIND: WindProfile = { periodMs: 3000, gustLagMs: 120, amplitudeScale: 0.8, fps: 30 };

// Amplitude in degrees, per species. Not uniform, for two reasons: conifers genuinely barely
// move while poplars shimmer, and the design source is explicit that species are told apart
// by outline at roughly twelve pixels of canopy — so equal sway would blur the one cue that
// distinguishes them. The stiffest silhouettes move least.
const SWAY_DEGREES: Record<Species, number> = {
  fir: 0.35,
  oak: 1,
  broadleaf: 1.5,
  umbrella: 2,
  birch: 2.6,
  poplar: 3,
};

// Two sines at a 1:2.3 frequency ratio. A single sine reads as mechanical because the whole
// plot returns to rest together; the offset second wave breaks that up. The pattern does
// still repeat — 2.3 is 23/10, so the true period is ten cycles, 45 seconds — which is far
// longer than anyone spends on a results screen. Shift the 2.3 to lengthen it if that ever
// stops being true.
function swayAngle(elapsedMs: number, amplitudeDeg: number, lagMs: number, periodMs: number): number {
  const theta = ((elapsedMs - lagMs) / periodMs) * Math.PI * 2;
  return amplitudeDeg * (0.7 * Math.sin(theta) + 0.3 * Math.sin(2.3 * theta + 1.1));
}

// Shared by both screens: a tree's angle from the wind clock, its species and its column.
function swayFor(plot: Plot, index: number, species: Species, wind: WindProfile, windMs: number): number {
  const amplitude = SWAY_DEGREES[species] * wind.amplitudeScale;
  const lagMs = (plot.slots[index].across - plot.minAcross) * wind.gustLagMs;
  return Number(swayAngle(windMs, amplitude, lagMs, wind.periodMs).toFixed(3));
}

// One clock for the whole forest. Returns elapsed milliseconds, or null when there is nothing
// to sway or the viewer has asked for reduced motion — in which case no loop starts. null,
// not 0: swayAngle(0, ...) is a per-column phase offset, not necessarily zero (a tree away
// from the lag origin evaluates to a real nonzero angle at t=0) — freezing at 0 would leave
// off-center trees permanently tilted instead of upright. Callers must treat null as "angle 0",
// never pass it into swayAngle.
function useWindClock(enabled: boolean, fps: number): number | null {
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled || prefersReducedMotion()) {
      setElapsedMs(null);
      return;
    }

    let frame = 0;
    let lastPaint = 0;
    const startedAt = Date.now();
    const step = () => {
      const now = Date.now();
      if (now - lastPaint >= 1000 / fps) {
        lastPaint = now;
        setElapsedMs(now - startedAt);
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [enabled, fps]);

  return elapsedMs;
}

function Specimen({
  tree,
  x,
  y,
  popping,
  angle,
}: {
  tree: PlantedTree;
  x: number;
  y: number;
  popping: boolean;
  angle: number;
}) {
  const scale = usePopScale(popping);

  return (
    <G transform={`translate(${x} ${y})`}>
      {/* The tile is ground — it stays put while the tree growing out of it pops and sways. */}
      <Tile />
      {/* Pop and sway share one pivot, so a tree that locks mid-gust bends and swells about
          the same trunk root instead of fighting itself. */}
      <G
        transform={`translate(${POP_PIVOT_X} ${POP_PIVOT_Y}) rotate(${angle}) scale(${scale}) translate(${-POP_PIVOT_X} ${-POP_PIVOT_Y})`}
      >
        {tree.stage === 'full' && tree.species ? (
          <SpeciesArt species={tree.species} />
        ) : (
          <GrowthArt stage={tree.stage as Exclude<GrowthStage, 'full'>} />
        )}
      </G>
    </G>
  );
}

const STAGE_LABEL: Record<GrowthStage, string> = {
  seed: 'a seed',
  sprout: 'a sprout',
  sapling: 'a sapling',
  young: 'a young tree',
  full: 'a full tree',
};

export default function Forest({ elapsedSeconds, totalSeconds }: Props) {
  const trees = treesForElapsed(elapsedSeconds, totalSeconds);
  // Not a count of 'full'-stage trees — the last growth stage shares that name. See
  // lockedTreeCount for why that distinction matters here.
  const lockedCount = lockedTreeCount(elapsedSeconds, totalSeconds);
  const growing = trees.find((t) => t.index === lockedCount);

  const label = growing
    ? `${lockedCount} tree${lockedCount === 1 ? '' : 's'} grown, one more growing as ${STAGE_LABEL[growing.stage]}`
    : `${lockedCount} tree${lockedCount === 1 ? '' : 's'} grown`;

  const plot = plotForCount(trees.length);
  const { scale, offsetX, offsetY } = layoutPlot(plot, BAND_W, BAND_H);

  // Nothing sways until the first tree is actually earned, so a session's opening five
  // minutes stay completely still.
  const windMs = useWindClock(lockedCount > 0, TIMER_WIND.fps);

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${BAND_W} ${BAND_H}`}
      preserveAspectRatio="xMidYMid meet"
      accessibilityLabel={label}
    >
      {/* Tree index order is already the plot's painter's order — farthest first, the one
          still growing last and nearest — so nothing needs re-sorting before it is drawn. */}
      <G transform={`translate(${offsetX} ${offsetY}) scale(${scale})`}>
        {trees.map((tree) => {
          const origin = slotOrigin(plot, tree.index);
          // Locked trees sway; the one still growing stays still, which keeps the eye on the
          // difference between earned and in-progress. Gated on lockedCount rather than on
          // stage — a tree in its final growth minute already looks full but is not yet safe
          // from Stop, and must not behave as though it were.
          const locked = tree.index < lockedCount;
          const angle =
            locked && tree.species && windMs !== null
              ? swayFor(plot, tree.index, tree.species, TIMER_WIND, windMs)
              : 0;
          return (
            <Specimen
              key={tree.index}
              tree={tree}
              x={origin.x}
              y={origin.y}
              // Only the most recently locked tree pops, and only as it locks.
              popping={tree.index === lockedCount - 1}
              angle={angle}
            />
          );
        })}
      </G>
    </Svg>
  );
}

// --- Task Done recap: same specimen art and plot math, a different (taller, narrower) band. ---
const RECAP_BAND_W = 345;
const RECAP_BAND_H = 300;

function RecapSpecimen({ tree, x, y, angle }: { tree: RecapTree; x: number; y: number; angle: number }) {
  return (
    <G transform={`translate(${x} ${y})`}>
      {/* Ground never moves — only what grows out of it. Same pivot as the lock-in pop, so a
          tree bends from its trunk root rather than swinging about the middle of its box. */}
      {tree.stage === 'withered' ? <DryTile /> : <Tile />}
      <G transform={`translate(${POP_PIVOT_X} ${POP_PIVOT_Y}) rotate(${angle}) translate(${-POP_PIVOT_X} ${-POP_PIVOT_Y})`}>
        {tree.stage === 'full' && tree.species ? <SpeciesArt species={tree.species} /> : <WitheredArt />}
      </G>
    </G>
  );
}

export function RecapForest({ trees }: { trees: RecapTree[] }) {
  const witheredCount = trees.filter((t) => t.stage === 'withered').length;
  const fullCount = trees.length - witheredCount;
  const label =
    fullCount > 0 && witheredCount > 0
      ? `${fullCount} tree${fullCount === 1 ? '' : 's'} grown, one withered`
      : witheredCount > 0
        ? 'one tree withered'
        : `${fullCount} tree${fullCount === 1 ? '' : 's'} grown`;

  const plot = plotForCount(trees.length);
  const { scale, offsetX, offsetY } = layoutPlot(plot, RECAP_BAND_W, RECAP_BAND_H);

  // A forest of nothing but a withered tree has no reason to run a loop at all.
  const windMs = useWindClock(
    trees.some((t) => t.stage === 'full' && t.species !== null),
    RECAP_WIND.fps,
  );

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${RECAP_BAND_W} ${RECAP_BAND_H}`}
      preserveAspectRatio="xMidYMid meet"
      accessibilityLabel={label}
    >
      {/* Index order is painter's order here too, which puts a stopped session's withered
          tree in the nearest slot — the last thing planted, and the last thing drawn. */}
      <G transform={`translate(${offsetX} ${offsetY}) scale(${scale})`}>
        {trees.map((tree) => {
          const origin = slotOrigin(plot, tree.index);
          // Dead wood does not move. The whole forest breathing around one rigid grey tree
          // says what a stopped session cost far better than the grey palette does alone.
          const angle =
            tree.stage === 'full' && tree.species && windMs !== null
              ? swayFor(plot, tree.index, tree.species, RECAP_WIND, windMs)
              : 0;
          return (
            <RecapSpecimen
              key={tree.index}
              tree={tree}
              x={origin.x}
              y={origin.y}
              angle={angle}
            />
          );
        })}
      </G>
    </Svg>
  );
}
