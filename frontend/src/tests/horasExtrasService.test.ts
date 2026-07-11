/**
 * Tests del cliente HTTP del módulo Horas Extras.
 *
 * Estrategia: stub global de `fetch` para validar que el servicio
 * construye URLs, headers y payloads correctos, y maneja errores
 * del backend (FastAPI devuelve `{detail: ...}` en 4xx/5xx).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  listarCatalogo,
  obtenerHorario,
  obtenerAutorizacionEfectiva,
  ejecutarPreLiquidacion,
  confirmarPreLiquidacion,
  obtenerBolsa,
  listarCalculos,
  obtenerCalculo,
  listarCostosOt,
  obtenerHistorial,
  listarNovedades,
  crearNovedad,
  obtenerNovedad,
  actualizarNovedad,
  confirmarNovedad,
  anularNovedad,
  obtenerHorarioSemana,
  actualizarHorarioSemana,
} from '../services/horasExtrasService';
import { API_CONFIG } from '../config/api';
import type {
  PreLiquidacionInput,
  PreLiquidacionConfirmar,
  HorarioPactadoDiaUpdate,
} from '../types/horasExtras';

const BASE = `${API_CONFIG.BASE_URL}/novedades-nomina/horas-extras`;
const TOKEN = 'fake-token-123';

function mockJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('horasExtrasService', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // -------------------------------------------------------------------------
  // Catálogo
  // -------------------------------------------------------------------------

  describe('listarCatalogo', () => {
    it('construye query con filtros activos', async () => {
      fetchMock.mockResolvedValueOnce(mockJsonResponse([]));
      await listarCatalogo(
        { categoria: 'HORA_EXTRA', solo_acreditan_bolsa: true, fecha: '2026-06-15' },
        TOKEN,
      );

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE}/catalogo?categoria=HORA_EXTRA&solo_acreditan_bolsa=true&fecha=2026-06-15`);
      expect(init.method).toBeUndefined(); // GET por default
      expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
    });

    it('omite filtros vacíos de la query', async () => {
      fetchMock.mockResolvedValueOnce(mockJsonResponse([]));
      await listarCatalogo({}, TOKEN);
      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE}/catalogo`);
    });
  });

  // -------------------------------------------------------------------------
  // Horario y autorización
  // -------------------------------------------------------------------------

  describe('obtenerHorario', () => {
    it('codifica la cédula en la URL', async () => {
      fetchMock.mockResolvedValueOnce(mockJsonResponse(null));
      await obtenerHorario('123 456', TOKEN);
      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE}/horario/123%20456`);
    });
  });

  describe('obtenerAutorizacionEfectiva', () => {
    it('apunta a /autorizacion/{cedula}', async () => {
      fetchMock.mockResolvedValueOnce(
        mockJsonResponse({
          cedula: '1', autoriza_he: true, fuente: 'ERP',
          horas_semana_ordinaria: 48, minutos_jornada_ordinaria: 480,
          es_jornada_nocturna: false,
        }),
      );
      const r = await obtenerAutorizacionEfectiva('1', TOKEN);
      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE}/autorizacion/1`);
      expect(r.fuente).toBe('ERP');
    });
  });

  // -------------------------------------------------------------------------
  // Pre-liquidación
  // -------------------------------------------------------------------------

  describe('ejecutarPreLiquidacion', () => {
    it('envía POST con body JSON', async () => {
      fetchMock.mockResolvedValueOnce(mockJsonResponse({}));
      const input: PreLiquidacionInput = {
        cedula: '123',
        anio: 2026,
        semana_iso: 25,
        horas_por_dia: [8, 8, 8, 8, 8, 8, 8],
        es_jornada_nocturna: false,
        salario_base_mensual: 3_000_000,
        nivel_riesgo_arl: 'III',
      };
      await ejecutarPreLiquidacion(input, TOKEN);

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE}/pre-liquidacion`);
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body as string)).toEqual(input);
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });
  });

  describe('confirmarPreLiquidacion', () => {
    it('apunta a /pre-liquidacion/confirmar con método POST', async () => {
      fetchMock.mockResolvedValueOnce(
        mockJsonResponse({
          calculo_id: 1, bolsa_id: null, horas_acreditadas_bolsa: 0,
          movimientos_bolsa: [], costo_ot_id: null, mensaje: 'ok',
        }),
      );
      const payload: PreLiquidacionConfirmar = {
        cedula: '123', anio: 2026, semana_iso: 25,
        fecha_inicio: '2026-06-16', fecha_fin: '2026-06-22',
        nivel_riesgo_arl: 'III', factor_prestacional: 0.52436,
        salario_base_mensual: 3_000_000, valor_hora_ordinaria: 12_500,
        detalles: [],
        usuario_confirma: '123',
      };
      const r = await confirmarPreLiquidacion(payload, TOKEN);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE}/pre-liquidacion/confirmar`);
      expect(init.method).toBe('POST');
      expect(r.calculo_id).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Bolsa
  // -------------------------------------------------------------------------

  describe('obtenerBolsa', () => {
    it('apunta a /bolsa/{cedula}', async () => {
      fetchMock.mockResolvedValueOnce(
        mockJsonResponse({
          cedula: '1', horas_acreditadas: 0, horas_consumidas: 0,
          horas_pagadas: 0, horas_disponibles: 0,
        }),
      );
      await obtenerBolsa('1', TOKEN);
      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE}/bolsa/1`);
    });
  });

  // -------------------------------------------------------------------------
  // Cálculos
  // -------------------------------------------------------------------------

  describe('listarCalculos', () => {
    it('construye query con filtros', async () => {
      fetchMock.mockResolvedValueOnce(mockJsonResponse([]));
      await listarCalculos(
        { cedula: '1', anio: 2026, semana_iso: 25, estado: 'CONFIRMADO', limit: 10 },
        TOKEN,
      );
      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `${BASE}/calculos?cedula=1&anio=2026&semana_iso=25&estado=CONFIRMADO&limit=10`,
      );
    });
  });

  describe('obtenerCalculo', () => {
    it('apunta a /calculos/{id}', async () => {
      fetchMock.mockResolvedValueOnce(mockJsonResponse({ id: 42 }));
      const r = await obtenerCalculo(42, TOKEN);
      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE}/calculos/42`);
      expect(r.id).toBe(42);
    });
  });

  // -------------------------------------------------------------------------
  // Costos OT
  // -------------------------------------------------------------------------

  describe('listarCostosOt', () => {
    it('construye query con filtros', async () => {
      fetchMock.mockResolvedValueOnce(mockJsonResponse([]));
      await listarCostosOt(
        { ot_id: 100, ot_codigo: 'OT-1', anio: 2026, semana_iso: 25 },
        TOKEN,
      );
      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `${BASE}/costos-ot?ot_id=100&ot_codigo=OT-1&anio=2026&semana_iso=25`,
      );
    });
  });

  // -------------------------------------------------------------------------
  // Manejo de errores
  // -------------------------------------------------------------------------

  describe('manejo de errores', () => {
    it('extrae detail del JSON de error de FastAPI', async () => {
      fetchMock.mockResolvedValueOnce(
        mockJsonResponse({ detail: 'Ya existe un cálculo para esta semana' }, 409),
      );
      await expect(obtenerCalculo(1, TOKEN)).rejects.toThrow(
        'Ya existe un cálculo para esta semana',
      );
    });

    it('usa el texto crudo si la respuesta no es JSON', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response('Bad Gateway', { status: 502 }),
      );
      await expect(obtenerCalculo(1, TOKEN)).rejects.toThrow('Bad Gateway');
    });

    it('incluye status code si la respuesta está vacía', async () => {
      fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }));
      await expect(obtenerCalculo(1, TOKEN)).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // S4 — Workflow de estados
  // -------------------------------------------------------------------------

  describe('obtenerHistorial', () => {
    it('GET a /calculos/{id}/historial', async () => {
      fetchMock.mockResolvedValueOnce(
        mockJsonResponse([
          {
            id: 1,
            calculo_id: 5,
            estado_origen: 'CONFIRMADO',
            estado_destino: 'PAGADO',
            justificacion: 'ok',
            usuario_id: 'u1',
            created_at: '2026-07-22T10:00:00',
          },
        ]),
      );
      const r = await obtenerHistorial(5, TOKEN);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE}/calculos/5/historial`);
      expect(init.method).toBeUndefined();
      expect(r).toHaveLength(1);
      expect(r[0].estado_destino).toBe('PAGADO');
    });
  });

  // -------------------------------------------------------------------------
  // S4 — Compensar bolsa directa
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // S5' — Festivos
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // S5 — Novedades (AUS / LIC / VAC / INC)
  // -------------------------------------------------------------------------

  describe('listarNovedades', () => {
    it('construye query con filtros activos', async () => {
      fetchMock.mockResolvedValueOnce(
        mockJsonResponse({ items: [], total: 0, limit: 100, offset: 0 }),
      );
      await listarNovedades(
        { cedula: '1107068093', codigo: 'LIC', estado: 'CONFIRMADO', limit: 50 },
        TOKEN,
      );
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `${BASE}/novedades?cedula=1107068093&codigo=LIC&estado=CONFIRMADO&limit=50`,
      );
      expect(init.method).toBeUndefined();
    });

    it('omite filtros vacíos', async () => {
      fetchMock.mockResolvedValueOnce(
        mockJsonResponse({ items: [], total: 0, limit: 100, offset: 0 }),
      );
      await listarNovedades({}, TOKEN);
      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE}/novedades`);
    });
  });

  describe('crearNovedad', () => {
    it('POST a /novedades con payload y devuelve id+estado', async () => {
      fetchMock.mockResolvedValueOnce(
        mockJsonResponse({
          id: 10,
          cedula: '1107068093',
          codigo_novedad: 'LIC',
          fecha_inicio: '2026-07-01',
          fecha_fin: '2026-07-05',
          observaciones: 'Vacaciones',
          estado: 'BORRADOR',
          created_at: null, created_by: null,
          updated_at: null, updated_by: null,
          confirmado_at: null, confirmado_by: null,
          anulado_at: null, anulado_justificacion: null,
        }),
      );
      const r = await crearNovedad(
        {
          cedula: '1107068093',
          codigo_novedad: 'LIC',
          fecha_inicio: '2026-07-01',
          fecha_fin: '2026-07-05',
          observaciones: 'Vacaciones',
        },
        TOKEN,
      );
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE}/novedades`);
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body as string).codigo_novedad).toBe('LIC');
      expect(r.id).toBe(10);
      expect(r.estado).toBe('BORRADOR');
    });
  });

  describe('obtenerNovedad', () => {
    it('GET a /novedades/{id}', async () => {
      fetchMock.mockResolvedValueOnce(
        mockJsonResponse({
          id: 7, cedula: '1', codigo_novedad: 'VAC',
          fecha_inicio: '2026-08-01', fecha_fin: '2026-08-03',
          observaciones: null, estado: 'CONFIRMADO',
          created_at: null, created_by: null,
          updated_at: null, updated_by: null,
          confirmado_at: '2026-07-30T10:00:00', confirmado_by: 'u1',
          anulado_at: null, anulado_justificacion: null,
        }),
      );
      const r = await obtenerNovedad(7, TOKEN);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE}/novedades/7`);
      expect(init.method).toBeUndefined();
      expect(r.estado).toBe('CONFIRMADO');
    });
  });

  describe('actualizarNovedad', () => {
    it('PATCH a /novedades/{id} con payload parcial', async () => {
      fetchMock.mockResolvedValueOnce(
        mockJsonResponse({
          id: 7, cedula: '1', codigo_novedad: 'VAC',
          fecha_inicio: '2026-08-01', fecha_fin: '2026-08-03',
          observaciones: 'cambiado', estado: 'BORRADOR',
          created_at: null, created_by: null,
          updated_at: '2026-07-29T10:00:00', updated_by: 'u1',
          confirmado_at: null, confirmado_by: null,
          anulado_at: null, anulado_justificacion: null,
        }),
      );
      const r = await actualizarNovedad(
        7,
        { observaciones: 'cambiado' },
        TOKEN,
      );
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE}/novedades/7`);
      expect(init.method).toBe('PATCH');
      expect(JSON.parse(init.body as string).observaciones).toBe('cambiado');
      expect(r.observaciones).toBe('cambiado');
    });
  });

  describe('confirmarNovedad', () => {
    it('POST a /novedades/{id}/confirmar', async () => {
      fetchMock.mockResolvedValueOnce(
        mockJsonResponse({
          id: 7, cedula: '1', codigo_novedad: 'VAC',
          fecha_inicio: '2026-08-01', fecha_fin: '2026-08-03',
          observaciones: null, estado: 'CONFIRMADO',
          created_at: null, created_by: null,
          updated_at: null, updated_by: null,
          confirmado_at: '2026-07-30T10:00:00', confirmado_by: 'u1',
          anulado_at: null, anulado_justificacion: null,
        }),
      );
      const r = await confirmarNovedad(7, TOKEN);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE}/novedades/7/confirmar`);
      expect(init.method).toBe('POST');
      expect(r.estado).toBe('CONFIRMADO');
    });
  });

  describe('anularNovedad', () => {
    it('POST a /novedades/{id}/anular con justificación', async () => {
      fetchMock.mockResolvedValueOnce(
        mockJsonResponse({
          id: 7, cedula: '1', codigo_novedad: 'VAC',
          fecha_inicio: '2026-08-01', fecha_fin: '2026-08-03',
          observaciones: null, estado: 'ANULADO',
          created_at: null, created_by: null,
          updated_at: null, updated_by: null,
          confirmado_at: null, confirmado_by: null,
          anulado_at: '2026-07-30T11:00:00',
          anulado_justificacion: 'error de captura',
        }),
      );
      const r = await anularNovedad(
        7,
        { justificacion: 'error de captura' },
        TOKEN,
      );
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE}/novedades/7/anular`);
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body as string).justificacion).toBe('error de captura');
      expect(r.estado).toBe('ANULADO');
      expect(r.anulado_justificacion).toBe('error de captura');
    });

    it('propaga error 422 cuando justificación es corta', async () => {
      fetchMock.mockResolvedValueOnce(
        mockJsonResponse({ detail: 'justificacion: ensure this value has at least 5 characters' }, 422),
      );
      await expect(
        anularNovedad(7, { justificacion: 'x' }, TOKEN),
      ).rejects.toThrow(/justificacion/);
    });
  });

  // -------------------------------------------------------------------------
  // S5'' — Horario semanal editable
  // -------------------------------------------------------------------------

  describe('obtenerHorarioSemana', () => {
    it('GET a /horario/{cedula}/semana y devuelve 7 días (5 laborales + 2 francos)', async () => {
      fetchMock.mockResolvedValueOnce(
        mockJsonResponse({
          cedula: '1107068093',
          dias: [
            { dia_semana: 1, hora_entrada: '07:30:00', hora_salida: '17:00:00', minutos_almuerzo: 30 },
            { dia_semana: 2, hora_entrada: '07:30:00', hora_salida: '17:00:00', minutos_almuerzo: 30 },
            { dia_semana: 3, hora_entrada: '07:30:00', hora_salida: '17:00:00', minutos_almuerzo: 30 },
            { dia_semana: 4, hora_entrada: '07:30:00', hora_salida: '17:00:00', minutos_almuerzo: 30 },
            { dia_semana: 5, hora_entrada: '07:30:00', hora_salida: '17:30:00', minutos_almuerzo: 30 },
            { dia_semana: 6, hora_entrada: null, hora_salida: null, minutos_almuerzo: 0 },
            { dia_semana: 7, hora_entrada: null, hora_salida: null, minutos_almuerzo: 0 },
          ],
        }),
      );
      const r = await obtenerHorarioSemana('1107068093', TOKEN);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE}/horario/1107068093/semana`);
      expect(init.method).toBeUndefined();
      expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
      expect(r.dias).toHaveLength(7);
      expect(r.dias[5].hora_entrada).toBeNull();
      expect(r.dias[6].hora_salida).toBeNull();
    });

    it('codifica la cédula en la URL', async () => {
      fetchMock.mockResolvedValueOnce(
        mockJsonResponse({ cedula: '1 2 3', dias: [] }),
      );
      await obtenerHorarioSemana('1 2 3', TOKEN);
      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE}/horario/1%202%203/semana`);
    });
  });

  describe('actualizarHorarioSemana', () => {
    const buildDias = (): HorarioPactadoDiaUpdate[] =>
      [1, 2, 3, 4, 5].map((d) => ({
        dia_semana: d,
        hora_entrada: '07:30:00',
        hora_salida: d === 5 ? '17:30:00' : '17:00:00',
        minutos_almuerzo: 30,
        cruza_medianoche: false,
      })).concat([
        { dia_semana: 6, hora_entrada: null, hora_salida: null, minutos_almuerzo: 0, cruza_medianoche: false },
        { dia_semana: 7, hora_entrada: null, hora_salida: null, minutos_almuerzo: 0, cruza_medianoche: false },
      ]);

    it('PUT a /horario/{cedula}/semana con 7 días en el body', async () => {
      fetchMock.mockResolvedValueOnce(
        mockJsonResponse({ cedula: '1107068093', dias: [] }),
      );
      const dias = buildDias();
      await actualizarHorarioSemana('1107068093', dias, TOKEN);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE}/horario/1107068093/semana`);
      expect(init.method).toBe('PUT');
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
      const body = JSON.parse(init.body as string);
      expect(body.dias).toHaveLength(7);
      expect(body.dias[4].hora_salida).toBe('17:30:00');
      expect(body.dias[5].hora_entrada).toBeNull();
    });

    it('propaga error 422 cuando los días no son 7', async () => {
      fetchMock.mockResolvedValueOnce(
        mockJsonResponse(
          { detail: 'dias: List should have at least 7 items after validation, not 5' },
          422,
        ),
      );
      await expect(
        actualizarHorarioSemana('1', buildDias().slice(0, 5), TOKEN),
      ).rejects.toThrow(/at least 7 items/);
    });
  });
});
