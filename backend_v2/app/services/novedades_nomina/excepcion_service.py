import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlmodel import Session, select, func, and_, or_
from ...models.novedades_nomina.nomina import NominaExcepcion, NominaExcepcionHistorial

logger = logging.getLogger(__name__)

class ExcepcionService:
    @staticmethod
    async def obtener_excepciones_activas(session: Session, subcategoria: Optional[str] = None) -> List[NominaExcepcion]:
        """Obtiene las excepciones vigentes para una subcategoría."""
        now = datetime.now()
        stmt = select(NominaExcepcion).where(
            NominaExcepcion.estado == "ACTIVO",
            NominaExcepcion.fecha_inicio <= now,
            or_(NominaExcepcion.fecha_fin == None, NominaExcepcion.fecha_fin >= now)
        )
        if subcategoria:
            stmt = stmt.where(NominaExcepcion.subcategoria == subcategoria)
        
        result = await session.execute(stmt)
        return result.scalars().all()

    @staticmethod
    def registrar_historial(session: Session, excepcion_id: int, mes: int, anio: int, valor: float, mensaje: str):
        """Registra un evento en el historial de la excepción."""
        hist = NominaExcepcionHistorial(
            excepcion_id=excepcion_id,
            mes=mes,
            anio=anio,
            valor_aplicado=valor,
            mensaje=mensaje
        )
        session.add(hist)

    @staticmethod
    async def crear_excepcion(session: Session, data: Dict[str, Any], usuario: str) -> NominaExcepcion:
        """Crea una nueva excepción."""
        exc = NominaExcepcion(
            **data,
            creado_por=usuario,
            creado_en=datetime.now()
        )
        if exc.valor_configurado > 0 and (exc.saldo_actual <= 0 or exc.saldo_actual is None):
            exc.saldo_actual = exc.valor_configurado

        session.add(exc)
        await session.commit()
        await session.refresh(exc)
        return exc

    @staticmethod
    def actualizar_estado_saldo(session: Session, excepcion: NominaExcepcion, valor_descontado: float):
        """Actualiza el saldo y estado de una excepción de tipo SALDO_FAVOR."""
        if excepcion.tipo == 'SALDO_FAVOR':
            excepcion.saldo_actual -= valor_descontado
            if excepcion.saldo_actual <= 0:
                excepcion.saldo_actual = 0
                excepcion.estado = "AGOTADO"
            excepcion.actualizado_en = datetime.now()
            session.add(excepcion)

    @staticmethod
    async def aplicar_saldo_favor(session: Session, excepcion: NominaExcepcion, valor_cobro: float, mes: int, anio: int) -> float:
        """
        Aplica un saldo a favor a un cobro, disminuyendo el saldo actual.
        Implementa idempotencia: si ya se aplicó en el mismo periodo, revierte antes de aplicar.
        Retorna el valor_final_a_cobrar.
        """
        # 1. Buscar si ya se aplicó en este mes/año para esta excepción
        stmt = select(NominaExcepcionHistorial).where(
            NominaExcepcionHistorial.excepcion_id == excepcion.id,
            NominaExcepcionHistorial.mes == mes,
            NominaExcepcionHistorial.anio == anio
        )
        result = await session.execute(stmt)
        historial_previo = result.scalars().first()
        
        if historial_previo:
            # Revertir saldo anterior al saldo_actual de la excepción
            excepcion.saldo_actual += historial_previo.valor_aplicado
            # Borrar historial previo para reemplazarlo
            await session.delete(historial_previo)
        
        # 2. Calcular descuento (Opción A: Restar lo que se pueda hasta llegar a 0)
        descuento = min(valor_cobro, excepcion.saldo_actual)
        valor_final = valor_cobro - descuento
        
        # 3. Actualizar saldo y estado
        excepcion.saldo_actual -= descuento
        if excepcion.saldo_actual <= 0:
            excepcion.saldo_actual = 0
            excepcion.estado = "AGOTADO"
        else:
            excepcion.estado = "ACTIVO"
            
        excepcion.actualizado_en = datetime.now()
        
        # 4. Registrar nuevo historial si hubo descuento
        if descuento > 0:
            nuevo_hist = NominaExcepcionHistorial(
                excepcion_id=excepcion.id,
                mes=mes,
                anio=anio,
                valor_aplicado=descuento,
                mensaje=f"Aplicado saldo favor: ${descuento:,.0f}. Cobro original: ${valor_cobro:,.0f} -> Cobro final: ${valor_final:,.0f}"
            )
            session.add(nuevo_hist)
        
        session.add(excepcion)
        return valor_final
