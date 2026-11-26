/**
 * Which node is drawn above which (core-vis 0.10, `arch-vis:zOrder`; linked-archi-meta's DD-45): among the nodes drawn
 * in the same place — a view's top level, or the inside of one container — the higher zOrder above the lower; absent,
 * 0; the same, by IRI in code point order, the later above. A nested node is drawn above its container whatever
 * either's zOrder, so only nodes in the same place are compared.
 *
 * {@link reorder} brings nodes to the front or the back, or one step forward or backward. Drawing order matters only
 * between nodes that overlap, so a step goes past the next node a node overlaps, and keeps its order with every other
 * node it overlaps. It changes as few zOrders as it can: the moving nodes', and — where the numbers leave no room
 * between two nodes — the smaller of the two groups of nodes beside it, all by the same amount, so their order among
 * themselves stays.
 */

import type { Bounds } from './interfaces.js';

/** A node as its drawing order reads it. */
export interface OrderedNode {
  nodeIri: string;
  /** `arch-vis:zOrder`; absent, 0. */
  zOrder?: number;
  bounds: Bounds;
}

/** To the front, to the back, one step forward, one step backward. */
export type DrawingOrderChange = 'front' | 'back' | 'forward' | 'backward';

const codePoints = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** The drawing order of two nodes in the same place: negative when `a` is drawn below `b`. */
export function compareDrawingOrder(a: { nodeIri: string; zOrder?: number }, b: { nodeIri: string; zOrder?: number }): number {
  return (a.zOrder ?? 0) - (b.zOrder ?? 0) || codePoints(a.nodeIri, b.nodeIri);
}

/** The nodes, the lowest first, as they are drawn. */
export function sortByDrawingOrder<T extends { nodeIri: string; zOrder?: number }>(nodes: readonly T[]): T[] {
  return [...nodes].sort(compareDrawingOrder);
}

/** Whether two nodes cover some of the same area: touching edges do not. */
function overlaps(a: Bounds, b: Bounds): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/**
 * The zOrders that move the `moving` nodes among `siblings` — the nodes drawn in the same place, the moving ones among
 * them — by node IRI: only those that change, 0 meaning none is to be written. Front and back keep the moving nodes'
 * order among themselves. A step moves each moving node past the next node it overlaps that is not moving, if there is
 * one — the topmost first going forward, the lowest first going backward — and nothing else changes place among the
 * nodes it overlaps.
 */
export function reorder(siblings: readonly OrderedNode[], moving: ReadonlySet<string>, change: DrawingOrderChange): Map<string, number> {
  const z = new Map(siblings.map((n) => [n.nodeIri, n.zOrder ?? 0]));
  const sorted = () => [...siblings].sort((a, b) => compareDrawingOrder({ nodeIri: a.nodeIri, zOrder: z.get(a.nodeIri) }, { nodeIri: b.nodeIri, zOrder: z.get(b.nodeIri) }));
  const shift = (nodes: readonly OrderedNode[], by: number) => {
    for (const n of nodes) z.set(n.nodeIri, z.get(n.nodeIri)! + by);
  };

  if (change === 'front' || change === 'back') {
    const order = sorted();
    const moved = order.filter((n) => moving.has(n.nodeIri));
    const others = order.filter((n) => !moving.has(n.nodeIri));
    if (moved.length > 0 && others.length > 0) {
      const index = (n: OrderedNode) => order.indexOf(n);
      // Already there: above every other, or below.
      const there =
        change === 'front'
          ? Math.min(...moved.map(index)) > Math.max(...others.map(index))
          : Math.max(...moved.map(index)) < Math.min(...others.map(index));
      if (!there) {
        const values = others.map((n) => z.get(n.nodeIri)!);
        moved.forEach((n, i) =>
          z.set(n.nodeIri, change === 'front' ? Math.max(...values) + 1 + i : Math.min(...values) - moved.length + i),
        );
      }
    }
  } else {
    const forward = change === 'forward';
    const order = sorted().filter((n) => moving.has(n.nodeIri));
    for (const node of forward ? order.reverse() : order) {
      const now = sorted();
      const at = now.indexOf(node);
      const over = (n: OrderedNode) => n !== node && overlaps(n.bounds, node.bounds);
      // The node to step past, and the next the node overlaps beyond it, which it must stay this side of.
      const ahead = forward ? now.slice(at + 1) : now.slice(0, at).reverse();
      const t = ahead.findIndex((n) => over(n) && !moving.has(n.nodeIri));
      if (t < 0) continue;
      const target = ahead[t];
      const beyond = ahead.slice(t + 1).find(over);
      const zt = z.get(target.nodeIri)!;
      const step = forward ? 1 : -1;
      const wanted = { nodeIri: node.nodeIri, zOrder: zt + step };
      const fits = !beyond || compareDrawingOrder(wanted, { nodeIri: beyond.nodeIri, zOrder: z.get(beyond.nodeIri) }) * step < 0;
      if (fits) {
        z.set(node.nodeIri, zt + step);
        continue;
      }
      // No room between the target and the next beyond it: the target and what is on its side moved away from the
      // node, or what is beyond moved further — whichever group is smaller — two apart, the node between.
      const targetAt = now.indexOf(target);
      const beyondAt = now.indexOf(beyond);
      const behind = (forward ? now.slice(0, targetAt + 1) : now.slice(targetAt)).filter((n) => n !== node);
      const past = (forward ? now.slice(beyondAt) : now.slice(0, beyondAt + 1)).filter((n) => n !== node);
      if (past.length <= behind.length) {
        shift(past, 2 * step);
        z.set(node.nodeIri, zt + step);
      } else {
        shift(behind, -2 * step);
        z.set(node.nodeIri, zt - step);
      }
    }
  }

  const changes = new Map<string, number>();
  for (const n of siblings) {
    const value = z.get(n.nodeIri)!;
    if (value !== (n.zOrder ?? 0)) changes.set(n.nodeIri, value);
  }
  return changes;
}
