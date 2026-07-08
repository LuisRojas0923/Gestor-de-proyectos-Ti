/**
 * Utilidad para humanizar e interpretar términos técnicos del log de auditoría
 * convirtiéndolos en descripciones en español comprensibles para personas no técnicas.
 */

const MODULOS_MAP: Record<string, string> = {
  'auth': 'Control de Acceso',
  'service-portal': 'Portal de Servicios TI',
  'mis_solicitudes': 'Gestión de Solicitudes',
  'reserva_salas': 'Reserva de Salas',
  'reserva-salas': 'Reserva de Salas',
  'requisiciones': 'Compras Corporativas',
  'requisiciones.almacen': 'Almacén de TI',
  'requisiciones.presupuesto': 'Aprobaciones de Presupuesto',
  'viaticos_gestion': 'Legalización de Viáticos',
  'viaticos_estado': 'Estados de Cuenta',
  'viaticos': 'Gestión de Viáticos',
  'sistemas': 'Soporte Técnico de Sistemas',
  'mejoramiento': 'Mejoramiento Continuo',
  'desarrollo': 'Software Factory (Desarrollo)',
  'chat': 'Asistente Virtual IA',
  'gestion_humana': 'Gestión Humana',
  'auditoria_sistema': 'Seguridad y Auditoría',
  'biometria': 'Asistencia Facial / Biometría',
  'biometria_db': 'Base de Datos Biométrica',
  'impuestos': 'Gestión Tributaria y Retenciones',
  'comisiones': 'Nómina: Comisiones'
};

const ACCIONES_MAP: Record<string, string> = {
  'login': 'Ingresó al sistema',
  'logout': 'Salió del sistema',
  'crear': 'Creó un nuevo registro',
  'actualizar': 'Modificó información',
  'eliminar': 'Eliminó un registro (Sensible)',
  'consultar': 'Consultó información',
  'exportar': 'Descargó reporte / datos',
  'otro': 'Operación en el sistema'
};

/**
 * Traduce un nombre de módulo técnico
 */
export const humanizarModulo = (modulo: string | null | undefined): string => {
  if (!modulo) return 'Módulo General';
  const clean = modulo.trim().toLowerCase();
  return MODULOS_MAP[clean] || MODULOS_MAP[modulo] || modulo;
};

/**
 * Traduce una acción técnica
 */
export const humanizarAccion = (accion: string | null | undefined): string => {
  if (!accion) return 'Acción del sistema';
  const clean = accion.trim().toLowerCase();
  return ACCIONES_MAP[clean] || ACCIONES_MAP[accion] || accion;
};

/**
 * Humaniza el resultado técnico
 */
export const humanizarResultado = (resultado: string | null | undefined, codigo?: number | null): string => {
  if (!resultado) return 'Procesado';
  const res = resultado.toLowerCase();
  
  if (res === 'exito') return 'Éxito';
  if (res === 'denegado' || codigo === 403) return 'Bloqueado (Sin Permisos)';
  if (codigo === 401) return 'Contraseña / Credenciales Incorrectas';
  if (codigo === 422 || codigo === 400) return 'Error de Validación / Datos Inválidos';
  if (codigo === 500) return 'Fallo Crítico del Servidor';
  
  return 'Fallo en la operación';
};

/**
 * Traduce la combinación de módulo y acción para gráficas
 */
export const humanizarModuloAccion = (label: string): string => {
  if (!label || !label.includes(' - ')) return label;
  const [modulo, accion] = label.split(' - ');
  return `${humanizarModulo(modulo)}: ${humanizarAccion(accion)}`;
};

/**
 * Traduce una acción técnica agregando detalles específicos basados en el payload.
 */
