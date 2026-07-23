import { describe, expect, it } from 'vitest';
import {
  etiquetaResultado,
  formatearFechaAuditoria,
  humanizarAccion,
  humanizarModulo,
  varianteResultado,
} from './formatters';

describe('formatters de auditoría', () => {
  it('humaniza módulos y acciones conocidas', () => {
    expect(humanizarModulo('auditoria_sistema')).toBe('Seguridad y auditoría');
    expect(humanizarAccion('actualizar')).toBe('Actualización');
  });

  it('mantiene un fallback legible para valores desconocidos', () => {
    expect(humanizarModulo('modulo_nuevo')).toBe('Modulo Nuevo');
    expect(humanizarAccion('accion_nueva')).toBe('Accion Nueva');
  });

  it('formatea fechas válidas y controla valores ausentes', () => {
    expect(formatearFechaAuditoria(null)).toBe('Sin fecha');
    expect(formatearFechaAuditoria('fecha-invalida')).toBe('Fecha inválida');
    expect(formatearFechaAuditoria('2026-07-23T12:00:00Z')).toContain('23');
  });

  it('asigna etiquetas y variantes consistentes al resultado', () => {
    expect(varianteResultado('exito')).toBe('success');
    expect(varianteResultado('denegado')).toBe('warning');
    expect(varianteResultado('fallo')).toBe('error');
    expect(etiquetaResultado('denegado')).toBe('Denegado');
  });
});
