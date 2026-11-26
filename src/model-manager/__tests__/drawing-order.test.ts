/**
 * Drawing order (core-vis 0.10, `arch-vis:zOrder`; linked-archi-meta's DD-45): the order nodes in the same place are
 * drawn in, and the zOrders that bring nodes to the front or the back, or one step forward or backward.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { compareDrawingOrder, reorder, sortByDrawingOrder, type DrawingOrderChange, type OrderedNode } from '../drawing-order.js';

const node = (nodeIri: string, x: number, y: number, zOrder?: number): OrderedNode => ({
  nodeIri,
  ...(zOrder !== undefined ? { zOrder } : {}),
  bounds: { x, y, width: 100, height: 50 },
});
const order = (nodes: readonly OrderedNode[], changes = new Map<string, number>()) =>
  sortByDrawingOrder(nodes.map((n) => ({ ...n, zOrder: changes.get(n.nodeIri) ?? n.zOrder ?? 0 }))).map((n) => n.nodeIri);

describe('the drawing order', () => {
  it('the higher zOrder above; absent, 0; the same, by IRI in code point order', () => {
    const nodes = [node('b', 0, 0), node('a', 0, 0, 1), node('C', 0, 0), node('d', 0, 0, -1)];
    // "C" < "b" by code point, though not alphabetically.
    expect(order(nodes)).toEqual(['d', 'C', 'b', 'a']);
    expect(compareDrawingOrder({ nodeIri: 'x', zOrder: 0 }, { nodeIri: 'x' })).toBe(0);
  });
});

describe('reorder', () => {
  // Three overlapping nodes, none with a zOrder: drawn a, b, c from the bottom.
  const stack = [node('a', 0, 0), node('b', 20, 10), node('c', 40, 20)];

  it('to the front: one more than the highest of the others; already there, nothing', () => {
    const changes = reorder(stack, new Set(['a']), 'front');
    expect([...changes]).toEqual([['a', 1]]);
    expect(order(stack, changes)).toEqual(['b', 'c', 'a']);
    expect(reorder(stack, new Set(['c']), 'front').size).toBe(0);
  });

  it('to the back: one less than the lowest; several keep their order among themselves', () => {
    const changes = reorder(stack, new Set(['b', 'c']), 'back');
    expect(order(stack, changes)).toEqual(['b', 'c', 'a']);
    expect(reorder(stack, new Set(['a']), 'back').size).toBe(0);
  });

  it('one step forward: past the next node it overlaps, and no further', () => {
    const changes = reorder(stack, new Set(['a']), 'forward');
    expect(order(stack, changes)).toEqual(['b', 'a', 'c']);
    // Where the numbers leave no room, the smaller group moves: here c alone, above.
    expect(changes.get('c')).toBe(2);
    expect(changes.has('b')).toBe(false);
  });

  it('one step backward; a node it does not overlap is passed over, not counted as a step', () => {
    const far = node('far', 500, 500);
    const nodes = [...stack, far];
    expect(order(nodes, reorder(nodes, new Set(['c']), 'backward'))).toEqual(['a', 'c', 'b', 'far']);
    // Nothing it overlaps above: nothing changes.
    expect(reorder(nodes, new Set(['far']), 'forward').size).toBe(0);
  });

  it('where the nodes beyond are more, the target and what is below it move down instead', () => {
    const tall = [node('a', 0, 0), node('b', 10, 5), node('c', 20, 10), node('d', 30, 15), node('e', 40, 20)];
    const changes = reorder(tall, new Set(['a']), 'forward');
    expect([...changes].sort()).toEqual([
      ['a', -1],
      ['b', -2],
    ]);
    expect(order(tall, changes)).toEqual(['b', 'a', 'c', 'd', 'e']);
    // The same backward, from the top.
    expect(order(tall, reorder(tall, new Set(['e']), 'backward'))).toEqual(['a', 'b', 'c', 'e', 'd']);
  });

  it('a step keeps to its value where there is room: only the node changes', () => {
    const spread = [node('a', 0, 0, 0), node('b', 20, 10, 5), node('c', 40, 20, 10)];
    expect([...reorder(spread, new Set(['a']), 'forward')]).toEqual([['a', 6]]);
  });

  it('a step never passes another moving node', () => {
    expect(order(stack, reorder(stack, new Set(['a', 'b']), 'forward'))).toEqual(['c', 'a', 'b']);
  });

  // Random places in one container, random zOrders, a random node moved.
  const arbitraryNodes = fc
    .array(
      fc.record({
        x: fc.integer({ min: 0, max: 300 }),
        y: fc.integer({ min: 0, max: 300 }),
        zOrder: fc.option(fc.integer({ min: -3, max: 3 }), { nil: undefined }),
      }),
      { minLength: 2, maxLength: 9 },
    )
    .map((places) => places.map((p, i) => node(`n${i}`, p.x, p.y, p.zOrder)));
  const overlap = (a: OrderedNode, b: OrderedNode) =>
    a.bounds.x < b.bounds.x + b.bounds.width && b.bounds.x < a.bounds.x + a.bounds.width && a.bounds.y < b.bounds.y + b.bounds.height && b.bounds.y < a.bounds.y + a.bounds.height;

  it('a step swaps the node with the one it passes, and no other two that overlap change places', () => {
    fc.assert(
      fc.property(arbitraryNodes, fc.nat(), fc.constantFrom<DrawingOrderChange>('forward', 'backward'), (nodes, pick, change) => {
        const moved = nodes[pick % nodes.length];
        const before = order(nodes);
        const after = order(nodes, reorder(nodes, new Set([moved.nodeIri]), change));
        const above = (o: string[], a: string, b: string) => o.indexOf(a) > o.indexOf(b);
        const passed = nodes.filter((n) => n !== moved && overlap(n, moved) && above(before, n.nodeIri, moved.nodeIri) !== above(after, n.nodeIri, moved.nodeIri));
        // At most the one it steps past, the next it overlaps that way.
        expect(passed.length).toBeLessThanOrEqual(1);
        if (passed.length === 1) {
          const way = (n: OrderedNode) => (change === 'forward' ? before.indexOf(n.nodeIri) - before.indexOf(moved.nodeIri) : before.indexOf(moved.nodeIri) - before.indexOf(n.nodeIri));
          const nearest = nodes.filter((n) => n !== moved && overlap(n, moved) && way(n) > 0).sort((a, b) => way(a) - way(b))[0];
          expect(passed[0]).toBe(nearest);
        }
        for (const a of nodes) {
          for (const b of nodes) {
            if (a === b || a === moved || b === moved || !overlap(a, b)) continue;
            expect(above(after, a.nodeIri, b.nodeIri)).toBe(above(before, a.nodeIri, b.nodeIri));
          }
        }
      }),
      { numRuns: 500 },
    );
  });

  it('to the front or the back: the moving above or below every other, each group keeping its order', () => {
    fc.assert(
      fc.property(arbitraryNodes, fc.array(fc.nat(), { minLength: 1, maxLength: 4 }), fc.constantFrom<DrawingOrderChange>('front', 'back'), (nodes, picks, change) => {
        const moving = new Set(picks.map((p) => nodes[p % nodes.length].nodeIri));
        const before = order(nodes);
        const after = order(nodes, reorder(nodes, moving, change));
        const kept = (keep: (iri: string) => boolean) => expect(after.filter(keep)).toEqual(before.filter(keep));
        kept((iri) => moving.has(iri));
        kept((iri) => !moving.has(iri));
        const ends = change === 'front' ? after.slice(after.length - moving.size) : after.slice(0, moving.size);
        expect(new Set(ends)).toEqual(moving);
      }),
      { numRuns: 300 },
    );
  });
});
