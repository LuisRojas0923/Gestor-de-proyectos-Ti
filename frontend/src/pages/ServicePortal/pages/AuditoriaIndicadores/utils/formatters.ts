import type { ResultadoAuditoria } from '../../../../../types/auditoria';

const MODULOS: Record<string, string> = {
  auth: 'Control de acceso',
  auditoria_sistema: 'Seguridad y auditoría',
  desarrollos: 'Desarrollos',
  inventario: 'Inventario',
  requisiciones: 'Requisiciones',
  sistemas: 'Soporte de sistemas',
  viaticos: 'Gestión de viáticos',
};

const ACCIONES: Record<string, string> = {
  actualizar: 'Actualización',
  consultar: 'Consulta',
  crear: 'Creación',
  eliminar: 'Eliminación',
  exportar: 'Exportación',
  login: 'Inicio de sesión',
  logout: 'Cierre de sesión',
  otro: 'Otra acción',
};

export function humanizarModulo(modulo: string): string {
  const clave = modulo.toLowerCase();
  return MODULOS[clave] ?? modulo.replaceAll('_', ' ').replace(/\b\w/g, (letra) => letra.toUpperCase());
}

export function humanizarAccion(accion: string): string {
  const clave = accion.toLowerCase();
  return ACCIONES[clave] ?? accion.replaceAll('_', ' ').replace(/\b\w/g, (letra) => letra.toUpperCase());
}

export function formatearFechaAuditoria(timestamp: string | null): string {
  if (!timestamp) return 'Sin fecha';
  const fecha = new Date(timestamp);
  if (Number.isNaN(fecha.getTime())) return 'Fecha inválida';

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(fecha);
}

export function varianteResultado(resultado: ResultadoAuditoria): 'success' | 'warning' | 'error' {
  if (resultado === 'exito') return 'success';
  if (resultado === 'denegado') return 'warning';
  return 'error';
}

export function etiquetaResultado(resultado: ResultadoAuditoria): string {
  if (resultado === 'exito') return 'Éxito';
  if (resultado === 'denegado') return 'Denegado';
  return 'Fallo';
}
