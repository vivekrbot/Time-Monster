import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import {
  slotForIndex,
  treesForElapsed,
  type GrowthStage,
  type PlantedTree,
  type RecapTree,
  type Species,
} from '../state/forest';
import { colors } from '../theme';

type Props = {
  elapsedSeconds: number;
  totalSeconds: number;
};

// Layout is a fixed-column grid, not the design source's reflowing sqrt(count) packing —
// see SID-24's Dev Log for why. Columns and spacing are sized for this 393x240 band; both
// axes deliberately overlap (COL_STEP < TILE_W, ROW_STEP < SPEC_H) so tiles read as a
// packed plot with rows layered by depth, not a bare grid.
const BAND_W = 393;
const BAND_H = 240;
const MARGIN = 8;
const TILE_W = 64;
const SPEC_H = 104;
const COL_STEP = 48;
const ROW_STEP = 64;

// Forces an odd count, decrementing by one if the natural fit is even. A single tree
// needs one column that sits exactly at the row's centre — an even count has no such
// column, so the lone-tree case would always land half a step off-centre otherwise.
function oddColumnCount(naturalFit: number): number {
  const atLeastOne = Math.max(1, naturalFit);
  return atLeastOne % 2 === 0 ? atLeastOne - 1 : atLeastOne;
}

const COLS = oddColumnCount(Math.floor((BAND_W - MARGIN * 2 - (TILE_W - COL_STEP)) / COL_STEP));
// Centres the whole column block horizontally in the band — combined with slotForIndex's
// centre-outward fill order and COLS being forced odd, the first tree planted always
// lands at the band's true horizontal centre, including the lone-tree case.
const GRID_LEFT = (BAND_W - ((COLS - 1) * COL_STEP + TILE_W)) / 2;
// Vertical centre of the band — row 0 sits here, positive rows (farther/behind) go up,
// negative rows (nearer/in front) go down. See rowOffsetForRing in forest.ts for how a
// tree's ring maps to a signed row.
const CENTER_Y = BAND_H / 2;

function slotOrigin(col: number, row: number): { x: number; y: number } {
  return {
    x: GRID_LEFT + col * COL_STEP,
    y: CENTER_Y - SPEC_H / 2 - row * ROW_STEP,
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

function Specimen({ tree, x, y }: { tree: PlantedTree; x: number; y: number }) {
  return (
    <G transform={`translate(${x} ${y})`}>
      <Tile />
      {tree.stage === 'full' && tree.species ? (
        <SpeciesArt species={tree.species} />
      ) : (
        <GrowthArt stage={tree.stage as Exclude<GrowthStage, 'full'>} />
      )}
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
  const lockedCount = trees.filter((t) => t.stage === 'full').length;
  const growing = trees.find((t) => t.index === lockedCount);

  const label = growing
    ? `${lockedCount} tree${lockedCount === 1 ? '' : 's'} grown, one more growing as ${STAGE_LABEL[growing.stage]}`
    : `${lockedCount} tree${lockedCount === 1 ? '' : 's'} grown`;

  // Back-to-front paint order: farther rows (positive, smaller y) first, nearer rows
  // (negative, larger y) last, so a nearer tile's base can overlap a farther tile's base
  // without ever covering its canopy — the canopy sits in the upper part of each tile's
  // box, above the overlap band.
  const painted = [...trees].sort((a, b) => {
    const rowA = slotForIndex(a.index, COLS).row;
    const rowB = slotForIndex(b.index, COLS).row;
    return rowB - rowA; // descending: most positive (farthest) first, most negative (nearest) last
  });

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${BAND_W} ${BAND_H}`}
      preserveAspectRatio="xMidYMid meet"
      accessibilityLabel={label}
    >
      {painted.map((tree) => {
        const slot = slotForIndex(tree.index, COLS);
        const origin = slotOrigin(slot.col, slot.row);
        return <Specimen key={tree.index} tree={tree} x={origin.x} y={origin.y} />;
      })}
    </Svg>
  );
}

// --- Task Done recap: same specimen art and slot math, a different (taller, narrower) band. ---
// A separate set of layout constants rather than parameterizing Forest() above — SID-24's
// layout already passed review; not worth the regression risk to generalize it for reuse here.
const RECAP_BAND_W = 345;
const RECAP_BAND_H = 300;
const RECAP_MARGIN = 8;
const RECAP_COL_STEP = 48;
const RECAP_ROW_STEP = 64;
const RECAP_COLS = oddColumnCount(
  Math.floor((RECAP_BAND_W - RECAP_MARGIN * 2 - (TILE_W - RECAP_COL_STEP)) / RECAP_COL_STEP),
);
// The natural fit here is even (6); forced down to 5 by oddColumnCount so the lone-tree
// case (e.g. a session stopped almost immediately) lands exactly at true centre instead
// of ~24px off. Trade-off: max trees-per-row before wrapping drops from 6 to 5.
const RECAP_GRID_LEFT = (RECAP_BAND_W - ((RECAP_COLS - 1) * RECAP_COL_STEP + TILE_W)) / 2;
const RECAP_CENTER_Y = RECAP_BAND_H / 2;

function recapSlotOrigin(col: number, row: number): { x: number; y: number } {
  return {
    x: RECAP_GRID_LEFT + col * RECAP_COL_STEP,
    y: RECAP_CENTER_Y - SPEC_H / 2 - row * RECAP_ROW_STEP,
  };
}

function RecapSpecimen({ tree, x, y }: { tree: RecapTree; x: number; y: number }) {
  return (
    <G transform={`translate(${x} ${y})`}>
      {tree.stage === 'withered' ? <DryTile /> : <Tile />}
      {tree.stage === 'full' && tree.species ? <SpeciesArt species={tree.species} /> : <WitheredArt />}
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

  // Same back-to-front reasoning as Forest() above, over the recap's own column count.
  const painted = [...trees].sort((a, b) => {
    const rowA = slotForIndex(a.index, RECAP_COLS).row;
    const rowB = slotForIndex(b.index, RECAP_COLS).row;
    return rowB - rowA; // descending: most positive (farthest) first, most negative (nearest) last
  });

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${RECAP_BAND_W} ${RECAP_BAND_H}`}
      preserveAspectRatio="xMidYMid meet"
      accessibilityLabel={label}
    >
      {painted.map((tree) => {
        const slot = slotForIndex(tree.index, RECAP_COLS);
        const origin = recapSlotOrigin(slot.col, slot.row);
        return <RecapSpecimen key={tree.index} tree={tree} x={origin.x} y={origin.y} />;
      })}
    </Svg>
  );
}
