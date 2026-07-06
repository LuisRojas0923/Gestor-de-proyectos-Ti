import logging
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy import func, select, desc, cast, Integer
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.auditoria.accion_usuario import AuditoriaAccionUsuario

logger = logging.getLogger(__name__)

class ServicioAuditoriaEstadisticas:
    @staticmethod
    async def obtener_estadisticas(
        db: AsyncSession,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None
    ) -> Dict[str, Any]:
        
        # Filtros base
        filtros = []
        if fecha_desde:
            filtros.append(AuditoriaAccionUsuario.timestamp >= fecha_desde)
        if fecha_hasta:
            filtros.append(AuditoriaAccionUsuario.timestamp <= fecha_hasta)
            
        base_query = select(AuditoriaAccionUsuario)
        if filtros:
            base_query = base_query.where(*filtros)

        # 1. KPIs Generales
        count_stmt = select(func.count()).select_from(AuditoriaAccionUsuario)
        if filtros:
            count_stmt = count_stmt.where(*filtros)
        total_eventos = (await db.execute(count_stmt)).scalar() or 0
        
        usuarios_unicos_stmt = select(func.count(func.distinct(AuditoriaAccionUsuario.usuario_id))).select_from(AuditoriaAccionUsuario)
        if filtros:
            usuarios_unicos_stmt = usuarios_unicos_stmt.where(*filtros)
        usuarios_unicos = (await db.execute(usuarios_unicos_stmt)).scalar() or 0
        
        exitos_stmt = select(func.count()).select_from(AuditoriaAccionUsuario).where(AuditoriaAccionUsuario.resultado == "exito")
        if filtros:
            exitos_stmt = exitos_stmt.where(*filtros)
        total_exitos = (await db.execute(exitos_stmt)).scalar() or 0
        
        denegados_stmt = select(func.count()).select_from(AuditoriaAccionUsuario).where(AuditoriaAccionUsuario.resultado == "denegado")
        if filtros:
            denegados_stmt = denegados_stmt.where(*filtros)
        total_denegados = (await db.execute(denegados_stmt)).scalar() or 0
        
        auth_fallos_stmt = select(func.count()).select_from(AuditoriaAccionUsuario).where(
            AuditoriaAccionUsuario.resultado == "fallo",
            AuditoriaAccionUsuario.ruta.ilike('%/auth/%')
        )
        if filtros:
            auth_fallos_stmt = auth_fallos_stmt.where(*filtros)
        total_fallos_auth = (await db.execute(auth_fallos_stmt)).scalar() or 0
        
        from sqlalchemy import or_
        sistema_fallos_stmt = select(func.count()).select_from(AuditoriaAccionUsuario).where(
            AuditoriaAccionUsuario.resultado == "fallo",
            or_(AuditoriaAccionUsuario.ruta.not_ilike('%/auth/%'), AuditoriaAccionUsuario.ruta.is_(None))
        )
        if filtros:
            sistema_fallos_stmt = sistema_fallos_stmt.where(*filtros)
        total_fallidos = (await db.execute(sistema_fallos_stmt)).scalar() or 0
        
        tasa_exito = round((total_exitos / total_eventos * 100), 1) if total_eventos > 0 else 0.0

        # 2. Por Módulo
        modulo_stmt = select(
            AuditoriaAccionUsuario.modulo,
            func.count().label('total')
        ).select_from(AuditoriaAccionUsuario).group_by(AuditoriaAccionUsuario.modulo).order_by(desc('total'))
        if filtros:
            modulo_stmt = modulo_stmt.where(*filtros)
            
        modulos_rows = (await db.execute(modulo_stmt)).all()
        por_modulo = [{"modulo": row.modulo or 'Desconocido', "total": row.total} for row in modulos_rows]
        modulo_mas_activo = por_modulo[0]["modulo"] if por_modulo else None

        # 3. Tipos de Fallos (reemplaza a Por Resultado)
        from sqlalchemy import case
        tipo_fallo_expr = case(
            (AuditoriaAccionUsuario.resultado == 'denegado', 'Permiso'),
            (AuditoriaAccionUsuario.codigo_respuesta == 403, 'Permiso'),
            (AuditoriaAccionUsuario.ruta.ilike('%/auth/%'), 'Autenticación'),
            (AuditoriaAccionUsuario.codigo_respuesta.in_([422, 400]), 'Validación'),
            (AuditoriaAccionUsuario.codigo_respuesta == 409, 'Negocio'),
            else_='Sistema'
        ).label('tipo_fallo')

        fallos_stmt = select(
            tipo_fallo_expr,
            func.count().label('total')
        ).select_from(AuditoriaAccionUsuario).where(AuditoriaAccionUsuario.resultado != 'exito').group_by('tipo_fallo')
        
        if filtros:
            fallos_stmt = fallos_stmt.where(*filtros)
            
        fallos_rows = (await db.execute(fallos_stmt)).all()
        tipos_fallos = [{"tipo": str(row.tipo_fallo), "total": row.total} for row in fallos_rows]

        # 4. Por Día o Por Hora (si el rango es de 1 día o menos)
        es_mismo_dia = False
        if fecha_desde and fecha_hasta:
            if (fecha_hasta - fecha_desde).days < 1 or (fecha_hasta.date() == fecha_desde.date()):
                es_mismo_dia = True
        
        if es_mismo_dia:
            # Agrupar por hora usando date_trunc de postgres y to_char
            expresion_fecha = func.to_char(func.date_trunc('hour', AuditoriaAccionUsuario.timestamp), 'YYYY-MM-DD HH24:00').label('fecha')
        else:
            # Agrupar por día
            expresion_fecha = func.date(AuditoriaAccionUsuario.timestamp).label('fecha')

        dia_stmt = select(
            expresion_fecha,
            func.count().label('total')
        ).select_from(AuditoriaAccionUsuario).group_by('fecha').order_by('fecha')
        if filtros:
            dia_stmt = dia_stmt.where(*filtros)
            
        dia_rows = (await db.execute(dia_stmt)).all()
        por_dia_dict = {str(row.fecha): row.total for row in dia_rows if row.fecha}
        por_dia = []

        if fecha_desde and fecha_hasta:
            current = fecha_desde
            if es_mismo_dia:
                current = current.replace(minute=0, second=0, microsecond=0)
                end = fecha_hasta.replace(minute=0, second=0, microsecond=0)
                while current <= end:
                    fecha_str = current.strftime('%Y-%m-%d %H:00')
                    por_dia.append({"fecha": fecha_str, "total": por_dia_dict.get(fecha_str, 0)})
                    current += timedelta(hours=1)
            else:
                current_date = current.date()
                end_date = fecha_hasta.date()
                while current_date <= end_date:
                    fecha_str = current_date.strftime('%Y-%m-%d')
                    por_dia.append({"fecha": fecha_str, "total": por_dia_dict.get(fecha_str, 0)})
                    current_date += timedelta(days=1)
        else:
            por_dia = [{"fecha": str(row.fecha), "total": row.total} for row in dia_rows if row.fecha]

        # 5. Top Usuarios
        usuarios_stmt = select(
            AuditoriaAccionUsuario.usuario_id,
            AuditoriaAccionUsuario.usuario_nombre,
            func.count().label('total'),
            func.max(AuditoriaAccionUsuario.timestamp).label('ultimo_evento')
        ).select_from(AuditoriaAccionUsuario).group_by(
            AuditoriaAccionUsuario.usuario_id, 
            AuditoriaAccionUsuario.usuario_nombre
        ).order_by(desc('total')).limit(10)
        if filtros:
            usuarios_stmt = usuarios_stmt.where(*filtros)
            
        usuarios_rows = (await db.execute(usuarios_stmt)).all()
        top_usuarios = [{
            "usuario_id": row.usuario_id,
            "usuario_nombre": row.usuario_nombre,
            "total": row.total,
            "ultimo_evento": row.ultimo_evento
        } for row in usuarios_rows]

        # 6. Top Rutas
        rutas_stmt = select(
            AuditoriaAccionUsuario.ruta,
            func.count().label('total'),
            func.sum(
                cast(AuditoriaAccionUsuario.resultado != 'exito', Integer)
            ).label('fallos')
        ).select_from(AuditoriaAccionUsuario).where(
            AuditoriaAccionUsuario.ruta.isnot(None)
        ).group_by(AuditoriaAccionUsuario.ruta).order_by(desc('total')).limit(10)
        
        if filtros:
            rutas_stmt = rutas_stmt.where(*filtros)
            
        rutas_rows = (await db.execute(rutas_stmt)).all()
        top_rutas = [{
            "ruta": row.ruta,
            "total": row.total,
            "fallos": row.fallos or 0
        } for row in rutas_rows]

        return {
            "total_eventos": total_eventos,
            "usuarios_unicos": usuarios_unicos,
            "total_exitosos": total_exitos,
            "total_fallidos": total_fallidos,
            "total_denegados": total_denegados,
            "total_fallos_auth": total_fallos_auth,
            "tasa_exito": tasa_exito,
            "modulo_mas_activo": modulo_mas_activo,
            "por_modulo": por_modulo,
            "tipos_fallos": tipos_fallos,
            "por_dia": por_dia,
            "top_usuarios": top_usuarios,
            "top_rutas": top_rutas
        }
