import logging
import hashlib
from typing import List, Dict, Any, Optional
from sqlmodel import select, delete
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from ...models.novedades_nomina.nomina import (
    NominaArchivo, NominaRegistroNormalizado, NominaExcepcion
)
from .excepcion_service import ExcepcionService
from .errores import ErrorEstructuraNomina
from .nomina_helper import NominaHelper

logger = logging.getLogger(__name__)

class NominaService:
    @staticmethod
    async def _bloquear_periodo(
        session: AsyncSession,
        subcategoria: str,
        mes: int,
        anio: int,
    ) -> None:
        scope = f"nomina:{subcategoria.strip().upper()}:{anio}:{mes}"
        await session.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:scope, 0))"),
            {"scope": scope},
        )

    @staticmethod
    async def get_mapa_erp(db_erp, rows: List[Dict[str, Any]], excepciones: List[NominaExcepcion] = []) -> Dict[str, Any]:
        """Obtiene un mapa de empleados desde el ERP delegando en NominaHelper."""
        return await NominaHelper.get_mapa_erp(db_erp, rows, excepciones)

    @staticmethod
    async def persistir_registros_normalizados(
        session: AsyncSession,
        archivo_id: int,
        mes: int,
        anio: int,
        rows: List[Dict[str, Any]],
        categoria: str,
        subcategoria: str,
        mapa_erp: Dict[str, Any],
        excepciones_activas: List[NominaExcepcion] = [],
        estado_default: str = "OK"
    ) -> List[NominaRegistroNormalizado]:
        """Persiste una lista de registros normalizados delegando en NominaHelper."""
        return await NominaHelper.persistir_registros_normalizados(
            session=session,
            archivo_id=archivo_id,
            mes=mes,
            anio=anio,
            rows=rows,
            categoria=categoria,
            subcategoria=subcategoria,
            mapa_erp=mapa_erp,
            excepciones_activas=excepciones_activas,
            estado_default=estado_default
        )

    @staticmethod
    async def crear_archivo_procesado(
        session: AsyncSession,
        nombre: str,
        contenido: bytes,
        size: int,
        ext: str,
        mes: int,
        anio: int,
        categoria: str,
        subcategoria: str,
        ruta_almacenamiento: str = "memory"
    ) -> NominaArchivo:
        """Crea un objeto NominaArchivo marcado como procesado delegando en NominaHelper."""
        return await NominaHelper.crear_archivo_procesado(
            session=session,
            nombre=nombre,
            contenido=contenido,
            size=size,
            ext=ext,
            mes=mes,
            anio=anio,
            categoria=categoria,
            subcategoria=subcategoria,
            ruta_almacenamiento=ruta_almacenamiento
        )
    @staticmethod
    async def procesar_flujo(
        session: AsyncSession,
        db_erp: Any,
        files: List[Any],
        categoria: str,
        subcategoria: str,
        extractor_fn: Any,
        extension: str,
        mes: int,
        anio: int
    ) -> Dict[str, Any]:
        """Flujo unificado para procesar archivos de nómina especializados."""
        # 1. Leer archivos. No se escribe en disco hasta validar la extracción completa.
        archivos_binarios = []
        original_filenames = []
        for f in files:
            content = await f.read()
            archivos_binarios.append(content)
            original_filenames.append(getattr(f, "filename", "archivo"))
            
        # 2. Extraer datos usando la función específica en un hilo separado para no bloquear el event loop
        import asyncio
        from fastapi import HTTPException

        try:
            rows, summary, warnings_txt = await asyncio.to_thread(
                extractor_fn, archivos_binarios
            )
        except ErrorEstructuraNomina as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(
                status_code=422,
                detail="El archivo no cumple la estructura requerida para esta nómina.",
            ) from exc
        summary.update({"mes": mes, "anio": anio})

        # 2b. Protección contra pérdida de datos: si la extracción falla o devuelve 0 filas válidas,
        # se aborta la operación ANTES de eliminar registros existentes en el periodo.
        if not rows:
            detalle = f" Detalle: {'; '.join(warnings_txt)}" if warnings_txt else ""
            raise HTTPException(
                status_code=400,
                detail=f"No se pudieron extraer registros válidos del archivo proporcionado. La operación ha sido cancelada para preservar los datos existentes del periodo.{detalle}"
            )

        import os
        from uuid import uuid4

        contenido = archivos_binarios[0]
        nombre_archivo = os.path.basename(original_filenames[0])
        hash_str = hashlib.sha256(contenido).hexdigest()
        ruta_almacenamiento = os.path.join(
            "uploads", "nomina", f"{hash_str}_{uuid4().hex}.{extension}"
        )
        ruta_creada = False
        transaccion_confirmada = False
        
        # 4. Borrar antiguos para evitar duplicados en el mismo periodo/subcat
        subcategoria_clean = subcategoria.strip()
        stmt_del = delete(NominaRegistroNormalizado).where(
            NominaRegistroNormalizado.subcategoria_final == subcategoria_clean,
            NominaRegistroNormalizado.mes_fact == mes,
            NominaRegistroNormalizado.año_fact == anio,
        )

        def _guardar_archivo() -> None:
            directorio = os.path.dirname(ruta_almacenamiento)
            os.makedirs(directorio, exist_ok=True)
            ruta_temporal = f"{ruta_almacenamiento}.tmp"
            try:
                with open(ruta_temporal, "xb") as f_out:
                    f_out.write(contenido)
                    f_out.flush()
                    os.fsync(f_out.fileno())
                os.replace(ruta_temporal, ruta_almacenamiento)
            except BaseException:
                try:
                    os.remove(ruta_temporal)
                except FileNotFoundError:
                    pass
                raise

        try:
            await NominaService._bloquear_periodo(
                session,
                subcategoria=subcategoria_clean,
                mes=mes,
                anio=anio,
            )
            excepciones = await ExcepcionService.obtener_excepciones_activas(
                session,
                subcategoria,
                bloquear=True,
                mes=mes,
                anio=anio,
            )
            mapa_erp = await NominaService.get_mapa_erp(
                db_erp,
                rows,
                excepciones,
            )
            tarea_guardado = asyncio.create_task(asyncio.to_thread(_guardar_archivo))
            try:
                await asyncio.shield(tarea_guardado)
                ruta_creada = True
            except asyncio.CancelledError:
                await tarea_guardado
                ruta_creada = True
                raise

            await session.execute(stmt_del)
            
            # 6. Crear entrada de archivo
            archivo = await NominaService.crear_archivo_procesado(
                session, nombre_archivo, contenido, len(contenido), extension,
                mes, anio, categoria, subcategoria, ruta_almacenamiento
            )

            # 7. Persistir registros (con excepciones)
            registros = await NominaService.persistir_registros_normalizados(
                session, archivo.id, mes, anio, rows, categoria, subcategoria_clean, mapa_erp, excepciones
            )
            
            tarea_commit = asyncio.create_task(session.commit())
            try:
                await asyncio.shield(tarea_commit)
                transaccion_confirmada = True
            except asyncio.CancelledError:
                await tarea_commit
                transaccion_confirmada = True
                raise
            
            # 8. Formatear respuesta para el frontend (Compatible con múltiples versiones)
            filas_frontend = []
            warnings_detalle = []
            for r in registros:
                # Registro "bilingüe" para soportar frontends viejos y nuevos
                base_item = {
                    # Minúsculas (Estándar Nuevo)
                    "cedula": r.cedula,
                    "nombre": r.nombre_asociado,
                    "valor": r.valor,
                    "valor_rdc": r.valor_rdc,
                    "valor_colaborador": r.valor_colaborador,
                    "empresa": r.empresa,
                    "concepto": r.concepto,
                    "ciudad": r.ciudad,
                    "observaciones": r.observaciones,
                    
                    # Mayúsculas / Variaciones (Legacy)
                    "CEDULA": r.cedula,
                    "NOMBRE": r.nombre_asociado,
                    "EMPLEADO": r.nombre_asociado,
                    "nombre_asociado": r.nombre_asociado,
                    "VALOR": r.valor,
                    "VALOR MES": r.valor,
                    "VALOR_RDC": r.valor_rdc,
                    "VALOR_COLABORADOR": r.valor_colaborador,
                    "EMPRESA": r.empresa,
                    "CONCEPTO": r.concepto,
                    "CIUDAD": r.ciudad,
                    "OBSERVACIONES": r.observaciones,
                    
                    # Campos específicos Planillas
                    "horas": r.horas,
                    "dias": r.dias,
                    "HORAS": r.horas,
                    "DIAS": r.dias,
                    
                    # Campos específicos
                    "estado_erp": r.estado_validacion
                }
                if r.estado_validacion != "OK":
                    warnings_detalle.append({
                        "cedula": r.cedula,
                        "nombre": r.nombre_asociado,
                        "motivo": r.estado_validacion
                    })
                
                # REGLA: No mostrar en tabla principal si está retirado o sin establecimiento (ya están en warnings)
                # A menos que sea una excepción autorizada
                if r.estado_validacion in ["RETIRADO", "SIN_ESTABLECIMIENTO", "EXCEPCION_EXONERADO"]:
                    continue
                    
                filas_frontend.append(base_item)

            # Agrupar por cédula: sumar valores cuando múltiples registros comparten cédula final
            filas_frontend = NominaService._agrupar_por_cedula(filas_frontend)

            # Asegurar consistencia del summary
            summary.update({
                "total_asociados": len(set(r.cedula for r in registros)),
                "total_filas": len(registros),
                "total_valor": sum(r.valor for r in registros),
                "total_horas": round(sum(r.horas or 0 for r in registros), 2),
                "total_dias": round(sum(r.dias or 0 for r in registros), 2),
                "mes": mes,
                "anio": anio
            })

            logger.info(f"ÉXITO: Procesados {len(registros)} registros para {subcategoria}")
            # Retornar tanto 'filas' como 'rows' para máxima compatibilidad
            return {
                "filas": filas_frontend,
                "rows": filas_frontend,
                "summary": summary,
                "warnings": warnings_txt,
                "warnings_detalle": warnings_detalle,
                "archivo_id": archivo.id
            }
            
        except BaseException:
            await asyncio.shield(session.rollback())
            if ruta_creada and not transaccion_confirmada:
                try:
                    await asyncio.shield(
                        asyncio.to_thread(os.remove, ruta_almacenamiento)
                    )
                except FileNotFoundError:
                    pass
            logger.error(f"FALLO CRÍTICO en flujo {subcategoria}", exc_info=True)
            raise
    @staticmethod
    async def obtener_datos_periodo(
        session: AsyncSession,
        subcategoria: str,
        mes: int,
        anio: int
    ) -> Dict[str, Any]:
        """Obtiene los registros normalizados de un periodo específico."""
        try:
            subcat_clean = subcategoria.strip()
            stmt = select(NominaRegistroNormalizado).where(
                NominaRegistroNormalizado.subcategoria_final == subcat_clean,
                NominaRegistroNormalizado.mes_fact == mes,
                NominaRegistroNormalizado.año_fact == anio
            )
            result = await session.execute(stmt)
            filas = result.scalars().all()
            
            # Formatear respuesta compatible con frontend (Bilingüe)
            filas_frontend = []
            warnings_detalle = []
            total_valor = 0
            
            for f in filas:
                total_valor += f.valor
                base_item = {
                    # Minúsculas
                    "cedula": f.cedula,
                    "nombre": f.nombre_asociado,
                    "valor": f.valor,
                    "valor_rdc": f.valor_rdc,
                    "valor_colaborador": f.valor_colaborador,
                    "empresa": f.empresa,
                    "concepto": f.concepto,
                    "ciudad": f.ciudad,
                    "observaciones": f.observaciones,
                    
                    # Mayúsculas / Variaciones
                    "CEDULA": f.cedula,
                    "NOMBRE": f.nombre_asociado,
                    "EMPLEADO": f.nombre_asociado,
                    "nombre_asociado": f.nombre_asociado,
                    "VALOR": f.valor,
                    "VALOR MES": f.valor,
                    "VALOR_RDC": f.valor_rdc,
                    "VALOR_COLABORADOR": f.valor_colaborador,
                    "EMPRESA": f.empresa,
                    "CONCEPTO": f.concepto,
                    "CIUDAD": f.ciudad,
                    "OBSERVACIONES": f.observaciones,
                    
                    # Campos específicos Planillas
                    "horas": f.horas,
                    "dias": f.dias,
                    "HORAS": f.horas,
                    "DIAS": f.dias,
                    
                    "estado_erp": f.estado_validacion
                }
                if f.estado_validacion != "OK":
                    warnings_detalle.append({
                        "cedula": f.cedula,
                        "nombre": f.nombre_asociado,
                        "motivo": f.estado_validacion
                    })
                
                # REGLA: No mostrar en tabla principal si está retirado o sin establecimiento
                if f.estado_validacion in ["RETIRADO", "SIN_ESTABLECIMIENTO", "EXCEPCION_EXONERADO"]:
                    if subcat_clean != "COMISIONES":
                        continue
                    
                filas_frontend.append(base_item)

            # Agrupar por cédula: sumar valores cuando múltiples registros comparten cédula final
            filas_frontend = NominaService._agrupar_por_cedula(filas_frontend)

            return {
                "filas": filas_frontend,
                "rows": filas_frontend,
                "summary": {
                    "total_asociados": len(set(f.cedula for f in filas)),
                    "total_filas": len(filas),
                    "total_valor": total_valor,
                    "total_horas": round(sum(f.horas or 0 for f in filas), 2),
                    "total_dias": round(sum(f.dias or 0 for f in filas), 2),
                    "mes": mes,
                    "anio": anio
                },
                "warnings": [],
                "warnings_detalle": warnings_detalle
            }
        except Exception as e:
            logger.error(f"Error al obtener datos de {subcategoria}: {str(e)}")
            raise e

    @staticmethod
    def _agrupar_por_cedula(filas: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Agrupa filas por cédula delegando en NominaHelper."""
        return NominaHelper.agrupar_por_cedula(filas)
