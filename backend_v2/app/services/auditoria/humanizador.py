import json
from typing import Any, Dict, Optional


ACCIONES_MAP = {
    'login': 'Ingresó al sistema',
    'logout': 'Salió del sistema',
    'crear': 'Creó un nuevo registro',
    'actualizar': 'Modificó información',
    'eliminar': 'Eliminó un registro (Sensible)',
    'consultar': 'Consultó información',
    'exportar': 'Descargó reporte / datos',
    'otro': 'Operación en el sistema'
}


def humanizar_accion(accion: Optional[str]) -> str:
    """Traduce una acción técnica a texto humano genérico."""
    if not accion:
        return 'Acción del sistema'
    clean = accion.strip().lower()
    return ACCIONES_MAP.get(clean, accion)


def generar_accion_detallada(
    modulo: Optional[str],
    accion: Optional[str],
    metodo_http: Optional[str],
    ruta: Optional[str],
    datos_nuevos: Optional[Any],
    metadatos: Optional[Dict[str, Any]],
    entidad_tipo: Optional[str] = None
) -> str:
    """
    Evalúa el payload técnico de un evento de auditoría y retorna
    una descripción detallada y sanitizada en español, sin exponer JSON libre.
    """
    modulo = (modulo or "").lower()
    ruta = (ruta or "").lower()
    datos = datos_nuevos or {}
    metadatos = metadatos or {}

    if isinstance(datos, str):
        try:
            datos = json.loads(datos)
        except Exception:
            datos = {}

    if not isinstance(datos, dict):
        datos = {}
        
    if not isinstance(metadatos, dict):
        metadatos = {}

    # 1. Viáticos
    if modulo == 'viaticos' and metodo_http == 'POST' and '/enviar' in ruta:
        gastos = datos.get('gastos', [])
        if isinstance(gastos, list) and len(gastos) > 0:
            total_valor = 0
            descripciones = []
            for g in gastos:
                if isinstance(g, dict):
                    total_valor += g.get('valorConFactura', 0) + g.get('valorSinFactura', 0)
                    descripciones.append((g.get('cc') or 'Gasto').lower())
            categorias_unicas = ", ".join(list(set(descripciones)))
            return f"Registró viáticos por: {categorias_unicas} (${total_valor:,.0f})"

    if modulo == 'viaticos':
        de_empleado = f" de: {metadatos.get('nombre_consultado')}" if metadatos.get('nombre_consultado') else ""
        if '/estado-cuenta/pdf' in ruta:
            return f"Descargó PDF de Estado de Cuenta de Viáticos{de_empleado}"
        if '/estado-cuenta/xlsx' in ruta:
            return f"Exportó Excel de Estado de Cuenta de Viáticos{de_empleado}"
        if '/reporte-gastos/auditar-descarga' in ruta:
            return f"Descargó PDF del Reporte de Gastos de Viáticos{de_empleado}"

    # 2. Control de Acceso (Auth)
    if modulo == 'auth':
        if '/login' in ruta:
            return 'Inició sesión en el sistema'
        if '/logout' in ruta:
            return 'Cerró sesión'
        if '/refresh' in ruta:
            return 'Renovó su token de seguridad'

    # 3. Biometría
    if modulo == 'biometria':
        if '/enrolar' in ruta:
            return 'Registró su rostro (Enrolamiento facial)'
        if '/asistencia' in ruta:
            return 'Marcó asistencia mediante biometría facial'

    # 4. Desarrollos / Software Factory / Actividades
    if modulo in ('desarrollos', 'desarrollo', 'actividades') or '/actividades' in ruta or '/desarrollos' in ruta:
        if '/actividades' in ruta:
            titulo = f" \"{datos.get('titulo')}\"" if datos.get('titulo') else ""
            if metodo_http == 'POST' or accion == 'crear':
                return f"Creó una nueva actividad{titulo} en el proyecto"
            if metodo_http in ('PATCH', 'PUT') or accion == 'actualizar':
                if datos.get('estado'):
                    return f"Actualizó el estado de la actividad{titulo} a \"{datos.get('estado')}\""
                if datos.get('porcentaje_avance') is not None:
                    return f"Actualizó el progreso de la actividad{titulo} al {datos.get('porcentaje_avance')}%"
                return f"Actualizó información de la actividad{titulo}"
            if metodo_http == 'DELETE' or accion == 'eliminar':
                return f"Eliminó la actividad{titulo} del proyecto"
            if '/archivo' in ruta and accion == 'exportar':
                return f"Descargó un archivo adjunto de la actividad{titulo}"

        if '/desarrollos' in ruta or entidad_tipo == 'desarrollo' or accion:
            nombre = f" \"{datos.get('nombre')}\"" if datos.get('nombre') else ""
            if metodo_http == 'POST' or accion == 'crear':
                return f"Creó el proyecto/requerimiento{nombre}"
            if metodo_http in ('PATCH', 'PUT') or accion == 'actualizar':
                if datos.get('estado'):
                    return f"Cambió el estado del proyecto{nombre} a \"{datos.get('estado')}\""
                return f"Actualizó la información base del proyecto{nombre}"
            if metodo_http == 'DELETE' or accion == 'eliminar':
                return f"Eliminó el proyecto/requerimiento{nombre}"

    # 5. ERP / Requisiciones
    if '/requisiciones/crear' in ruta:
        uen = f" para UEN: {datos.get('uen')}" if datos.get('uen') else ""
        lineas = f" con {len(datos.get('lineas'))} ítems" if isinstance(datos.get('lineas'), list) and len(datos.get('lineas')) > 0 else ""
        return f"Creó requisición de compras{uen}{lineas}"

    # 6. Impuestos / Retenciones
    if modulo == 'impuestos':
        ano = metadatos.get('ano') or metadatos.get('ano_gravable') or ""
        ano_str = f" (Año {ano})" if ano else ""
        target = f" para la cédula {metadatos.get('cedula_target')}" if metadatos.get('cedula_target') else ""

        if '/certificado-220' in ruta:
            return f"Descargó Certificado de Ingresos y Retenciones (Formato 220){ano_str}{target}"
        if '/template' in ruta:
            return "Descargó plantilla Excel para carga de información exógena"
        if '/upload' in ruta:
            return f"Cargó archivo de información exógena (Formato 2276){ano_str}"

    # 7. Nómina, Comisiones y Novedades
    if modulo in ('comisiones', 'nomina_novedades'):
        if '/archivos' in ruta and metodo_http == 'POST':
            if '/procesar' in ruta:
                return 'Confirmó y procesó el archivo de novedades'
            return 'Subió archivo base de nómina para validación'
        if '/archivos' in ruta and '/descargar' in ruta:
            return 'Descargó un archivo base de novedades de nómina'
        if '/exportar-solid' in ruta and metodo_http == 'POST':
            return 'Exportó novedades procesadas al ERP (SOLID)'

        if '/datos' in ruta and accion == 'consultar':
            return 'Consultó los registros de comisiones'
        if '/exportar' in ruta:
            return 'Descargó reporte de comisiones'
        if '/procesar-manual' in ruta and '/embargos/' not in ruta:
            return 'Procesó cálculos manuales de comisiones'
        if '/favoritos/toggle' in ruta:
            return 'Agregó/Eliminó empleado de su lista de favoritos (Comisiones)'

        if '/control_descuentos/registro' in ruta:
            if metodo_http == 'POST':
                return 'Registró un nuevo descuento quincenal'
            if metodo_http in ('PUT', 'PATCH'):
                return 'Modificó un descuento quincenal existente'
            if metodo_http == 'DELETE':
                return 'Eliminó un descuento quincenal'
        if '/control_descuentos/conceptos' in ruta and metodo_http == 'POST':
            return 'Creó un nuevo concepto de descuento'

        if '/embargos/procesar-manual' in ruta:
            return 'Aplicó embargo de forma manual'
        if '/preview' in ruta:
            return 'Generó vista previa de deducciones (Nómina/Cooperativas/Retenciones)'

        if '/excepciones' in ruta:
            if '/estado' in ruta and metodo_http == 'PATCH':
                return 'Cambió el estado (Aprobó/Rechazó) de una excepción de nómina'
            if metodo_http == 'POST':
                return 'Registró una nueva excepción de nómina'
            if metodo_http == 'DELETE':
                return 'Eliminó una excepción de nómina'

    # 8. Jerarquía Organizacional y Permisos (Auth)
    if modulo in ('jerarquia_organizacional', 'auth'):
        if '/relaciones' in ruta:
            if metodo_http == 'POST':
                return 'Asignó un nuevo jefe inmediato a un empleado'
            if metodo_http == 'PATCH':
                return 'Modificó la línea de reporte (jefe inmediato) de un empleado'
            if metodo_http == 'DELETE':
                return 'Desactivó la línea de reporte de un empleado'
        
        if ('/usuarios' in ruta or '/analistas/crear' in ruta) and metodo_http == 'POST':
            return 'Registró un nuevo usuario en el sistema'
        if '/analistas/' in ruta and metodo_http == 'PATCH':
            return 'Actualizó el perfil, estado o rol de un usuario'
        
        if '/permisos' in ruta and metodo_http == 'POST':
            return 'Actualizó la matriz global de permisos del sistema'
        if '/roles' in ruta:
            if metodo_http == 'POST':
                return 'Creó un nuevo rol en el sistema'
            if metodo_http in ('PUT', 'PATCH'):
                return 'Modificó la configuración de un rol de sistema'
            if metodo_http == 'DELETE':
                return 'Eliminó un rol del sistema'

    # 9. Reserva de Salas
    if modulo and ('reserva_salas' in modulo or 'reserva-salas' in modulo) and accion == 'crear':
        sala_nombre = f" en {datos.get('room_name')}" if datos.get('room_name') else ""
        if datos.get('title'):
            return f"Reservó sala para: {datos.get('title')}{sala_nombre}"
        return f"Reservó una sala de reuniones{sala_nombre}"

    # 10. Inventario
    if modulo == 'inventario':
        if '/config' in ruta: return 'Configuró la ronda activa o el nombre del inventario'
        if '/guardar-conteo' in ruta: return 'Registró o actualizó el conteo físico de un ítem'
        if '/cargar-excel' in ruta: return 'Importó listado maestro de equipos (Excel)'
        if '/cargar-transito' in ruta: return 'Importó listado de mercancía en tránsito (Excel)'
        if '/cargar-legacy' in ruta: return 'Importó resultados históricos (Legacy Excel)'
        if '/asignaciones/limpiar' in ruta: return 'Reinició/Vació el progreso del inventario actual'
        if '/auditar-impresion-pdf' in ruta: return 'Descargó Planilla Manual 0 para conteo (PDF)'
        if '/auditar-descarga-pdf-asignado' in ruta: return 'Descargó PDF de su Planilla de Conteo Asignada'
        if '/auditar-exportacion' in ruta: return 'Exportó listado de asignaciones/responsables (Excel)'
        if '/ronda-vista' in ruta: return 'Aceptó e inició la ronda de inventario asignada'
        if '/plantilla-maestra' in ruta: return 'Descargó la Plantilla Maestra en Excel (.xlsx)'
        if '/plantilla-transito' in ruta: return 'Descargó la Plantilla de Tránsito en Excel (.xlsx)'

        if '/asignar/habilitar-c2' in ruta: return 'Habilitó Segundo Conteo (C2) para responsable'
        if '/asignar' in ruta:
            if metodo_http == 'DELETE': return 'Eliminó la asignación de un responsable'
            if metodo_http == 'PATCH': return 'Actualizó datos de la asignación de responsable'
            return 'Asignó un usuario responsable a una bodega/bloque'

    # 11. Tickets de Soporte
    if modulo and ('ticket' in modulo or modulo in ('sistemas', 'soporte')):
        if accion == 'crear':
            return f"Creó ticket de soporte: {datos.get('asunto')}" if datos.get('asunto') else 'Creó un nuevo ticket de soporte'
        if accion == 'actualizar':
            return 'Actualizó el estado o respondió un ticket'
        if '/adjuntos' in ruta and '/archivo' in ruta:
            return 'Descargó un archivo adjunto del ticket de soporte'

    # 11.5. Panel de Control
    if modulo in ('panel_control', 'panel-control'):
        if '/mantenimiento/limpiar-tickets' in ruta:
            return 'Ejecutó limpieza y mantenimiento de tickets de soporte'

    # 12. Líneas Corporativas
    if modulo in ('lineas_corporativas', 'lineas corporativas', 'lineas-corporativas'):
        if '/importar-factura' in ruta: return 'Importó archivo de facturación mensual'
        if '/importar-inventario' in ruta: return 'Importó archivo de inventario/equipos'
        if '/cruce/exportar-nomina' in ruta: return 'Exportó novedades de nómina (Líneas Corporativas)'
        if '/cruce/exportar-contable' in ruta: return 'Exportó reporte contable (Líneas Corporativas)'
        if '/reporte-co' in ruta: return 'Consultó reporte por Centro de Costo'
        if '/equipos' in ruta and metodo_http == 'POST': return 'Registró nuevo equipo móvil'
        if '/personas' in ruta and metodo_http == 'POST': return 'Registró asignación de empleado a línea'
        if metodo_http == 'POST' and ruta.endswith('/'): return 'Creó nueva línea corporativa'
        if metodo_http in ('PUT', 'PATCH'): return 'Actualizó datos de línea corporativa'

    return humanizar_accion(accion)
