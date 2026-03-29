import re
from typing import Dict, Any, List
from math import ceil
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, and_, or_
from sqlmodel import select, func
from ...models.inventario.conteo import (
    ConteoInventario, 
    AsignacionInventario,
    ConfiguracionInventario
)

class ServicioAnalyticsInventario:
    @staticmethod
    async def obtener_resumen_estadistico(db: AsyncSession) -> Dict[str, Any]:
        """Calcula estadísticas agregadas del inventario actual."""
        stmt_total = select(func.count(ConteoInventario.id))
        total = (await db.execute(stmt_total)).scalar()

        # Helper para contar con filtros
        async def count_by_filter(filter_expr):
            stmt = select(func.count(ConteoInventario.id)).where(filter_expr)
            return (await db.execute(stmt)).scalar()

        # Totales por estado
        conciliados = await count_by_filter(ConteoInventario.estado == "CONCILIADO")
        erroneos = await count_by_filter(ConteoInventario.estado == "UBICACIÓN ERRÓNEA")
        discrepantes = await count_by_filter(ConteoInventario.estado == "DISCREPANTE")
        reconteo = await count_by_filter(ConteoInventario.estado == "RECONTEO")
        # Ítems que no han sido tocados en absoluto
        pendientes = await count_by_filter(and_(
            ConteoInventario.user_c1.is_(None),
            ConteoInventario.estado == "PENDIENTE"
        ))

        # Pendientes por ronda (basado en firmas de operario)
        # Filtro robusto: NULL o cadena vacía
        pc1 = await count_by_filter(or_(ConteoInventario.user_c1.is_(None), ConteoInventario.user_c1 == ""))
        
        # En Conteo Selectivo (Optimizado), C2 es solo sobre lo que falló en C1
        pc2 = await count_by_filter(and_(
            ConteoInventario.estado.in_(["RECONTEO", "DISCREPANTE", "UBICACIÓN ERRÓNEA"]),
            or_(ConteoInventario.user_c2.is_(None), ConteoInventario.user_c2 == "")
        ))
        
        # C3 es sobre discrepancias que persisten tras C2 (C1 != C2)
        pc3 = await count_by_filter(and_(
            ConteoInventario.estado == "DISCREPANTE", 
            ConteoInventario.user_c2.is_not(None), 
            or_(ConteoInventario.user_c3.is_(None), ConteoInventario.user_c3 == "")
        ))

        porcentaje = round((conciliados / total * 100), 2) if total > 0 else 0

        return {
            "total": total, "conciliados": conciliados, "erroneos": erroneos,
            "discrepantes": discrepantes, "reconteo": reconteo, "pendientes": pendientes,
            "pendientes_c1": pc1, "pendientes_c2": pc2, "pendientes_c3": pc3,
            "porcentaje_avance": porcentaje,
        }

    @staticmethod
    async def obtener_cobertura_bodegas(db: AsyncSession) -> Dict[str, Any]:
    # Corregido: Agregamos conteo de hechos C1 y C2 a nivel bodega
        stmt_bodegas = text("""
            SELECT 
                TRIM(bodega) AS bodega, 
                COUNT(*) AS total_items,
                COUNT(*) FILTER (WHERE user_c1 IS NOT NULL) AS hechos_c1,
                COUNT(*) FILTER (WHERE user_c2 IS NOT NULL) AS hechos_c2,
                COUNT(*) FILTER (WHERE user_c2 IS NOT NULL OR estado IN ('DISCREPANTE', 'RECONTEO', 'UBICACIÓN ERRÓNEA')) AS obj_c2,
                COUNT(*) FILTER (WHERE user_c3 IS NOT NULL OR estado IN ('DISCREPANTE')) AS obj_c3
            FROM conteoinventario
            WHERE (cantidad_sistema > 0 OR invporlegalizar > 0)
            GROUP BY TRIM(bodega)
            ORDER BY TRIM(bodega)
        """)
        res_bodegas = await db.execute(stmt_bodegas)
        fetch_all = res_bodegas.all()
        bodegas_stats = {r[0]: {"total": r[1], "h1": r[2], "h2": r[3], "obj2": r[4], "obj3": r[5]} for r in fetch_all}

        stmt_asig = select(AsignacionInventario)
        asignaciones = (await db.execute(stmt_asig)).scalars().all()

        parejas_por_bodega = {}
        for asig in asignaciones:
            b = asig.bodega.strip()
            parejas_por_bodega.setdefault(b, set()).add(asig.numero_pareja)

        total_bodegas = len(bodegas_stats)
        cubiertas = 0
        faltantes = []
        desglose_bodega = {}

        for bodega, stats in bodegas_stats.items():
            num_parejas = len(parejas_por_bodega.get(bodega, set()))
            esta_cubierta = num_parejas > 0
            if esta_cubierta: 
                cubiertas += 1
            else: 
                faltantes.append(bodega)

            desglose_bodega[bodega] = {
                "total": stats["total"],
                "hechos_c1": stats["h1"],
                "p_c1": round((stats["h1"] / stats["total"] * 100), 1) if stats["total"] > 0 else 0,
                "hechos_c2": stats["h2"],
                "total_c2": stats["obj2"],
                "p_c2": round((stats["h2"] / stats["obj2"] * 100), 1) if stats["obj2"] > 0 else 100 if stats["h1"] > 0 else 0,
                "cubiertos": stats["total"] if esta_cubierta else 0,
                "porcentaje": 100.0 if esta_cubierta else 0.0,
                "parejas": num_parejas,
                "items_por_pareja": ceil(stats["total"]/num_parejas) if num_parejas > 0 else 0
            }

        porcentaje = round((cubiertas / total_bodegas * 100), 1) if total_bodegas > 0 else 0

        return {
            "cobertura": porcentaje,
            "total_ubicaciones_pendientes": total_bodegas,
            "cubiertos": cubiertas,
            "faltantes": faltantes[:50],
            "desglose_bodega": desglose_bodega
        }

    @staticmethod
    def _natural_sort_key(value: str) -> list:
        """Genera una clave de ordenamiento natural que trata segmentos numéricos como números.
        Retorna tuplas (tipo, valor) para evitar comparación str vs int."""
        parts = re.split(r'(\d+)', (value or '').strip().lower())
        return [(0, int(p)) if p.isdigit() else (1, p) for p in parts if p]

    @staticmethod
    async def obtener_vista_admin_asignaciones(db: AsyncSession) -> List[Dict[str, Any]]:
        """Calcula el resumen de cada pareja para vista administrativa en el servidor."""
        # 1. Datos
        stmt_asig = select(AsignacionInventario).order_by(AsignacionInventario.numero_pareja)
        asignaciones = (await db.execute(stmt_asig)).scalars().all()
        if not asignaciones: 
            return []

        stmt_cfg = select(ConfiguracionInventario).where(ConfiguracionInventario.id == 1)
        # r_activa es útil para lógica futura, por ahora calculamos C1 y C2 estadísticamente
        _ = (await db.execute(stmt_cfg)).scalar_one_or_none()

        stmt_all = select(ConteoInventario)
        all_inv = (await db.execute(stmt_all)).scalars().all()

        # 2. Agrupación por bodega y pre-ordenamiento geográfico
        inv_by_bodega = {}
        for p in all_inv:
            bdg_key = (p.bodega or '').strip().upper()
            if bdg_key:
                inv_by_bodega.setdefault(bdg_key, []).append(p)

        # Ordenar cada bodega geográficamente una sola vez (Natural Sort)
        for bdg_name in inv_by_bodega:
            inv_by_bodega[bdg_name].sort(key=lambda x: (
                ServicioAnalyticsInventario._natural_sort_key(x.bloque),
                ServicioAnalyticsInventario._natural_sort_key(x.estante),
                ServicioAnalyticsInventario._natural_sort_key(x.nivel),
                ServicioAnalyticsInventario._natural_sort_key(x.codigo)
            ))

        # 3. Procesar cada asignación única (agrupamos por pareja-bodega para evitar duplicados en la vista)
        grouped = {}
        for a in asignaciones:
            bdg = (a.bodega or '').strip().upper()
            if not bdg: 
                continue

            key = f"{bdg}-{a.numero_pareja or a.cedula}"
            if key not in grouped:
                items_bdg = inv_by_bodega.get(bdg, [])
                
                # Calcular parejas únicas en esta bodega
                # Normalizar TODOS los numero_pareja a int para evitar TypeError str vs int vs None
                def _to_int(v):
                    try:
                        return int(v) if v is not None else 0
                    except (ValueError, TypeError):
                        return 0

                raw_parejas = {
                    _to_int(asg.numero_pareja)
                    for asg in asignaciones
                    if (asg.bodega or '').strip().upper() == bdg
                }
                parejas_bodega = sorted(raw_parejas)
                
                n_p = len(parejas_bodega)
                mi_pareja_int = _to_int(a.numero_pareja)
                mi_idx = parejas_bodega.index(mi_pareja_int) if mi_pareja_int in parejas_bodega else 0
                c_s = ceil(len(items_bdg) / n_p) if n_p > 0 else 0
                
                # CHUNK C1
                start_c1 = mi_idx * c_s
                end_c1 = min(start_c1 + c_s, len(items_bdg))
                chunk_c1 = items_bdg[start_c1:end_c1]
                contados_c1 = sum(1 for p in chunk_c1 if p.user_c1)
                prog_c1 = round((contados_c1 / len(chunk_c1) * 100)) if chunk_c1 else 0

                # CHUNK C2 (Rotación 50%)
                offset = n_p // 2
                mi_idx_c2 = (mi_idx + offset) % n_p if n_p > 0 else 0
                start_c2 = mi_idx_c2 * c_s
                end_c2 = min(start_c2 + c_s, len(items_bdg))
                chunk_c2_raw = items_bdg[start_c2:end_c2]
                
                # Filtrar solo ítems que requieren reconteo o que el operario ya trabajó en C2
                chunk_c2 = [
                    p for p in chunk_c2_raw 
                    if (p.estado in ["RECONTEO", "DISCREPANTE", "UBICACIÓN ERRÓNEA"] or p.user_c2)
                ]
                
                # Progreso Real C2: Sobre el universo de discrepancias asignadas
                contados_c2 = sum(1 for p in chunk_c2 if p.user_c2)
                prog_c2 = round((contados_c2 / len(chunk_c2) * 100)) if chunk_c2 else 100 if any(p.user_c1 for p in chunk_c2_raw) else 0

                # Discrepancias acumuladas en esta zona
                reconteo_c2_total = sum(1 for p in chunk_c2 if p.estado in ["RECONTEO", "DISCREPANTE"])

                grouped[key] = {
                    "id": a.id,
                    "bodega": a.bodega,
                    "numero_pareja": a.numero_pareja,
                    "cedula": a.cedula,
                    "nombre": a.nombre,
                    "cedula_companero": a.cedula_companero,
                    "nombre_companero": a.nombre_companero,
                    "items_c1": len(chunk_c1),
                    "progreso_c1": prog_c1,
                    "progreso_c2": prog_c2,
                    "ronda_vista": a.ronda_vista,
                    "items_c2_total": len(chunk_c2), # Total de la zona asignada para C2
                    "reconteo_pendiente_c2": reconteo_c2_total,
                    "parejas_bodega": n_p,
                    "total_bodega": len(items_bdg)
                }
        
        # Devolver ordenadas por número de pareja (normalizado a int)
        def _safe_pareja(v):
            try:
                return int(v) if v is not None else 0
            except (ValueError, TypeError):
                return 0
        return sorted(grouped.values(), key=lambda x: (x['bodega'], _safe_pareja(x['numero_pareja'])))

