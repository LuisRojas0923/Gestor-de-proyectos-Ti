import React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fitView = vi.fn();
const setCenter = vi.fn();

vi.mock('@xyflow/react', () => ({
  Background: () => null,
  Controls: () => null,
  Handle: () => null,
  MiniMap: () => null,
  Position: { Top: 'top', Bottom: 'bottom' },
  ReactFlow: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useEdgesState: vi.fn(),
  useNodesState: vi.fn(),
  useReactFlow: () => ({ fitView, setCenter }),
}));

import { FlowWithFitView } from '../OrganizationalHierarchy';

describe('FlowWithFitView', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fitView.mockReset();
    setCenter.mockReset();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 });
  });

  afterEach(() => vi.useRealTimers());

  it('centra una vez con zoom móvil y confirma la limpieza', () => {
    const onCentered = vi.fn();
    render(
      <FlowWithFitView
        nodes={[{
          id: 'director',
          position: { x: 10, y: 20 },
          data: {} as never,
        }]}
        edges={[]}
        onNodesChange={vi.fn()}
        onEdgesChange={vi.fn()}
        nodeTypes={{} as never}
        selectedDirectors={[]}
        nodeToCenter="director"
        onCentered={onCentered}
      />,
    );

    act(() => vi.advanceTimersByTime(100));

    expect(setCenter).toHaveBeenCalledOnce();
    expect(setCenter).toHaveBeenCalledWith(125, 52.5, { duration: 800, zoom: 0.7 });
    expect(onCentered).toHaveBeenCalledOnce();
  });
});
