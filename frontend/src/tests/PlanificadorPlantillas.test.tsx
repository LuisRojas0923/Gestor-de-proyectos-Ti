import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SelectorPlantillaPlanificador from '../pages/ServicePortal/pages/HORAS_EXTRAS/components/SelectorPlantillaPlanificador';
import {
  crearOverridesDesdePlantilla,
  diasActivosDePlantilla,
} from '../pages/ServicePortal/pages/HORAS_EXTRAS/utils/planificadorPlantillas';
import { listarPlantillas } from '../services/horariosRelacionesService';
import type { PlanDiaIn } from '../types/horasExtrasPlanificador';
import type { PlantillaHorario } from '../types/horariosRelaciones';

vi.mock('../services/horariosRelacionesService', () => ({
  listarPlantillas: vi.fn(),
}));

const plantilla: PlantillaHorario = {
  id: 'tpl-yumbo',
  nombre: 'Yumbo',
  descripcion: null,
  version: 1,
  esta_activa: true,
  dias: [1, 2, 3, 4, 5, 6, 7].map((dia_semana) => ({
    dia_semana,
    hora_entrada: dia_semana <= 5 ? '06:00:00' : null,
    hora_salida: dia_semana <= 5 ? '14:00:00' : null,
    minutos_almuerzo: dia_semana <= 5 ? 30 : 0,
    cruza_medianoche: false,
  })),
};

const diasBase = (): PlanDiaIn[] => [1, 2, 3, 4, 5, 6, 7].map((dia_semana) => ({
  dia_semana,
  hora_entrada: '07:30',
  hora_salida: '17:00',
  minutos_almuerzo: 30,
  cruza_medianoche: false,
  novedades: dia_semana === 1 ? [{ codigo_novedad: 'INC', fecha_inicio: '2026-07-13', fecha_fin: '2026-07-13' }] : [],
  asignaciones_ot: dia_semana === 1 ? [{ orden: '1007', categoria_sub_indice: 'MANO DE OBRA', horas: 8 }] : [],
}));

describe('plantillas en el planificador semanal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (listarPlantillas as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [plantilla], total: 1, limit: 100, offset: 0,
    });
  });

  it('carga el desplegable y entrega la plantilla seleccionada al aplicar', async () => {
    const onAplicar = vi.fn();
    render(<SelectorPlantillaPlanificador disabled={false} onAplicar={onAplicar} />);

    await waitFor(() => expect(listarPlantillas).toHaveBeenCalledWith(
      { incluir_inactivas: false, limit: 100, offset: 0 },
      expect.any(AbortSignal),
    ));
    fireEvent.change(screen.getByRole('combobox', { name: 'Plantilla de horario' }), {
      target: { value: plantilla.id },
    });
    fireEvent.click(screen.getByRole('button', { name: /Aplicar plantilla/i }));

    expect(onAplicar).toHaveBeenCalledWith(plantilla);
  });

  it('aplica los siete dias y conserva novedades y asignaciones OT', () => {
    const plantillaNocturna: PlantillaHorario = {
      ...plantilla,
      dias: plantilla.dias.map((dia) => dia.dia_semana === 3
        ? { ...dia, hora_entrada: '22:00:00', hora_salida: '06:00:00', cruza_medianoche: true }
        : dia),
    };
    const actuales = diasBase();
    const noSeleccionado = diasBase();
    const resultado = crearOverridesDesdePlantilla(
      plantillaNocturna,
      new Set(['123']),
      new Map([['123', actuales], ['999', noSeleccionado]]),
      diasBase(),
    );

    expect(resultado.get('123')?.[0]).toMatchObject({
      hora_entrada: '06:00', hora_salida: '14:00', minutos_almuerzo: 30,
      novedades: actuales[0].novedades, asignaciones_ot: actuales[0].asignaciones_ot,
    });
    expect(resultado.get('123')?.[2]).toMatchObject({ hora_entrada: '22:00', hora_salida: '06:00', cruza_medianoche: true });
    expect(resultado.get('123')?.[5]).toMatchObject({ hora_entrada: null, hora_salida: null, minutos_almuerzo: 0 });
    expect(resultado.get('999')).toBe(noSeleccionado);
    expect([...diasActivosDePlantilla(plantilla)]).toEqual([1, 2, 3, 4, 5]);
  });

  it('permite reintentar cuando falla la carga inicial', async () => {
    (listarPlantillas as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('Servicio no disponible'))
      .mockResolvedValueOnce({ items: [plantilla], total: 1, limit: 100, offset: 0 });

    render(<SelectorPlantillaPlanificador disabled={false} onAplicar={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar carga de plantillas' }));
    await waitFor(() => expect(listarPlantillas).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('option', { name: 'Yumbo' })).toBeTruthy();
  });
});
