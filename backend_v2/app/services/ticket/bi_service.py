from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.models.ticket.ticket import Ticket
from app.utils_date import get_bogota_now

class TicketBIService:
    """Servicio especializado para analítica y Business Intelligence de Tickets"""

    @staticmethod
    async def obtener_data_analitica_bi(db: AsyncSession) -> Dict[str, Any]:
        """Obtiene el set de datos completo estructurado para el dashboard BI"""
        # 1. Obtener todos los tickets
        result = await db.execute(select(Ticket))
        tickets = result.scalars().all()
        
        # 2. Resumen General (Top Cards)
        total = len(tickets)
        resueltos = sum(1 for t in tickets if t.estado in ["Resuelto", "Cerrado"])
        pendientes = total - resueltos
        
        # 3. Agrupaciones por Área
        areas_data = {}
        for t in tickets:
            area = t.area_creador or "Sin Área"
            if area not in areas_data:
                areas_data[area] = {"total": 0, "resueltos": 0, "min_atender": [], "min_atencion": []}
            
            areas_data[area]["total"] += 1
            if t.estado in ["Resuelto", "Cerrado"]:
                areas_data[area]["resueltos"] += 1
                
                # Determinar fecha de fin (Resolución o Cierre)
                fecha_fin = t.resuelto_en or t.fecha_cierre
                
                # Tiempo en Atender (Min) - Desde creación hasta inicio de atención
                if t.atendido_en and t.creado_en:
                    atendido = t.atendido_en.replace(tzinfo=None) if t.atendido_en.tzinfo else t.atendido_en
                    creado = t.creado_en.replace(tzinfo=None) if t.creado_en.tzinfo else t.creado_en
                    min_atender = (atendido - creado).total_seconds() / 60
                    areas_data[area]["min_atender"].append(min_atender)
                
                # Tiempo de Atención (Min) - Desde inicio de atención hasta resolución/cierre
                if fecha_fin and t.atendido_en:
                    fin = fecha_fin.replace(tzinfo=None) if fecha_fin.tzinfo else fecha_fin
                    atendido = t.atendido_en.replace(tzinfo=None) if t.atendido_en.tzinfo else t.atendido_en
                    min_atencion = (fin - atendido).total_seconds() / 60
                    areas_data[area]["min_atencion"].append(min_atencion)
                elif fecha_fin and t.creado_en:
                    fin = fecha_fin.replace(tzinfo=None) if fecha_fin.tzinfo else fecha_fin
                    creado = t.creado_en.replace(tzinfo=None) if t.creado_en.tzinfo else t.creado_en
                    min_atencion = (fin - creado).total_seconds() / 60
                    areas_data[area]["min_atencion"].append(min_atencion)

        area_stats = []
        for area, d in areas_data.items():
            area_stats.append({
                "area": area,
                "cantidad": d["total"],
                "avg_atender": round(sum(d["min_atender"]) / len(d["min_atender"]), 2) if d["min_atender"] else 0,
                "avg_atencion": round(sum(d["min_atencion"]) / len(d["min_atencion"]), 2) if d["min_atencion"] else 0
            })
        area_stats.sort(key=lambda x: x["cantidad"], reverse=True)

        # 4. Solicitudes por Fecha
        fechas_data = {}
        tiempos_fecha = {}
        for t in tickets:
            if not t.creado_en: continue
            date_key = t.creado_en.strftime("%Y-%m-%d")
            fechas_data[date_key] = fechas_data.get(date_key, 0) + 1
            
            if t.resuelto_en and t.creado_en:
                resuelto = t.resuelto_en.replace(tzinfo=None) if t.resuelto_en.tzinfo else t.resuelto_en
                creado = t.creado_en.replace(tzinfo=None) if t.creado_en.tzinfo else t.creado_en
                duracion = (resuelto - creado).total_seconds() / 60
                if date_key not in tiempos_fecha: tiempos_fecha[date_key] = []
                tiempos_fecha[date_key].append(duracion)
        
        timeline = []
        for k in sorted(fechas_data.keys()):
            timeline.append({
                "fecha": k,
                "cantidad": fechas_data[k],
                "avg_tiempo": round(sum(tiempos_fecha[k]) / len(tiempos_fecha[k]), 0) if k in tiempos_fecha else 0
            })

        # 5. Agrupación por Causa
        causas_data = {}
        for t in tickets:
            causa = t.causa_novedad or "(En blanco)"
            if causa not in causas_data:
                causas_data[causa] = {"cantidad": 0, "min_atender": [], "min_atencion": []}
            
            causas_data[causa]["cantidad"] += 1
            if t.estado in ["Resuelto", "Cerrado"]:
                if t.atendido_en and t.creado_en:
                    atendido = t.atendido_en.replace(tzinfo=None) if t.atendido_en.tzinfo else t.atendido_en
                    creado = t.creado_en.replace(tzinfo=None) if t.creado_en.tzinfo else t.creado_en
                    causas_data[causa]["min_atender"].append((atendido - creado).total_seconds() / 60)
                if t.resuelto_en and t.atendido_en:
                    resuelto = t.resuelto_en.replace(tzinfo=None) if t.resuelto_en.tzinfo else t.resuelto_en
                    atendido = t.atendido_en.replace(tzinfo=None) if t.atendido_en.tzinfo else t.atendido_en
                    causas_data[causa]["min_atencion"].append((resuelto - atendido).total_seconds() / 60)

        causa_stats = []
        for causa, d in causas_data.items():
            total_causa = d["cantidad"]
            causa_stats.append({
                "causa": causa,
                "cantidad": total_causa,
                "porcentaje": round((total_causa / total * 100), 2) if total > 0 else 0,
                "avg_atender": round(sum(d["min_atender"]) / len(d["min_atender"]), 2) if d["min_atender"] else 0,
                "avg_atencion": round(sum(d["min_atencion"]) / len(d["min_atencion"]), 2) if d["min_atencion"] else 0
            })
        causa_stats.sort(key=lambda x: x["cantidad"], reverse=True)

        # 6. Analistas
        analistas_data = {}
        for t in tickets:
            if not t.asignado_a: continue
            analistas_data[t.asignado_a] = analistas_data.get(t.asignado_a, 0) + 1
        
        analista_stats = [{"name": k, "cantidad": v, "porcentaje": round((v / total * 100), 2) if total > 0 else 0} 
                         for k, v in sorted(analistas_data.items(), key=lambda x: x[1], reverse=True)]

        # 7. Matriz Analista vs Causa
        analistas_unicos = sorted(list(analistas_data.keys()))
        matriz_analista_causa = []
        for causa in [c["causa"] for c in causa_stats if c["causa"] != "(En blanco)"]:
            fila = {"observacion": causa}
            total_fila = 0
            for analista in analistas_unicos:
                c_val = sum(1 for t in tickets if t.causa_novedad == causa and t.asignado_a == analista)
                fila[analista] = c_val
                total_fila += c_val
            fila["total"] = total_fila
            matriz_analista_causa.append(fila)

        # 8. Horas/Minutos totales
        total_min_atencion = sum(sum(d["min_atencion"]) for d in areas_data.values())
        
        return {
            "resumen": {
                "total": total,
                "resueltos": resueltos,
                "pendientes": pendientes,
                "avg_mes": round(total / (get_bogota_now().month), 1),
                "total_horas": round(total_min_atencion / 60, 2),
                "total_minutos": round(total_min_atencion, 2),
                "avg_atender_global": round(sum(sum(d["min_atender"]) for d in areas_data.values()) / (resueltos or 1), 2),
                "avg_atencion_global": round(total_min_atencion / (resueltos or 1), 2)
            },
            "prioridad_stats": {
                "Alta": sum(1 for t in tickets if (t.prioridad or "").capitalize() == "Alta"),
                "Media": sum(1 for t in tickets if (t.prioridad or "").capitalize() == "Media" or not t.prioridad),
                "Baja": sum(1 for t in tickets if (t.prioridad or "").capitalize() == "Baja")
            },
            "area_stats": area_stats,
            "timeline": timeline,
            "causa_stats": causa_stats,
            "analista_stats": analista_stats,
            "matriz_observacion": matriz_analista_causa,
            "analistas_header": analistas_unicos
        }
