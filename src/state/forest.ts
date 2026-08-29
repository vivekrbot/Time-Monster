// Growth math for the Five-Minute Forest. Pure functions only — no timers, no React —
// so a tree's stage and position are always a deterministic function of elapsed time,
// never of anything that changes when the timer is extended.

export type GrowthStage = 'seed' | 'sprout' | 'sapling' | 'young' | 'full';
export type Species = 'broadleaf' | 'oak' | 'umbrella' | 'birch' | 'poplar' | 'fir';

export type PlantedTree = {
  index: number;
  stage: GrowthStage;
  species: Species | null; // assigned only once the tree reaches 'full'
};

const STAGES: readonly GrowthStage[] = ['seed', 'sprout', 'sapling', 'young', 'full'];
const SPECIES: readonly Species[] = ['broadleaf', 'oak', 'umbrella', 'birch', 'poplar', 'fir'];

export const TREE_SECONDS = 300; // 5 minutes per tree
const STAGE_SECONDS = TREE_SECONDS / STAGES.length; // 60s per stage

export function speciesForIndex(index: number): Species {
  return SPECIES[index % SPECIES.length];
}

function stageForOffset(offsetSeconds: number): GrowthStage {
  const i = Math.min(STAGES.length - 1, Math.floor(offsetSeconds / STAGE_SECONDS));
  return STAGES[i];
}

// Every tree that should currently be visible: all trees that have reached a full
// 5-minute block (locked, permanent, species assigned), plus the one still growing —
// unless elapsed has caught up with the session total, in which case nothing is left
// to grow (a completed session never leaves a partial tree; presets are multiples of 5).
export function treesForElapsed(elapsedSeconds: number, totalSeconds: number): PlantedTree[] {
  const clampedElapsed = Math.max(0, Math.min(elapsedSeconds, totalSeconds));
  const lockedCount = Math.floor(clampedElapsed / TREE_SECONDS);

  const trees: PlantedTree[] = [];
  for (let i = 0; i < lockedCount; i++) {
    trees.push({ index: i, stage: 'full', species: speciesForIndex(i) });
  }

  if (clampedElapsed < totalSeconds) {
    const offset = clampedElapsed - lockedCount * TREE_SECONDS;
    const stage = stageForOffset(offset);
    trees.push({
      index: lockedCount,
      stage,
      species: stage === 'full' ? speciesForIndex(lockedCount) : null,
    });
  }

  return trees;
}

// The Task Done recap: a frozen snapshot, never the in-between growth stages. A tree is
// either 'full' (it finished its 5 minutes) or, only when the session was stopped early,
// the one tree still in progress shows as 'withered' — every other locked tree stays full.
export type RecapStage = 'full' | 'withered';
export type RecapTree = { index: number; stage: RecapStage; species: Species | null };

export function treesForRecap(elapsedSeconds: number, totalSeconds: number, wasStopped: boolean): RecapTree[] {
  const clampedElapsed = Math.max(0, Math.min(elapsedSeconds, totalSeconds));
  const lockedCount = Math.floor(clampedElapsed / TREE_SECONDS);

  const trees: RecapTree[] = [];
  for (let i = 0; i < lockedCount; i++) {
    trees.push({ index: i, stage: 'full', species: speciesForIndex(i) });
  }

  if (wasStopped && clampedElapsed < totalSeconds) {
    trees.push({ index: lockedCount, stage: 'withered', species: null });
  }

  return trees;
}

export type TreeSlot = { col: number; row: number };

// Center-outward fill order for one row: the column nearest the row's centre first,
// then alternating outward. Cached per `cols` — this codebase only ever calls it with
// a couple of distinct values, so there's no reason to re-sort every call.
const fillOrderCache = new Map<number, number[]>();

function centerOutOrder(cols: number): number[] {
  let order = fillOrderCache.get(cols);
  if (!order) {
    const center = (cols - 1) / 2;
    order = Array.from({ length: cols }, (_, col) => col).sort((a, b) => {
      const distanceDelta = Math.abs(a - center) - Math.abs(b - center);
      return distanceDelta !== 0 ? distanceDelta : a - b;
    });
    fillOrderCache.set(cols, order);
  }
  return order;
}

// Row order: the centre row first, then alternating out — 0, -1, +1, -2, +2, ...
// Negative is nearer/in-front, positive is farther/behind (see Forest.tsx's paint
// order). Index-only, no upper bound, so it never needs to know how many rows will
// eventually exist — unlike columns, rows aren't capped by anything.
function rowOffsetForRing(ring: number): number {
  if (ring === 0) return 0;
  const magnitude = Math.ceil(ring / 2);
  return ring % 2 === 1 ? -magnitude : magnitude;
}

// Fixed placement: tree index always resolves to the same slot, forever. A new tree
// only ever starts a new ring (a row, alternating above/below centre) or takes the
// next centre-outward column in the current row — nothing already planted moves when
// the count grows. (Deliberately not the reflowing sqrt(count) packing from the design
// sketch, which would shuffle every already-placed tree's position each time the
// column count changed.)
export function slotForIndex(index: number, cols: number): TreeSlot {
  const posInRow = index % cols;
  const ring = Math.floor(index / cols);
  return { col: centerOutOrder(cols)[posInRow], row: rowOffsetForRing(ring) };
}
