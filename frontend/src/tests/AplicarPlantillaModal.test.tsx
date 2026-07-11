import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AplicarPlantillaModal from '../pages/ServicePortal/pages/HORAS_EXTRAS/PlantillasHorario/components/AplicarPlantillaModal';
import { listarEmpleadosOperativos } from '../services/horariosRelacionesService';

vi.mock('../services/horariosRelacionesService', () => ({
  listarEmpleadosOperativos: vi.fn(),
}));

const empleado = (cedula: string, nombre: string) => ({
  cedula,
  nombre,
  cargo: 'Operario',
  area: 'Operación',
  ciudadcontratacion: 'Bogotá',
  jefe: 'Jefe ERP',
  autoriza_he: true,
  disponible_semana: true,
  motivo_no_disponible: null,
});

describe('AplicarPlantillaModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (listarEmpleadosOperativos as ReturnType<typeof vi.fn>).mockImplementation(({ offset }: { offset: number }) => Promise.resolve({
      items: offset === 0 ? [empleado('10', 'Ana Uno')] : [empleado('20', 'Beto Dos')],
      total: 21,
      limit: 20,
      offset,
      facetas: {},
    }));
  });

  it('mantiene la selección por cédula entre páginas y confirma el lote', async () => {
    const onApply = vi.fn();
    render(
      <AplicarPlantillaModal
        open
        plantilla={{ id: 'p1', nombre: 'Nocturna', descripcion: null, version: 3, esta_activa: true, dias: [] }}
        guardando={false}
        onClose={() => undefined}
        onApply={onApply}
      />,
    );

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Seleccionar Ana Uno' }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Seleccionar Beto Dos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar a 2' }));

    expect(onApply).toHaveBeenCalledWith(['10', '20']);
    await waitFor(() => expect(listarEmpleadosOperativos).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 20 }), expect.any(AbortSignal)));
  });

  it('limita una selección masiva a 200 empleados y lo comunica', async () => {
    const onApply = vi.fn();
    (listarEmpleadosOperativos as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: Array.from({ length: 201 }, (_, index) => empleado(String(index + 1), `Empleado ${index + 1}`)),
      total: 201, limit: 100, offset: 0, facetas: {},
    });
    render(<AplicarPlantillaModal open plantilla={{ id: 'p1', nombre: 'Base', descripcion: null, version: 1, esta_activa: true, dias: [] }} guardando={false} onClose={() => undefined} onApply={onApply} />);
    await screen.findByRole('checkbox', { name: 'Seleccionar Empleado 1' });
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar página' }));
    expect(screen.getByText(/máximo de 200 empleados/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar a 200' }));
    expect(onApply.mock.calls[0][0]).toHaveLength(200);
  }, 15_000);
});
