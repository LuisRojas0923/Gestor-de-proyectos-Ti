import re
from math import ceil
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import or_, func
from sqlmodel import select
from ...models.inventario.conteo import (
    ConteoInventario, 
    AsignacionInventario,
)

class ServicioInventario:
    @staticmethod
    def _natural_sort_key(value: str) -> list:
        """Genera una clave de ordenamiento natural que trata segmentos numéricos como números.
        Retorna tuplas (tipo, valor) para evitar comparación str vs int."""
        parts = re.split(r'(\d+)', (value or '').strip().lower())
        return [(0, int(p)) if p.isdigit() else (1, p) for p in parts if p]

    @staticmethod
    async def registrar_conteo_unidad(
        item_id: int, 
        cantidad: float, 
        observaciones: str, 
        ronda: int, 
        usuario_cedula: str, 
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Procesa el guardado de un ítem y actualiza la diferencia total en todo el SKU."""
        stmt = select(ConteoInventario).where(ConteoInventario.id == item_id)
        result = await db.execute(stmt)
        item = result.scalar_one_or_none()
        if not item: 
            return {"exito": False, "error": "No hallado"}

        # Guardar en la ronda solicitada por el usuario (autogestionada)
        setattr(item, f"cant_c{ronda}", cantidad)
        setattr(item, f"obs_c{ronda}", observaciones)
        setattr(item, f"user_c{ronda}", usuario_cedula)

        # Inteligencia de estado local
        teorico_local = (item.cantidad_sistema or 0.0) + (item.invporlegalizar or 0.0)
        item.cantidad_final = teorico_local
        item.diferencia = cantidad - teorico_local

        if ronda == 1: 
            nuevo_estado = "CONCILIADO" if abs(cantidad - teorico_local) < 0.01 else "RECONTEO"
        elif ronda == 2: 
            nuevo_estado = "CONCILIADO" if abs(cantidad - item.cant_c1) < 0.01 else "RECONTEO"
        elif ronda == 3: 
            nuevo_estado = "CONCILIADO" if (abs(cantidad - item.cant_c1) < 0.01 or abs(cantidad - item.cant_c2) < 0.01) else "DISCREPANTE"
        else: 
            nuevo_estado = "CONCILIADO"

        # Sincronización multidimensional (SKU global)
        stmt_sku = select(ConteoInventario).where(
            ConteoInventario.codigo == item.codigo,
            ConteoInventario.conteo == item.conteo
        )
        rows_sku = (await db.execute(stmt_sku)).scalars().all()
        
        sum_fisico = 0.0
        teorico_sku = 0.0
        for r in rows_sku:
            # Usar la ronda del parámetro para el cálculo de diferencia total
            f = getattr(r, f"cant_c{ronda}") or 0.0
            if r.id == item.id: 
                f = cantidad
            sum_fisico += f
            if teorico_sku == 0: 
                teorico_sku = (r.cantidad_sistema or 0.0) + (r.invporlegalizar or 0.0)

        dif_total = sum_fisico - teorico_sku
        for r in rows_sku:
            r.diferencia_total = dif_total
            if abs(dif_total) < 0.01: 
                r.estado = "CONCILIADO"
            elif r.id == item.id: 
                r.estado = nuevo_estado

        if abs(dif_total) < 0.01: 
            item.estado = "CONCILIADO"
        else: 
            item.estado = nuevo_estado

        await db.commit()
        return {"exito": True, "estado": item.estado, "diferencia_local": item.diferencia}

    @staticmethod
    async def obtener_productos_por_operario(cedula_raw: str, db: AsyncSession) -> Dict[str, Any]:
        """Lógica de asignación dinámica: Retorna C1 y C2 completos para autogestión en portal."""
        cedula_norm = cedula_raw.strip().lstrip('0')
        
        # 1. Asignaciones
        stmt_asig = select(AsignacionInventario).where(or_(
            func.ltrim(func.trim(AsignacionInventario.cedula), '0') == cedula_norm,
            func.ltrim(func.trim(AsignacionInventario.cedula_companero), '0') == cedula_norm
        ))
        asignaciones = (await db.execute(stmt_asig)).scalars().all()
        if not asignaciones: 
            return {"items_c1": [], "items_c2": [], "progreso_c1": 0, "bodega": "N/A"}

        bodegas = set((a.bodega or '').strip().upper() for a in asignaciones)
        mi_pareja_num = asignaciones[0].numero_pareja

        # 2. Productos de esas bodegas (sin filtros de estado para obtener listas completas)
        stmt_inv = select(ConteoInventario).where(func.trim(func.upper(ConteoInventario.bodega)).in_(bodegas))
        all_inv = (await db.execute(stmt_inv)).scalars().all()

        # 3. Parejas por bodega
        stmt_todas = select(AsignacionInventario).where(func.trim(func.upper(AsignacionInventario.bodega)).in_(bodegas))
        todas_asig = (await db.execute(stmt_todas)).scalars().all()

        items_c1_acum = []
        items_c2_acum = []
        bodega_label = ", ".join(bodegas)

        def _to_int(v):
            try:
                return int(v) if v is not None else 0
            except Exception:
                return 0

        for bdg in bodegas:
            # Lista ordenada de parejas (con seguridad de tipo para evitar errores de comparación)
            parejas = sorted(
                set(_to_int(a.numero_pareja) for a in todas_asig if (a.bodega or '').strip().upper() == bdg)
            )
            mi_asig_bdg = next((a for a in asignaciones if (a.bodega or '').strip().upper() == bdg), None)
            mi_pareja_int = _to_int(mi_asig_bdg.numero_pareja) if mi_asig_bdg else _to_int(mi_pareja_num)

            if mi_pareja_int not in parejas: 
                continue

            items_bdg = sorted(
                [p for p in all_inv if (p.bodega or '').strip().upper() == bdg],
                key=lambda p: (
                    ServicioInventario._natural_sort_key(p.bloque or ''),
                    ServicioInventario._natural_sort_key(p.estante or ''),
                    ServicioInventario._natural_sort_key(p.nivel or ''),
                    ServicioInventario._natural_sort_key(p.codigo or '')
                )
            )
            if not items_bdg: 
                continue

            n_p = len(parejas)
            idx_c1 = parejas.index(mi_pareja_int)
            c_s = ceil(len(items_bdg) / n_p)
            
            # Segmento C1
            chk_c1 = items_bdg[idx_c1*c_s : min((idx_c1+1)*c_s, len(items_bdg))]
            items_c1_acum.extend(chk_c1)

            # Segmento C2 (Rotación 50%)
            idx_c2 = (idx_c1 + (n_p // 2)) % n_p
            chk_c2_raw = items_bdg[idx_c2*c_s : min((idx_c2+1)*c_s, len(items_bdg))]
            
            # FILTRO DINÁMICO: C2 solo muestra lo que requiere intervención o lo ya trabajado por el usuario
            chk_c2 = [
                p for p in chk_c2_raw 
                if (p.estado in ['RECONTEO', 'DISCREPANTE', 'UBICACIÓN ERRÓNEA'] or p.user_c2 is not None)
            ]
            items_c2_acum.extend(chk_c2)

        # Cálculo de progreso para la UI y validaciones de negocio
        contados_c1 = sum(1 for p in items_c1_acum if p.user_c1 is not None)
        progreso_c1 = round(contados_c1 / len(items_c1_acum) * 100) if items_c1_acum else 0
        
        contados_c2 = sum(1 for p in items_c2_acum if p.user_c2 is not None)
        progreso_c2 = round(contados_c2 / len(items_c2_acum) * 100) if items_c2_acum else 100
        
        def _to_dict(p):
            return {
                "id": p.id, "bodega": p.bodega, "bloque": p.bloque, "estante": p.estante, "nivel": p.nivel,
                "codigo": p.codigo, "descripcion": p.descripcion, "unidad": p.unidad,
                "cant_c1": p.cant_c1, "cant_c2": p.cant_c2, "cant_c3": p.cant_c3, "cant_c4": p.cant_c4,
                "obs_c1": p.obs_c1, "obs_c2": p.obs_c2, "obs_c3": p.obs_c3, "obs_c4": p.obs_c4,
                "user_c1": p.user_c1, "user_c2": p.user_c2, "user_c3": p.user_c3, "user_c4": p.user_c4,
                "estado": p.estado
            }

        # Obtener ronda_vista del primer registro de asignación
        ronda_vista = asignaciones[0].ronda_vista if asignaciones else 1

        # Determinar el nombre y cédula del compañero dinámicamente
        mi_asig = asignaciones[0]
        if mi_asig.cedula and mi_asig.cedula.strip().lstrip('0') == cedula_norm:
            companero_nom = mi_asig.nombre_companero
            companero_ced = mi_asig.cedula_companero
        else:
            companero_nom = mi_asig.nombre
            companero_ced = mi_asig.cedula

        return {
            "items_c1": [_to_dict(p) for p in items_c1_acum],
            "items_c2": [_to_dict(p) for p in items_c2_acum],
            "progreso_c1": progreso_c1,
            "progreso_c2": progreso_c2,
            "ronda_vista": ronda_vista,
            "bodega": bodega_label,
            "numero_pareja": mi_pareja_num,
            "nombre_companero": companero_nom,
            "cedula_companero": companero_ced
        }
