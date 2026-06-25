import logging
import hashlib
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlmodel import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from ...models.novedades_nomina.nomina import (
    NominaArchivo, NominaRegistroNormalizado, NominaExcepcion
)
from ...services.erp.empleados_service import EmpleadosService
from .excepcion_service import ExcepcionService

logger = logging.getLogger(__name__)

class NominaHelper:
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
            
            # Lógica para Seguros HDI: el descuento de la empresa (24%) solo aplica para colaboradores activos
            valor_rdc_final = row.get("valor_rdc", 0.0)
            valor_colaborador_final = row.get("valor_colaborador", 0.0)
            if subcategoria == "SEGUROS HDI" and info_original:
                if str(info_original.get("estado", "")).strip().upper() != "ACTIVO":
                    valor_rdc_final = 0.0
                    valor_colaborador_final = row["valor"]

            valor_final = row["valor"]
            concepto_final = row["concepto"]
            cedula_final = cedula_original
            # Buscar excepción vigente para este colaborador y subcategoría
            ex = mapa_ex.get(cedula_original)
            
            # Fallback de nombre: ERP -> Excepción (Manual) -> Archivo
            nombre_final = info_original["nombre"] if info_original else (ex.nombre_asociado if ex and ex.nombre_asociado else row.get("nombre_asociado", ""))
            empresa_final = "CONTRATISTA" if ex and ex.tipo == 'CONTRATISTAS' else ("RETIRADO_AUTORIZADO" if ex and ex.tipo == 'RETIRADO_AUTORIZADO' else (info_original["empresa"] if info_original else "N/A"))
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
                        if subcategoria == "SEGUROS HDI":
                            # Para Seguros HDI, aplicamos el saldo a favor a la porción del colaborador, no al total
                            valor_orig = valor_colaborador_final
                            valor_restante_colab = await ExcepcionService.aplicar_saldo_favor(session, ex, valor_orig, mes, anio)
                            
                            # Si el colaborador está ACTIVO, reducimos la deducción de nómina (valor_colaborador_final)
                            # Si no está ACTIVO (retirado), mantenemos el valor original de cobro en el registro contable
                            # para evitar que figure con $0 facturados (el cobro ya se descontó de su saldo de balance).
                            es_activo = info_original and str(info_original.get("estado", "")).strip().upper() == "ACTIVO"
                            if es_activo:
                                valor_colaborador_final = valor_restante_colab
                                valor_final = valor_rdc_final + valor_colaborador_final
                            else:
                                # Inactivo: no aplica descuento empresa y se reporta cobro completo
                                valor_final = valor_colaborador_final
                            
                            estado_val = "EXCEPCION_SALDO_FAVOR"
                            observacion_ex = f"Saldo favor aplicado. Cobro: ${valor_orig:,.0f} -> ${valor_restante_colab:,.0f}"
                        else:
                            valor_orig = valor_final
                            valor_final = await ExcepcionService.aplicar_saldo_favor(session, ex, valor_orig, mes, anio)
                            estado_val = "EXCEPCION_SALDO_FAVOR"
                            observacion_ex = f"Saldo favor aplicado. Cobro: ${valor_orig:,.0f} -> ${valor_final:,.0f}"

            # Lógica de estados si no hay excepción dominante que autorice
            if estado_val == estado_default:
                if not info_original:
                    estado_val = "SIN_ESTABLECIMIENTO"
                    # valor_final = 0 # Eliminado para que se contabilice el valor de la factura
                elif str(info_original.get("estado", "")).strip().upper() != "ACTIVO":
                    estado_val = "RETIRADO"
                    # valor_final = 0 # Eliminado para que se contabilice el valor de la factura

            ciudad = (info_original.get("ciudadcontratacion", "") if info_original else "") or row.get("sucursal", "")

            # Lógica final de asignación para RDC/Colaborador
            if subcategoria == "SEGUROS HDI" and estado_val == "EXCEPCION_SALDO_FAVOR":
                # Ya fueron calculados correctamente dentro del bloque de SALDO_FAVOR
                pass
            else:
                if valor_final == 0:
                    valor_rdc_final = 0.0
                    valor_colaborador_final = 0.0
                elif valor_final != row["valor"]:
                    valor_colaborador_final = max(0.0, valor_final - valor_rdc_final)

            reg = NominaRegistroNormalizado(
                archivo_id=archivo_id,
                fecha_creacion=datetime.now(),
                mes_fact=mes,
                año_fact=anio,
                cedula=cedula_final,
                nombre_asociado=nombre_final,
                valor=valor_final,
                valor_rdc=valor_rdc_final,
                valor_colaborador=valor_colaborador_final,
                empresa=empresa_final,
                concepto=concepto_final,
                categoria_final=categoria,
                subcategoria_final=subcategoria.strip(),
                estado_validacion=estado_val,
                horas=row.get("horas", 0),
                dias=row.get("dias", 0),
                fila_origen=i + 1,
                ciudad=ciudad or None,
                observaciones=(f"{row.get('observaciones')} | {observacion_ex}" if row.get("observaciones") and observacion_ex else (observacion_ex or row.get("observaciones"))),
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
                    ciudad_inyectado = info.get("ciudadcontratacion", "") if info else ""
                    
                    valor_normalizado = descuento
                    val_rdc = 0.0
                    val_colab = descuento
                    
                    if subcategoria == "SEGUROS HDI":
                        es_activo = info and str(info.get("estado", "")).strip().upper() == "ACTIVO"
                        if ex.tipo == 'SALDO_FAVOR':
                            if es_activo:
                                val_rdc = round(valor_orig * 0.24, 2)
                                val_colab = descuento
                                valor_normalizado = val_rdc + val_colab
                            else:
                                val_rdc = 0.0
                                val_colab = valor_orig
                                valor_normalizado = valor_orig
                        else:
                            val_rdc = 0.0
                            val_colab = descuento
                            valor_normalizado = descuento
                            
                    reg = NominaRegistroNormalizado(
                        archivo_id=archivo_id,
                        fecha_creacion=datetime.now(),
                        mes_fact=mes,
                        año_fact=anio,
                        cedula=ex.cedula,
                        nombre_asociado=ex.nombre_asociado or (info["nombre"] if info else "COLABORADOR SIN NOMBRE"),
                        valor=valor_normalizado,
                        valor_rdc=val_rdc,
                        valor_colaborador=val_colab,
                        empresa="CONTRATISTA" if ex.tipo == 'CONTRATISTAS' else ("RETIRADO_AUTORIZADO" if ex.tipo == 'RETIRADO_AUTORIZADO' else (info["empresa"] if info else "N/A")),
                        concepto=f"{subcategoria} (EXCEPCION)",
                        categoria_final=categoria,
                        subcategoria_final=subcategoria.strip(),
                        estado_validacion=estado_val,
                        horas=0,
                        dias=0,
                        fila_origen=0,
                        ciudad=ciudad_inyectado or None,
                        observaciones=None
                    )
                    session.add(reg)
                    registros.append(reg)

        await session.flush()
        return registros

    @staticmethod
    async def crear_archivo_procesado(
        session: AsyncSession,
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
    def agrupar_por_cedula(filas: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Agrupa filas por cédula y concepto, sumando valor/horas/dias."""
        agrupado: Dict[str, Dict[str, Any]] = {}
        for fila in filas:
            cedula = str(fila.get("cedula", ""))
            concepto = str(fila.get("concepto", "")).upper()
            key = f"{cedula}_{concepto}"
            
            if key in agrupado:
                agrupado[key]["valor"] += fila["valor"]
                if "VALOR" in agrupado[key]: agrupado[key]["VALOR"] += fila["VALOR"]
                if "VALOR MES" in agrupado[key]: agrupado[key]["VALOR MES"] += fila.get("VALOR MES", 0)
                
                # Agrupación de aportes de empresa y colaborador
                if "valor_rdc" in agrupado[key]: agrupado[key]["valor_rdc"] += fila.get("valor_rdc", 0)
                if "VALOR_RDC" in agrupado[key]: agrupado[key]["VALOR_RDC"] += fila.get("VALOR_RDC", 0)
                if "valor_colaborador" in agrupado[key]: agrupado[key]["valor_colaborador"] += fila.get("valor_colaborador", 0)
                if "VALOR_COLABORADOR" in agrupado[key]: agrupado[key]["VALOR_COLABORADOR"] += fila.get("VALOR_COLABORADOR", 0)

                agrupado[key]["horas"] += fila.get("horas", 0)
                agrupado[key]["dias"] += fila.get("dias", 0)
                if "HORAS" in agrupado[key]: agrupado[key]["HORAS"] += fila.get("HORAS", 0)
                if "DIAS" in agrupado[key]: agrupado[key]["DIAS"] += fila.get("DIAS", 0)
            else:
                agrupado[key] = fila.copy()
        return list(agrupado.values())

    @staticmethod
    def normalizar_nombre(nombre: str) -> str:
        """Elimina acentos, eñes, mayúsculas y caracteres especiales de un nombre para comparación."""
        if not nombre:
            return ""
        import unicodedata
        # Pasar a mayúsculas y limpiar espacios múltiples
        t = " ".join(nombre.split()).upper()
        # Normalizar caracteres unicode (descomponer acentos)
        t = "".join(
            c for c in unicodedata.normalize('NFD', t)
            if unicodedata.category(c) != 'Mn'
        )
        t = t.replace("Ñ", "N")
        return t

    @staticmethod
    def buscar_cedula_por_nombre(nombre_buscado: str, lista_empleados: List[Dict]) -> Optional[str]:
        """
        Busca la cédula de un empleado en la lista del ERP por conjuntos de tokens del nombre.
        Soporta desorden de nombres/apellidos y leves errores de digitación (umbral de coincidencia >= 75%).
        """
        if not nombre_buscado or not lista_empleados:
            return None
        
        import re
        from difflib import SequenceMatcher
        
        norm_buscado = NominaHelper.normalizar_nombre(nombre_buscado)
        tokens_buscado = set(re.findall(r'\w+', norm_buscado))
        if not tokens_buscado:
            return None
            
        mejor_match = None
        max_ratio = 0.0
        
        for emp in lista_empleados:
            emp_nombre = emp.get("nombre") or emp.get("nombre_asociado") or ""
            norm_emp = NominaHelper.normalizar_nombre(emp_nombre)
            tokens_emp = set(re.findall(r'\w+', norm_emp))
            if not tokens_emp:
                continue
                
            # 1. Coincidencias exactas de tokens
            exactas = tokens_buscado.intersection(tokens_emp)
            
            # 2. Encontrar tokens no coincidentes
            unmatched_buscado = list(tokens_buscado - exactas)
            unmatched_emp = list(tokens_emp - exactas)
            
            # 3. Intentar emparejar tokens no coincidentes de forma difusa (por ej. GARCUA -> GARCIA)
            fuzzy_matches = 0
            for tb in unmatched_buscado:
                for te in unmatched_emp:
                    sim = SequenceMatcher(None, tb, te).ratio()
                    if sim >= 0.8:
                        fuzzy_matches += 1
                        unmatched_emp.remove(te)
                        break
                        
            coincidencias_totales = len(exactas) + fuzzy_matches
            total_tokens = max(len(tokens_buscado), len(tokens_emp))
            ratio = coincidencias_totales / total_tokens if total_tokens > 0 else 0.0
            
            # Si supera el umbral del 75% y es mejor que el anterior
            if ratio >= 0.75 and ratio > max_ratio:
                max_ratio = ratio
                mejor_match = emp
                
        if mejor_match:
            return mejor_match.get("nrocedula") or mejor_match.get("cedula")
        return None
