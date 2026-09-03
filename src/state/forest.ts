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

// How many trees are permanently earned. The single definition of "locked" — treesForElapsed
// and treesForRecap both count the same way, and callers must use this rather than counting
// trees whose stage is 'full': the fifth *growth* stage is also called 'full', so a tree that
// still has a minute to run already looks finished. Counting those would claim a tree that
// Stop can still wither.
export function lockedTreeCount(elapsedSeconds: number, totalSeconds: number): number {
  return Math.floor(Math.max(0, Math.min(elapsedSeconds, totalSeconds)) / TREE_SECONDS);
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

export type PlotSlot = { across: number; depth: number };

export type Plot = {
  // Painter's order: farthest tile first, nearest last. Slot n belongs to tree index n,
  // so the newest tree — the one still growing, or the withered one on a stopped session —
  // is always the nearest and can never be occluded by anything planted behind it.
  slots: PlotSlot[];
  cols: number;
  rows: number;
  minAcross: number;
  maxAcross: number;
  minDepth: number;
  maxDepth: number;
};

const EMPTY_PLOT: Plot = {
  slots: [],
  cols: 0,
  rows: 0,
  minAcross: 0,
  maxAcross: 0,
  minDepth: 0,
  maxDepth: 0,
};

// Cached per count — a session only ever asks for a handful of distinct counts, and the
// plot for a given count never changes.
const plotCache = new Map<number, Plot>();

// The design source's isometric packing: a square-ish plot of cols x rows cells, walked
// in depth order. `across` (i - j) is the horizontal axis, `depth` (i + j) runs away from
// the viewer; both are cell units, turned into pixels by the renderer.
//
// The plot grows as area rather than length — 3 trees is a 2x2 plot, 19 is 5x4 — which is
// what keeps tiles at full size for every preset instead of forcing a choice between
// shrinking trees and running out of band. The trade-off is deliberate: adding a tree can
// re-centre the ones already planted, once every five minutes, as the plot squares up.
export function plotForCount(count: number): Plot {
  if (count <= 0) return EMPTY_PLOT;

  const cached = plotCache.get(count);
  if (cached) return cached;

  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);

  const cells: PlotSlot[] = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      cells.push({ across: i - j, depth: i + j });
    }
  }
  cells.sort((a, b) => a.depth - b.depth || a.across - b.across);

  const slots = cells.slice(0, count);

  let minAcross = slots[0].across;
  let maxAcross = slots[0].across;
  for (const slot of slots) {
    if (slot.across < minAcross) minAcross = slot.across;
    if (slot.across > maxAcross) maxAcross = slot.across;
  }

  const plot: Plot = {
    slots,
    cols,
    rows,
    minAcross,
    maxAcross,
    // Sorted by depth ascending, so the bounds are just the ends of the list.
    minDepth: slots[0].depth,
    maxDepth: slots[slots.length - 1].depth,
  };

  plotCache.set(count, plot);
  return plot;
}
