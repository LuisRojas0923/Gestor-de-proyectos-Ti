import logging
import hashlib
from typing import List, Dict, Any, Optional
from sqlmodel import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from ...models.novedades_nomina.nomina import (
    NominaArchivo, NominaRegistroNormalizado, NominaExcepcion
)
from .excepcion_service import ExcepcionService
from .nomina_helper import NominaHelper

logger = logging.getLogger(__name__)

class NominaService:
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
        hash_archivo: str,
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
            hash_archivo=hash_archivo,
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
        # 1. Leer archivos y validar
        archivos_binarios = []
        original_filenames = []
        from fastapi import HTTPException
        if len(files) > 10:
            raise HTTPException(status_code=400, detail="Máximo 10 archivos permitidos a la vez.")

        total_payload_size = 0

        for f in files:
            file_size = getattr(f, "size", 0)
            if not file_size:
                # Si el servidor no provee f.size, leer el cursor hasta el final para saber el tamaño
                f.file.seek(0, 2)
                file_size = f.file.tell()
                f.file.seek(0)
            
            total_payload_size += file_size
            
            if total_payload_size > 50 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="El tamaño total de los archivos excede el límite de 50MB.")
                
            if file_size > 15 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="El archivo excede el tamaño máximo de 15MB.")
                
            content = await f.read()

            # Validar Magic Bytes
            if extension.lower() in ["xlsx", "zip"]:
                if not content.startswith(b"PK\x03\x04"):
                    raise HTTPException(status_code=400, detail="El archivo no es un Excel o ZIP válido (Firma OOXML incorrecta).")

                # Validar estructura y protección contra ZIP bombs
                import zipfile
                import io
                try:
                    with zipfile.ZipFile(io.BytesIO(content)) as zf:
                        infolist = zf.infolist()
                        if len(infolist) > 100:
                            raise HTTPException(status_code=400, detail="Demasiados archivos internos en el ZIP (Posible Zip Bomb).")
                            
                        total_uncompressed = 0
                        has_content_types = False
                        for info in infolist:
                            total_uncompressed += info.file_size
                            if info.compress_size > 0:
                                ratio = info.file_size / info.compress_size
                                if ratio > 100:
                                    raise HTTPException(status_code=400, detail="Relación de compresión sospechosa (posible ZIP bomb).")
                            if info.filename == "[Content_Types].xml":
                                has_content_types = True

                        if total_uncompressed > 15 * 1024 * 1024:
                            raise HTTPException(status_code=400, detail="El tamaño descomprimido excede el límite seguro de 15MB.")

                        if extension.lower() == "xlsx" and not has_content_types:
                            raise HTTPException(status_code=400, detail="El archivo XLSX no contiene estructura OOXML válida.")
                except zipfile.BadZipFile:
                    raise HTTPException(status_code=400, detail="El archivo ZIP/XLSX está corrupto.")
            elif extension.lower() == "pdf":
                if not content.startswith(b"%PDF-"):
                    raise HTTPException(status_code=400, detail="El archivo no es un PDF válido.")

            archivos_binarios.append(content)
            original_filenames.append(getattr(f, "filename", "archivo"))

        import os
        import tempfile
        import shutil
        subcat_folder = subcategoria.lower().replace(" ", "_").replace("/", "_")
        STORAGE_DIR = os.path.join("uploads", "nomina", str(anio), str(mes), subcat_folder)
        os.makedirs(STORAGE_DIR, exist_ok=True)

        ruta_almacenamiento = "memory"
        nombre_archivo = f"{subcategoria.lower().replace(' ', '_')}_{mes}_{anio}.{extension}"
        temp_file_path = None

        import zipfile
        import io

        if archivos_binarios:
            if len(archivos_binarios) == 1:
                contenido = archivos_binarios[0]
                hash_str = hashlib.sha256(contenido).hexdigest()
                # Normalizar a basename seguro antes de persisitir
                raw_name = original_filenames[0]
                nombre_archivo = os.path.basename(str(raw_name).replace('\\', '/'))
                if not nombre_archivo or nombre_archivo in ('.', '..'):
                    nombre_archivo = f"archivo.{extension}"
                ext_real = nombre_archivo.split('.')[-1].lower() if '.' in nombre_archivo else extension

                ruta_almacenamiento = os.path.join(STORAGE_DIR, f"{hash_str}.{ext_real}")

                fd, temp_file_path = tempfile.mkstemp(suffix=f".{ext_real}", dir=STORAGE_DIR)
                with os.fdopen(fd, "wb") as f_out:
                    f_out.write(contenido)

                tamaño_total = len(contenido)
            else:
                # Empaquetar múltiples archivos en un ZIP
                import zipfile
                import io
                import os

                zip_buffer = io.BytesIO()
                seen_names = set()

                with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
                    for raw_filename, content in zip(original_filenames, archivos_binarios):
                        # 1. Normalizar a basename seguro
                        safe_name = os.path.basename(str(raw_filename).replace('\\', '/'))
                        if not safe_name or safe_name in ('.', '..'):
                            safe_name = "archivo_desconocido"

                        # 2. Prevenir duplicados en el ZIP
                        base_name, ext = os.path.splitext(safe_name)
                        final_name = safe_name
                        counter = 1
                        while final_name in seen_names:
                            final_name = f"{base_name}_{counter}{ext}"
                            counter += 1
                        seen_names.add(final_name)

                        zf.writestr(final_name, content)

                contenido_zip = zip_buffer.getvalue()
                hash_str = hashlib.sha256(contenido_zip).hexdigest()
                nombre_archivo = f"{subcategoria.replace(' ', '_')}_{mes}_{anio}.zip"
                extension = "zip"
                ext_real = "zip"

                ruta_almacenamiento = os.path.join(STORAGE_DIR, f"{hash_str}.zip")
                fd, temp_file_path = tempfile.mkstemp(suffix=".zip", dir=STORAGE_DIR)
                with os.fdopen(fd, "wb") as f_out:
                    f_out.write(contenido_zip)

                tamaño_total = len(contenido_zip)

        # 2. Extraer datos usando la función específica en un hilo separado para no bloquear el event loop
        import asyncio

        def _limpiar_temp():
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.remove(temp_file_path)
                except Exception:
                    pass

        # 3. Transacción y relectura
        from sqlalchemy import text
        archivo_movido = False
        try:
            rows, summary, warnings_txt = await asyncio.to_thread(extractor_fn, archivos_binarios)
            summary.update({"mes": mes, "anio": anio})

            if not rows:
                raise HTTPException(status_code=400, detail="El archivo provisto está vacío, no contiene datos válidos o su estructura es incorrecta. Abortando.")
            # Advisory lock para prevenir concurrencia sobre el mismo periodo y subcategoría
            lock_name = f"nomina_{subcategoria}_{mes}_{anio}"
            await session.execute(text("SELECT pg_advisory_xact_lock(hashtext(:lock_name))").bindparams(lock_name=lock_name))

            excepciones = await ExcepcionService.obtener_excepciones_activas(session, subcategoria)
            mapa_erp = await NominaService.get_mapa_erp(db_erp, rows, excepciones)

            # 4. Borrar antiguos para evitar duplicados en el mismo periodo/subcat
            subcategoria_clean = subcategoria.strip()
            stmt_del = delete(NominaRegistroNormalizado).where(
                NominaRegistroNormalizado.subcategoria_final == subcategoria_clean,
                NominaRegistroNormalizado.mes_fact == mes,
                NominaRegistroNormalizado.año_fact == anio,
            )

            await session.execute(stmt_del)

            # 6. Crear entrada de archivo
            archivo = await NominaService.crear_archivo_procesado(
                session, nombre_archivo, hash_str,
                tamaño_total if archivos_binarios else 0, extension, mes, anio, categoria, subcategoria, ruta_almacenamiento
            )

            # 7. Persistir registros (con excepciones)
            registros = await NominaService.persistir_registros_normalizados(
                session, archivo.id, mes, anio, rows, categoria, subcategoria_clean, mapa_erp, excepciones
            )

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

            # 9. Atomic publish: Mover el temporal a la ruta final ANTES del commit
            if temp_file_path and os.path.exists(temp_file_path):
                if not os.path.exists(ruta_almacenamiento):
                    shutil.move(temp_file_path, ruta_almacenamiento)
                    archivo_movido = True
                else:
                    os.remove(temp_file_path)

            await session.commit()

            return {
                "filas": filas_frontend,
                "rows": filas_frontend,
                "summary": summary,
                "warnings": warnings_txt,
                "warnings_detalle": warnings_detalle,
                "archivo_id": archivo.id
            }

        except Exception as e:
            await session.rollback()
            _limpiar_temp()
            # Rollback físico: si se movió el archivo pero falló el commit, eliminar el archivo final
            if archivo_movido and os.path.exists(ruta_almacenamiento):
                try:
                    os.remove(ruta_almacenamiento)
                except Exception:
                    pass
            logger.error(f"FALLO CRÍTICO en flujo {subcategoria}: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Error en procesamiento: {str(e)}")
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
