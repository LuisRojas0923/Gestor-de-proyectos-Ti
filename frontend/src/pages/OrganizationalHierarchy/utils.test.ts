import { describe, expect, it } from 'vitest';
import type { Edge, Node } from '@xyflow/react';
import { getCenterZoom, getLayoutedElements, isNodeExpanded, nodeHeight, nodeWidth } from './utils';

describe('utilidades del organigrama', () => {
  it('expande inicialmente niveles 0 y 1 y respeta cambios manuales', () => {
    expect(isNodeExpanded({}, 'raiz', 0)).toBe(true);
    expect(isNodeExpanded({}, 'director', 1)).toBe(true);
    expect(isNodeExpanded({}, 'coordinador', 2)).toBe(false);
    expect(isNodeExpanded({ director: false }, 'director', 1)).toBe(false);
    expect(isNodeExpanded({ coordinador: true }, 'coordinador', 2)).toBe(true);
  });

  it('usa zoom adaptativo para móvil y escritorio', () => {
    expect(getCenterZoom(375)).toBe(0.7);
    expect(getCenterZoom(1024)).toBe(1);
  });

  it('calcula cada layout con dimensiones actuales y sin estado residual', () => {
    const firstNodes: Node[] = [
      { id: 'a', position: { x: 0, y: 0 }, data: {} },
      { id: 'b', position: { x: 0, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [{ id: 'a-b', source: 'a', target: 'b' }];
    const standaloneBefore = getLayoutedElements(
      [{ id: 'c', position: { x: 0, y: 0 }, data: {} }],
      [],
    );
    getLayoutedElements(firstNodes, edges);

    const second = getLayoutedElements(
      [{ id: 'c', position: { x: 0, y: 0 }, data: {} }],
      [],
    );

    expect(nodeWidth).toBe(230);
    expect(nodeHeight).toBe(65);
    expect(second.nodes).toHaveLength(1);
    expect(second.nodes[0].id).toBe('c');
    expect(second.nodes[0].style).toMatchObject({ width: '230px' });
    expect(second.nodes[0].position).toEqual(standaloneBefore.nodes[0].position);
  });
});