export const humanizarAccionDetallada = (row: any): string => {
  const modulo = (row.modulo || '').toLowerCase();
  const ruta = (row.ruta || '').toLowerCase();
  let datos = row.datos_nuevos;
  
  if (typeof datos === 'string') {
    try { datos = JSON.parse(datos); } catch (e) { /* ignore */ }
  }

  // 1. Viáticos
  if (modulo === 'viaticos' && row.metodo_http === 'POST' && ruta.includes('/enviar')) {
    if (datos && datos.gastos && Array.isArray(datos.gastos) && datos.gastos.length > 0) {
      let totalValor = 0;
      const descripciones = datos.gastos.map((g: any) => {
        totalValor += (g.valorConFactura || 0) + (g.valorSinFactura || 0);
        return (g.cc || 'Gasto').toLowerCase();
      });
      const categoriasUnicas = Array.from(new Set(descripciones)).join(', ');
      const totalFormateado = totalValor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
      return `Registró viáticos por: ${categoriasUnicas} (${totalFormateado})`;
    }
  }

  // 1.5. Viáticos - Descarga de PDF / Excel de Estado de Cuenta
  if (modulo === 'viaticos') {
    const metadatos = row.metadatos;
    const deEmpleado = metadatos?.nombre_consultado ? ` de: ${metadatos.nombre_consultado}` : '';
    if (ruta.includes('/estado-cuenta/pdf')) {
      return `Descargó PDF de Estado de Cuenta de Viáticos${deEmpleado}`;
    }
    if (ruta.includes('/estado-cuenta/xlsx')) {
      return `Exportó Excel de Estado de Cuenta de Viáticos${deEmpleado}`;
    }
  }

  // 2. Control de Acceso (Auth)
  if (modulo === 'auth') {
    if (ruta.includes('/login')) return 'Inició sesión en el sistema';
    if (ruta.includes('/logout')) return 'Cerró sesión';
    if (ruta.includes('/refresh')) return 'Renovó su token de seguridad';
  }

  // 3. Biometría
  if (modulo === 'biometria') {
    if (ruta.includes('/enrolar')) return 'Registró su rostro (Enrolamiento facial)';
    if (ruta.includes('/asistencia')) return 'Marcó asistencia mediante biometría facial';
  }

  // 4. Desarrollos / Software Factory
  if ((modulo === 'desarrollos' || modulo === 'desarrollo') && row.accion === 'crear') {
    if (datos && datos.nombre) return `Creó el proyecto/requerimiento: ${datos.nombre}`;
  }

  // 5. ERP / Requisiciones
  if (ruta.includes('/requisiciones/crear')) {
    const uen = datos?.uen ? ` para UEN: ${datos.uen}` : '';
    const lineas = datos?.lineas?.length ? ` con ${datos.lineas.length} ítems` : '';
    return `Creó requisición de compras${uen}${lineas}`;
  }

  // 6. Impuestos / Retenciones
  if (modulo === 'impuestos') {
    const ano = row.metadatos?.ano || row.metadatos?.ano_gravable || '';
    const anoStr = ano ? ` (Año ${ano})` : '';
    const target = row.metadatos?.cedula_target ? ` para la cédula ${row.metadatos.cedula_target}` : '';
    
    if (ruta.includes('/certificado-220')) {
      return `Descargó Certificado de Ingresos y Retenciones (Formato 220)${anoStr}${target}`;
    }
    if (ruta.includes('/template')) {
      return 'Descargó plantilla Excel para carga de información exógena';
    }
    if (ruta.includes('/upload')) {
      return `Cargó archivo de información exógena (Formato 2276)${anoStr}`;
    }
  }

  // 7. Nómina / Comisiones
  if (modulo === 'comisiones') {
    const mes = row.metadatos?.mes || '';
    const anio = row.metadatos?.anio || '';
    const periodo = (mes && anio) ? ` para el periodo ${mes}/${anio}` : '';
    
    if (ruta.includes('/datos') && row.accion === 'consultar') {
      return `Consultó los registros de comisiones${periodo}`;
    }
    if (ruta.includes('/favoritos')) {
      const operacion = row.metadatos?.operacion === 'added' ? 'Agregó a' : 'Eliminó de';
      const cedula = row.metadatos?.cedula || '';
      return `${operacion} sus favoritos de comisiones (Cédula: ${cedula})`;
    }
    if (ruta.includes('/procesar-manual') || ruta.includes('/procesar_manual')) {
      return `Procesó cálculos manuales de comisiones${periodo}`;
    }
  }

  // 8. Reserva de Salas
  if ((modulo.includes('reserva_salas') || modulo.includes('reserva-salas')) && row.accion === 'crear') {
    const salaNombre = datos?.room_name ? ` en ${datos.room_name}` : '';
    if (datos && datos.title) return `Reservó sala para: ${datos.title}${salaNombre}`;
    return `Reservó una sala de reuniones${salaNombre}`;
  }

  // 7. Nómina / Comisiones
  if (modulo === 'comisiones' || ruta.includes('comisiones')) {
    if (row.accion === 'consultar') return 'Consultó datos de comisiones de nómina';
    if (row.accion === 'exportar') return 'Descargó reporte de comisiones';
  }

  // 8. Inventario
  if (modulo === 'inventario') {
    if (ruta.includes('ronda-vista')) return 'Actualizó su vista de la ronda de inventario';
  }

  // 9. Tickets de Soporte
  if (modulo.includes('ticket') || modulo === 'sistemas') {
    if (row.accion === 'crear') {
      return datos?.asunto ? `Creó ticket de soporte: ${datos.asunto}` : 'Creó un nuevo ticket de soporte';
    }
    if (row.accion === 'actualizar') return 'Actualizó el estado o respondió un ticket';
  }

  return humanizarAccion(row.accion);
};

/**
 * Convierte una ruta de API técnica en una descripción específica y legible.
 * Ej: /api/v2/viaticos/enviar -> "Envío de Viáticos"
 */
export const humanizarRuta = (ruta: string): string => {
  if (!ruta) return 'Ruta Desconocida';
  
  const rutasMap: Record<string, string> = {
    '/api/v2/viaticos/enviar': 'Envío de Viáticos',
    '/api/v2/auth/login': 'Inicio de Sesión',
    '/api/v2/auth/logout': 'Cierre de Sesión',
    '/api/v2/informes/descargar': 'Descarga de Informe',
    '/api/v2/tickets/crear': 'Creación de Ticket',
    '/api/v2/tickets/responder': 'Respuesta a Ticket',
    '/api/v2/usuarios/crear': 'Creación de Usuario',
    '/api/v2/reserva-salas/reservations': 'Gestión de Reservas de Salas',
    '/api/v2/reserva-salas/rooms': 'Consulta de Salas Disponibles',
  };

  // Buscar coincidencia exacta
  if (rutasMap[ruta]) return rutasMap[ruta];

  // Si no hay coincidencia exacta, limpiar y formatear un poco
  let limpia = ruta.replace('/api/v2/', '').replace('/api/v1/', '').replace('/', ' - ');
  
  // Capitalizar
  limpia = limpia.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  return limpia || ruta;
};
