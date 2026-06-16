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
} from '../services/horasExtrasService';
import { API_CONFIG } from '../config/api';
import type { PreLiquidacionInput, PreLiquidacionConfirmar } from '../types/horasExtras';

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
});
