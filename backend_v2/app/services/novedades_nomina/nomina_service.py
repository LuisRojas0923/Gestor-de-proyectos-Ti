import logging
import hashlib
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlmodel import Session, select, func, delete
from ...models.novedades_nomina.nomina import (
    NominaArchivo, NominaRegistroCrudo, NominaRegistroNormalizado, NominaExcepcion
)
from ...services.erp.empleados_service import EmpleadosService
from .excepcion_service import ExcepcionService

logger = logging.getLogger(__name__)

class NominaService:
    @staticmethod
    async def get_mapa_erp(db_erp, rows: List[Dict[str, Any]], excepciones: List[NominaExcepcion] = []) -> Dict[str, Any]:
        """Obtiene un mapa de empleados desde el ERP por cédula, incluyendo pagadores de excepciones."""
        if not db_erp:
            return {}
        
        # Recopilar cédulas del archivo
        cedulas_unicas = set(str(r["cedula"]) for r in rows)
        
        # Añadir cédulas de pagadores de excepciones
        for ex in excepciones:
            if ex.tipo in ('PAGO_TERCERO', 'PORCENTAJE_EMPRESA') and ex.pagador_cedula:
                cedulas_unicas.add(str(ex.pagador_cedula))
            # También para inyección de saldo a favor por si no están en el archivo
            if ex.tipo == 'SALDO_FAVOR' and ex.cedula:
                cedulas_unicas.add(str(ex.cedula))
                
        return EmpleadosService.consultar_empleados_bulk(db_erp, list(cedulas_unicas))

    @staticmethod
    async def persistir_registros_normalizados(
        session: Session,
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
        """Persiste una lista de registros normalizados en la base de datos aplicando excepciones."""
        registros = []
        cedulas_procesadas = set()
        # 0. Crear mapa de excepciones para búsqueda rápida O(1)
        mapa_ex = {str(e.cedula): e for e in excepciones_activas}
        
        # 1. Procesar registros que vienen del archivo
        for i, row in enumerate(rows):
            cedula_original = str(row["cedula"])
            cedulas_procesadas.add(cedula_original)
            
            info_original = mapa_erp.get(cedula_original)
            valor_final = row["valor"]
            concepto_final = row["concepto"]
            cedula_final = cedula_original
            # Buscar excepción vigente para este colaborador y subcategoría
            ex = mapa_ex.get(cedula_original)
            
            # Fallback de nombre: ERP -> Excepción (Manual) -> Archivo
            nombre_final = info_original["nombre"] if info_original else (ex.nombre_asociado if ex and ex.nombre_asociado else row.get("nombre_asociado", ""))
            empresa_final = info_original["empresa"] if info_original else "N/A"
            observacion_ex = ""
            
            estado_val = estado_default
            
            # Aplicar lógica de excepciones (con soporte para herencia de beneficios)
            if ex:
                # --- FASE 1: Redirección de cobro (Vínculo Beneficiario -> Titular) ---
                if ex.tipo == 'PAGO_TERCERO' and ex.pagador_cedula:
                    msg_origen = f" (Original: {cedula_original})"
                    cedula_final = ex.pagador_cedula
                    info_original = mapa_erp.get(cedula_final) # Actualizamos info al titular para validar su estado ERP
                    nombre_final = info_original["nombre"] if info_original else f"TITULAR: {cedula_final}"
                    empresa_final = info_original["empresa"] if info_original else "N/A"
                    
                    # RE-EVALUAR: ¿El titular tiene un beneficio propio?
                    ex = mapa_ex.get(cedula_final)
                    if not ex or ex.tipo == 'PAGO_TERCERO':
                        estado_val = "EXCEPCION_PAGO_TERCERO"
                        observacion_ex = f"Pago asumido por titular{msg_origen}"

                # --- FASE 2: Aplicación del beneficio final (Sea del original o heredado) ---
                if ex:
                    if ex.tipo == 'EXCLUSION':
                        valor_final = 0
                        estado_val = "EXCEPCION_EXCLUIDO"
                        observacion_ex = f"Excluido por: {ex.observacion}"
                    elif ex.tipo == 'VALOR_FIJO':
                        valor_final = ex.valor_configurado
                        estado_val = "EXCEPCION_VALOR_FIJO"
                        observacion_ex = f"Valor fijo aplicado: {ex.valor_configurado}"
                    elif ex.tipo == 'EXONERACION':
                        # Se aplica valor 0 siempre por petición del usuario, independientemente del ERP
                        valor_final = 0
                        estado_val = "EXCEPCION_EXONERADO"
                        if info_original and str(info_original.get("estado", "")).strip().upper() == "ACTIVO":
                            observacion_ex = f"Exonerado de pago: {ex.observacion}"
                        else:
                            observacion_ex = f"Exonerado (Sin validación ERP): {ex.observacion}"
                    elif ex.tipo == 'PORCENTAJE_EMPRESA':
                        # Si tiene pagador_cedula, redirigir al pagador (como PAGO_TERCERO)
                        info_target = info_original
                        if ex.pagador_cedula:
                            cedula_final = ex.pagador_cedula
                            info_target = mapa_erp.get(cedula_final)
                            if info_target:
                                nombre_final = info_target["nombre"]
                                empresa_final = info_target["empresa"]
                            else:
                                nombre_final = f"PAGO TERCERO: {cedula_final}"

                        # El pagador (o la persona original) debe estar activo en ERP
                        if info_target and str(info_target.get("estado", "")).strip().upper() == "ACTIVO":
                            porcentaje = ex.valor_configurado  # ej: 50 = 50%
                            # Incluir IVA en la base de cálculo para % empresa
                            iva_row = row.get("iva", 0) or 0
                            valor_base = valor_final + iva_row
                            descuento_empresa = round(valor_base * (porcentaje / 100), 2)
                            valor_final = round(valor_base - descuento_empresa, 2)
                            estado_val = "EXCEPCION_PORCENTAJE_EMPRESA"
                            origen = f" (Original: {cedula_original})" if ex.pagador_cedula else ""
                            observacion_ex = f"Empresa asume {porcentaje}% (${descuento_empresa:,.0f}). Cobro: ${valor_final:,.0f}{origen}"
                        else:
                            estado_val = "ERROR_PORCENTAJE_NO_ACTIVO"
                            observacion_ex = "Porcentaje empresa requiere empleado activo en ERP"
                    elif ex.tipo == 'RETIRADO_AUTORIZADO':
                        estado_val = "EXCEPCION_AUTORIZADA"
                        observacion_ex = f"Retirado Autorizado: {ex.observacion}"
                    elif ex.tipo == 'CONTRATISTAS':
                        estado_val = "EXCEPCION_AUTORIZADA"
                        observacion_ex = f"Contratista: {ex.observacion}"
                    elif ex.tipo == 'SALDO_FAVOR':
                        valor_orig = valor_final
                        valor_final = await ExcepcionService.aplicar_saldo_favor(session, ex, valor_orig, mes, anio)
                        estado_val = "EXCEPCION_SALDO_FAVOR"
                        observacion_ex = f"Saldo favor aplicado. Cobro: ${valor_orig:,.0f} -> ${valor_final:,.0f}"

            # Lógica de estados si no hay excepción dominante que autorice
            if estado_val == estado_default:
                if not info_original:
                    estado_val = "SIN_ESTABLECIMIENTO"
                    valor_final = 0 # No se contabiliza si no está en ERP y no hay excepción
                elif str(info_original.get("estado", "")).strip().upper() != "ACTIVO":
                    estado_val = "RETIRADO"
                    valor_final = 0 # No se contabiliza si está retirado y no hay excepción

            reg = NominaRegistroNormalizado(
                archivo_id=archivo_id,
                fecha_creacion=datetime.now(),
                mes_fact=mes,
                año_fact=anio,
                cedula=cedula_final,
                nombre_asociado=nombre_final,
                valor=valor_final,
                empresa=empresa_final,
                concepto=concepto_final,
                categoria_final=categoria,
                subcategoria_final=subcategoria.strip(),
                estado_validacion=estado_val,
                horas=row.get("horas", 0),
                dias=row.get("dias", 0),
                fila_origen=i + 1,
            )
            session.add(reg)
            registros.append(reg)

        # 2. Inyectar registros de excepciones que NO están en el archivo (Saldo a Favor, Contratistas, Retirados Autorizados)
        for ex in excepciones_activas:
            if ex.cedula not in cedulas_procesadas:
                inyectar = False
                descuento = 0
                estado_val = "OK"
                if ex.tipo == 'SALDO_FAVOR' and ex.saldo_actual > 0:
                    inyectar = True
                    valor_orig = ex.valor_configurado # El valor a cobrar por defecto
                    descuento = await ExcepcionService.aplicar_saldo_favor(session, ex, valor_orig, mes, anio)
                    estado_val = "EXCEPCION_SALDO_FAVOR"
                
                elif ex.tipo == 'CONTRATISTAS':
                    inyectar = True
                    descuento = ex.valor_configurado
                    estado_val = "EXCEPCION_AUTORIZADA"
                
                elif ex.tipo == 'RETIRADO_AUTORIZADO' and ex.valor_configurado > 0:
                    inyectar = True
                    descuento = ex.valor_configurado
                    estado_val = "EXCEPCION_AUTORIZADA"

                if inyectar:
                    info = mapa_erp.get(ex.cedula)
                    reg = NominaRegistroNormalizado(
                        archivo_id=archivo_id,
                        fecha_creacion=datetime.now(),
                        mes_fact=mes,
                        año_fact=anio,
                        cedula=ex.cedula,
                        nombre_asociado=ex.nombre_asociado or (info["nombre"] if info else "COLABORADOR SIN NOMBRE"),
                        valor=descuento,
                        empresa=info["empresa"] if info else "N/A",
                        concepto=f"{subcategoria} (EXCEPCION)",
                        categoria_final=categoria,
                        subcategoria_final=subcategoria.strip(),
                        estado_validacion=estado_val,
                        horas=0,
                        dias=0,
                        fila_origen=0
                    )
                    session.add(reg)
                    registros.append(reg)

        await session.flush()
        return registros

    @staticmethod
    async def crear_archivo_procesado(
        session: Session,
        nombre: str,
        content_prefix: bytes,
        size: int,
        ext: str,
        mes: int,
        anio: int,
        categoria: str,
        subcategoria: str,
        ruta_almacenamiento: str = "memory"
    ) -> NominaArchivo:
        """Crea un objeto NominaArchivo marcado como procesado."""
        archivo = NominaArchivo(
            nombre_archivo=nombre,
            hash_archivo=hashlib.md5(content_prefix).hexdigest(),
            tamaño_bytes=size,
            tipo_archivo=ext,
            ruta_almacenamiento=ruta_almacenamiento,
            mes_fact=mes,
            año_fact=anio,
            categoria=categoria,
            subcategoria=subcategoria.strip(),
            estado="Procesado",
        )
        session.add(archivo)
        await session.flush()
        return archivo
    @staticmethod
    async def procesar_flujo(
        session: Session,
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
        # 1. Leer archivos y guardar el primero físicamente
        archivos_binarios = []
        original_filenames = []
        for f in files:
            content = await f.read()
            archivos_binarios.append(content)
            original_filenames.append(getattr(f, "filename", "archivo"))
            
        import os
        STORAGE_DIR = "uploads/nomina"
        os.makedirs(STORAGE_DIR, exist_ok=True)
        
        ruta_almacenamiento = "memory"
        nombre_archivo = f"{subcategoria.lower().replace(' ', '_')}_{mes}_{anio}.{extension}"
        
        if archivos_binarios:
            contenido = archivos_binarios[0]
            hash_str = hashlib.md5(contenido).hexdigest()
            nombre_archivo = original_filenames[0]
            ext_real = nombre_archivo.split('.')[-1].lower() if '.' in nombre_archivo else extension
            
            ruta_almacenamiento = os.path.join(STORAGE_DIR, f"{hash_str}.{ext_real}")
            
            # Guardamos el archivo original intacto para descargas y auditoría
            with open(ruta_almacenamiento, "wb") as f_out:
                f_out.write(contenido)
        
        # 2. Extraer datos usando la función específica en un hilo separado para no bloquear el event loop
        import asyncio
        rows, summary, warnings_txt = await asyncio.to_thread(extractor_fn, archivos_binarios)
        summary.update({"mes": mes, "anio": anio})

        # 3. Obtener info ERP y Excepciones
        excepciones = await ExcepcionService.obtener_excepciones_activas(session, subcategoria)
        mapa_erp = await NominaService.get_mapa_erp(db_erp, rows, excepciones)
        
        # 4. Borrar antiguos para evitar duplicados en el mismo periodo/subcat
        subcategoria_clean = subcategoria.strip()
        stmt_del = delete(NominaRegistroNormalizado).where(
            NominaRegistroNormalizado.subcategoria_final == subcategoria_clean,
            NominaRegistroNormalizado.mes_fact == mes,
            NominaRegistroNormalizado.año_fact == anio,
        )
        
        try:
            await session.execute(stmt_del)
            
            # 6. Crear entrada de archivo
            archivo = await NominaService.crear_archivo_procesado(
                session, nombre_archivo, archivos_binarios[0][:1024] if archivos_binarios else b"", 
                sum(len(b) for b in archivos_binarios), extension, mes, anio, categoria, subcategoria, ruta_almacenamiento
            )

            # 7. Persistir registros (con excepciones)
            registros = await NominaService.persistir_registros_normalizados(
                session, archivo.id, mes, anio, rows, categoria, subcategoria_clean, mapa_erp, excepciones
            )
            
            await session.commit()
            
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
                    "empresa": r.empresa,
                    "concepto": r.concepto,
                    
                    # Mayúsculas / Variaciones (Legacy)
                    "CEDULA": r.cedula,
                    "NOMBRE": r.nombre_asociado,
                    "EMPLEADO": r.nombre_asociado,
                    "nombre_asociado": r.nombre_asociado,
                    "VALOR": r.valor,
                    "VALOR MES": r.valor,
                    "EMPRESA": r.empresa,
                    "CONCEPTO": r.concepto,
                    
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
            
        except Exception as e:
            await session.rollback()
            logger.error(f"FALLO CRÍTICO en flujo {subcategoria}: {str(e)}", exc_info=True)
            raise e
    @staticmethod
    async def obtener_datos_periodo(
        session: Session,
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
                    "empresa": f.empresa,
                    "concepto": f.concepto,
                    
                    # Mayúsculas / Variaciones
                    "CEDULA": f.cedula,
                    "NOMBRE": f.nombre_asociado,
                    "EMPLEADO": f.nombre_asociado,
                    "nombre_asociado": f.nombre_asociado,
                    "VALOR": f.valor,
                    "VALOR MES": f.valor,
                    "EMPRESA": f.empresa,
                    "CONCEPTO": f.concepto,
                    
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
        """Agrupa filas por cédula y concepto, sumando valor/horas/dias."""
        agrupado: Dict[str, Dict[str, Any]] = {}
        for fila in filas:
            # Agrupar por la combinación de cédula y concepto para no perder discriminación
            cedula = str(fila.get("cedula", ""))
            concepto = str(fila.get("concepto", "")).upper()
            key = f"{cedula}_{concepto}"
            
            if key in agrupado:
                agrupado[key]["valor"] += fila["valor"]
                if "VALOR" in agrupado[key]: agrupado[key]["VALOR"] += fila["VALOR"]
                if "VALOR MES" in agrupado[key]: agrupado[key]["VALOR MES"] += fila.get("VALOR MES", 0)
                agrupado[key]["horas"] += fila.get("horas", 0)
                agrupado[key]["dias"] += fila.get("dias", 0)
                if "HORAS" in agrupado[key]: agrupado[key]["HORAS"] += fila.get("HORAS", 0)
                if "DIAS" in agrupado[key]: agrupado[key]["DIAS"] += fila.get("DIAS", 0)
            else:
                agrupado[key] = fila.copy()
        return list(agrupado.values())
