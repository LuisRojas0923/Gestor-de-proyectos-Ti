import React from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IndicatorsVolumeView from '../pages/Indicators/IndicatorsVolumeView';

const responsiveContainerDimensions = vi.hoisted(() => [] as Array<{ width: number; height: number } | undefined>);

vi.mock('recharts', () => {
  const EmptyChart = () => null;

  return {
    BarChart: EmptyChart,
    Bar: EmptyChart,
    XAxis: EmptyChart,
    YAxis: EmptyChart,
    CartesianGrid: EmptyChart,
    Tooltip: EmptyChart,
    Cell: EmptyChart,
    PieChart: EmptyChart,
    Pie: EmptyChart,
    Sector: EmptyChart,
    ResponsiveContainer: ({
      children,
      initialDimension,
    }: {
      children?: React.ReactNode;
      initialDimension?: { width: number; height: number };
    }) => {
      responsiveContainerDimensions.push(initialDimension);
      return <>{children}</>;
    },
  };
});

describe('IndicatorsVolumeView', () => {
  beforeEach(() => {
    responsiveContainerDimensions.length = 0;
  });

  it('inicializa sus cuatro graficas con dimensiones positivas', () => {
    render(
      <IndicatorsVolumeView
        causaStats={[{ causa: 'Software', cantidad: 4, porcentaje: 40 }]}
        areaStats={[{ area: 'TI', cantidad: 4 }]}
        analistaStats={[{ name: 'Analista', porcentaje: 100, esta_activo: true }]}
        matriz={[]}
        headers={[]}
        prioridadStats={{ Alta: 1, Media: 2, Baja: 1 }}
      />,
    );

    expect(responsiveContainerDimensions).toEqual([
      { width: 1, height: 250 },
      { width: 1, height: 250 },
      { width: 1, height: 350 },
      { width: 1, height: 350 },
    ]);
  });
});
