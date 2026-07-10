import * as dagre from 'dagre';
import { Edge, Position } from '@xyflow/react';
import type { Node as FlowNode } from '@xyflow/react';

export const nodeWidth = 230;
export const nodeHeight = 65;

export const isNodeExpanded = (
  toggledNodes: Record<string, boolean>,
  nodeId: string,
  level: number,
) => toggledNodes[nodeId] ?? level <= 1;

export const getCenterZoom = (viewportWidth: number) => viewportWidth < 640 ? 0.7 : 1;

export const getLayoutedElements = (nodes: FlowNode[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 20, // Reducido para compactar horizontalmente
    ranksep: 40, // Reducido para compactar verticalmente
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  // Post-procesamiento para alinear verticalmente cadenas simples (padres con un único hijo directo)
  const parentToChildren = new Map<string, string[]>();
  edges.forEach((edge) => {
    if (!parentToChildren.has(edge.source)) {
      parentToChildren.set(edge.source, []);
    }
    parentToChildren.get(edge.source)!.push(edge.target);
  });

  let changed = true;
  let safety = 0;
  while (changed && safety < 10) {
    changed = false;
    nodes.forEach((node) => {
      const children = parentToChildren.get(node.id) || [];
      if (children.length === 1) {
        const childId = children[0];
        const dagreNode = dagreGraph.node(node.id);
        const dagreChild = dagreGraph.node(childId);
        if (dagreNode && dagreChild && dagreNode.x !== dagreChild.x) {
          dagreNode.x = dagreChild.x;
          changed = true;
        }
      }
    });
    safety++;
  }

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
      style: {
        width: `${nodeWidth}px`,
      }
    };
  });

  return { nodes: newNodes, edges };
};

export const getInitials = (name: string) => {
  const parts = name.trim().split(' ');
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const formatShortName = (fullName: string) => {
  if (!fullName) return '';
  if (fullName.startsWith('[VACANTE]')) return fullName;
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  
  // Formato ERP: APELLIDO1 APELLIDO2 NOMBRE1 [NOMBRE2]
  if (parts.length === 3) {
    return `${parts[2]} ${parts[0]}`;
  } else if (parts.length >= 4) {
    return `${parts[2]} ${parts[0]}`;
  }
  return `${parts[1]} ${parts[0]}`;
};
