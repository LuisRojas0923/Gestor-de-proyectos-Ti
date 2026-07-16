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
  'comisiones': 'Nómina: Comisiones',
  'nomina_novedades': 'Novedades de Nómina',
  'jerarquia_organizacional': 'Jerarquía Organizacional',
  'inventario': 'Inventario Anual de TI',
  'lineas_corporativas': 'Líneas Corporativas',
  'lineas corporativas': 'Líneas Corporativas',
  'lineas-corporativas': 'Líneas Corporativas'
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
const CLAVES_MAP: Record<string, string> = {
  'id': 'ID',
  'nombre': 'Nombre',
  'descripcion': 'Descripción',
  'estado': 'Estado',
  'is_active': 'Activo',
  'is_superuser': 'Superusuario',
  'created_at': 'Fecha de Creación',
  'updated_at': 'Última Actualización',
  'id_usuario': 'ID Usuario',
  'rol': 'Rol de Usuario',
  'tipo': 'Tipo',
  'categoria': 'Categoría',
  'fecha': 'Fecha',
  'valor': 'Valor',
  'observaciones': 'Observaciones'
};

/**
 * Convierte una clave técnica de JSON en un nombre más legible.
 */
export const humanizarClave = (clave: string): string => {
  if (!clave) return '';
  const clean = clave.trim().toLowerCase();
  if (CLAVES_MAP[clean]) return CLAVES_MAP[clean];

  // Convertir snake_case o camelCase a texto normal capitalizado
  const palabras = clave.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
  return palabras.charAt(0).toUpperCase() + palabras.slice(1).toLowerCase();
};

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
    if (ruta.includes('/reporte-gastos/auditar-descarga')) {
      return `Descargó PDF del Reporte de Gastos de Viáticos${deEmpleado}`;
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

  // 4. Desarrollos / Software Factory / Actividades
  if (modulo === 'desarrollos' || modulo === 'desarrollo' || modulo === 'actividades' || ruta.includes('/actividades') || ruta.includes('/desarrollos')) {

    // Acciones específicas de Actividades
    if (ruta.includes('/actividades')) {
      const titulo = datos?.titulo ? ` "${datos.titulo}"` : '';
      if (row.metodo_http === 'POST' || row.accion === 'crear') {
        return `Creó una nueva actividad${titulo} en el proyecto`;
      }
      if (row.metodo_http === 'PATCH' || row.metodo_http === 'PUT' || row.accion === 'actualizar') {
        if (datos?.estado) return `Actualizó el estado de la actividad${titulo} a "${datos.estado}"`;
        if (datos?.porcentaje_avance !== undefined) return `Actualizó el progreso de la actividad${titulo} al ${datos.porcentaje_avance}%`;
        return `Actualizó información de la actividad${titulo}`;
      }
      if (row.metodo_http === 'DELETE' || row.accion === 'eliminar') {
        return `Eliminó la actividad${titulo} del proyecto`;
      }
      if (ruta.includes('/archivo') && row.accion === 'exportar') {
        return `Descargó un archivo adjunto de la actividad${titulo}`;
      }
    }

    // Acciones específicas de Desarrollos (Proyectos)
    if (ruta.includes('/desarrollos') || row.entidad === 'desarrollo' || row.accion) {
      const nombre = datos?.nombre ? ` "${datos.nombre}"` : '';
      if (row.metodo_http === 'POST' || row.accion === 'crear') {
        return `Creó el proyecto/requerimiento${nombre}`;
      }
      if (row.metodo_http === 'PATCH' || row.metodo_http === 'PUT' || row.accion === 'actualizar') {
        if (datos?.estado) return `Cambió el estado del proyecto${nombre} a "${datos.estado}"`;
        return `Actualizó la información base del proyecto${nombre}`;
      }
      if (row.metodo_http === 'DELETE' || row.accion === 'eliminar') {
        return `Eliminó el proyecto/requerimiento${nombre}`;
      }
    }
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

  // 7. Nómina, Comisiones y Novedades
  if (modulo === 'comisiones' || modulo === 'nomina_novedades') {
    // 7.1 Archivos base
    if (ruta.includes('/archivos') && row.metodo_http === 'POST') {
      if (ruta.includes('/procesar')) return 'Confirmó y procesó el archivo de novedades';
      return 'Subió archivo base de nómina para validación';
    }
    if (ruta.includes('/archivos') && ruta.includes('/descargar')) {
      return 'Descargó un archivo base de novedades de nómina';
    }
    if (ruta.includes('/exportar-solid') && row.metodo_http === 'POST') return 'Exportó novedades procesadas al ERP (SOLID)';

    // 7.2 Comisiones
    if (ruta.includes('/datos') && row.accion === 'consultar') return 'Consultó los registros de comisiones';
    if (ruta.includes('/exportar')) return 'Descargó reporte de comisiones';
    if (ruta.includes('/procesar-manual') && !ruta.includes('/embargos/')) return 'Procesó cálculos manuales de comisiones';
    if (ruta.includes('/favoritos/toggle')) return 'Agregó/Eliminó empleado de su lista de favoritos (Comisiones)';

    // 7.3 Control de Descuentos
    if (ruta.includes('/control_descuentos/registro')) {
      if (row.metodo_http === 'POST') return 'Registró un nuevo descuento quincenal';
      if (row.metodo_http === 'PUT' || row.metodo_http === 'PATCH') return 'Modificó un descuento quincenal existente';
      if (row.metodo_http === 'DELETE') return 'Eliminó un descuento quincenal';
    }
    if (ruta.includes('/control_descuentos/conceptos') && row.metodo_http === 'POST') return 'Creó un nuevo concepto de descuento';

    // 7.4 Embargos, Retenciones y Otros
    if (ruta.includes('/embargos/procesar-manual')) return 'Aplicó embargo de forma manual';
    if (ruta.includes('/preview')) return 'Generó vista previa de deducciones (Nómina/Cooperativas/Retenciones)';

    // 7.5 Excepciones
    if (ruta.includes('/excepciones')) {
      if (ruta.includes('/estado') && row.metodo_http === 'PATCH') return 'Cambió el estado (Aprobó/Rechazó) de una excepción de nómina';
      if (row.metodo_http === 'POST') return 'Registró una nueva excepción de nómina';
      if (row.metodo_http === 'DELETE') return 'Eliminó una excepción de nómina';
    }
  }

  // 8. Jerarquía Organizacional y Permisos (Auth)
  if (modulo === 'jerarquia_organizacional' || modulo === 'auth') {
    // Jerarquía
    if (ruta.includes('/relaciones')) {
      if (row.metodo_http === 'POST') return 'Asignó un nuevo jefe inmediato a un empleado';
      if (row.metodo_http === 'PATCH') return 'Modificó la línea de reporte (jefe inmediato) de un empleado';
      if (row.metodo_http === 'DELETE') return 'Desactivó la línea de reporte de un empleado';
    }
    // Usuarios / Analistas
    if ((ruta.includes('/usuarios') || ruta.includes('/analistas/crear')) && row.metodo_http === 'POST') {
      return 'Registró un nuevo usuario en el sistema';
    }
    if (ruta.includes('/analistas/') && row.metodo_http === 'PATCH') {
      return 'Actualizó el perfil, estado o rol de un usuario';
    }
    // Roles y Permisos (Matriz)
    if (ruta.includes('/permisos') && row.metodo_http === 'POST') return 'Actualizó la matriz global de permisos del sistema';
    if (ruta.includes('/roles')) {
      if (row.metodo_http === 'POST') return 'Creó un nuevo rol en el sistema';
      if (row.metodo_http === 'PUT' || row.metodo_http === 'PATCH') return 'Modificó la configuración de un rol de sistema';
      if (row.metodo_http === 'DELETE') return 'Eliminó un rol del sistema';
    }
  }

  // 9. Reserva de Salas
  if ((modulo.includes('reserva_salas') || modulo.includes('reserva-salas')) && row.accion === 'crear') {
    const salaNombre = datos?.room_name ? ` en ${datos.room_name}` : '';
    if (datos && datos.title) return `Reservó sala para: ${datos.title}${salaNombre}`;
    return `Reservó una sala de reuniones${salaNombre}`;
  }

  // 10. Inventario
  if (modulo === 'inventario') {
    if (ruta.includes('/config')) return 'Configuró la ronda activa o el nombre del inventario';
    if (ruta.includes('/guardar-conteo')) return 'Registró o actualizó el conteo físico de un ítem';
    if (ruta.includes('/cargar-excel')) return 'Importó listado maestro de equipos (Excel)';
    if (ruta.includes('/cargar-transito')) return 'Importó listado de mercancía en tránsito (Excel)';
    if (ruta.includes('/cargar-legacy')) return 'Importó resultados históricos (Legacy Excel)';
    if (ruta.includes('/asignaciones/limpiar')) return 'Reinició/Vació el progreso del inventario actual';
    if (ruta.includes('/auditar-impresion-pdf')) return 'Descargó Planilla Manual 0 para conteo (PDF)';
    if (ruta.includes('/auditar-descarga-pdf-asignado')) return 'Descargó PDF de su Planilla de Conteo Asignada';
    if (ruta.includes('/auditar-exportacion')) return 'Exportó listado de asignaciones/responsables (Excel)';
    if (ruta.includes('/ronda-vista')) return 'Aceptó e inició la ronda de inventario asignada';
    if (ruta.includes('/plantilla-maestra')) return 'Descargó la Plantilla Maestra en Excel (.xlsx)';
    if (ruta.includes('/plantilla-transito')) return 'Descargó la Plantilla de Tránsito en Excel (.xlsx)';

    // Desglose detallado de operaciones de asignación
    if (ruta.includes('/asignar/habilitar-c2')) return 'Habilitó Segundo Conteo (C2) para responsable';
    if (ruta.includes('/asignar')) {
      if (row.metodo_http === 'DELETE') return 'Eliminó la asignación de un responsable';
      if (row.metodo_http === 'PATCH') return 'Actualizó datos de la asignación de responsable';
      return 'Asignó un usuario responsable a una bodega/bloque';
    }
  }

  // 11. Tickets de Soporte
  if (modulo.includes('ticket') || modulo === 'sistemas' || modulo === 'soporte') {
    if (row.accion === 'crear') {
      return datos?.asunto ? `Creó ticket de soporte: ${datos.asunto}` : 'Creó un nuevo ticket de soporte';
    }
    if (row.accion === 'actualizar') return 'Actualizó el estado o respondió un ticket';
    if (ruta.includes('/adjuntos') && ruta.includes('/archivo')) return 'Descargó un archivo adjunto del ticket de soporte';
  }

  // 11.5. Panel de Control / Mantenimiento
  if (modulo === 'panel_control' || modulo === 'panel-control') {
    if (ruta.includes('/mantenimiento/limpiar-tickets')) {
      return 'Ejecutó limpieza y mantenimiento de tickets de soporte';
    }
  }

  // 12. Líneas Corporativas
  if (modulo === 'lineas_corporativas' || modulo === 'lineas corporativas' || modulo === 'lineas-corporativas') {
    if (ruta.includes('/importar-factura')) return 'Importó archivo de facturación mensual';
    if (ruta.includes('/importar-inventario')) return 'Importó archivo de inventario/equipos';
    if (ruta.includes('/cruce/exportar-nomina')) return 'Exportó novedades de nómina (Líneas Corporativas)';
    if (ruta.includes('/cruce/exportar-contable')) return 'Exportó reporte contable (Líneas Corporativas)';
    if (ruta.includes('/reporte-co')) return 'Consultó reporte por Centro de Costo';
    if (ruta.includes('/equipos') && row.metodo_http === 'POST') return 'Registró nuevo equipo móvil';
    if (ruta.includes('/personas') && row.metodo_http === 'POST') return 'Registró asignación de empleado a línea';
    if (row.metodo_http === 'POST' && ruta.endsWith('/')) return 'Creó nueva línea corporativa';
    if (row.metodo_http === 'PUT' || row.metodo_http === 'PATCH') return 'Actualizó datos de línea corporativa';
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
