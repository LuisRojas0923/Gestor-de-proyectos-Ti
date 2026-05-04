import logging
from datetime import datetime
from typing import List, Dict, Any
from sqlmodel import Session, delete
from ...models.novedades_nomina.nomina import (
    NominaRegistroNormalizado
)
from .excepcion_service import ExcepcionService
from .nomina_service import NominaService

logger = logging.getLogger(__name__)

class NominaManualService:
    @staticmethod
    async def procesar_manual_otros_gerencia(
        session: Session,
        db_erp: Any,
        data: List[Dict[str, Any]],
        mes: int,
        anio: int
    ) -> Dict[str, Any]:
        """Procesa datos ingresados manualmente para Otros Gerencia."""
        try:
            categoria = "OTROS"
            subcategoria = "OTROS GERENCIA"

            # 1. Preparar filas virtuales siguiendo la lógica del extractor
            rows = []
            for item in data:
                cedula = str(item.get("cedula", "")).strip()
                if not cedula: continue

                # Split conceptual (Fondo Común, etc)
                for col in ['fondo_comun', 'descuento_empleadas', 'pago_empleadas']:
                    val = item.get(col, 0)
                    try:
                        val_f = float(val) if val is not None else 0.0
                    except:
                        val_f = 0.0
                    
                    if val_f > 0:
                        concepto_label = col.replace('_', ' ').upper()
                        rows.append({
                            "cedula": cedula,
                            "valor": val_f,
                            "concepto": f"OTROS-GERENCIA {concepto_label}",
                            "nombre_asociado": item.get("nombre", ""), # Fallback
                            "empresa": ""
                        })

            # 2. Obtener info ERP
            excepciones = await ExcepcionService.obtener_excepciones_activas(session, subcategoria)
            mapa_erp = await NominaService.get_mapa_erp(db_erp, rows, excepciones)

            # 3. Borrar previos
            stmt_del = delete(NominaRegistroNormalizado).where(
                NominaRegistroNormalizado.subcategoria_final == subcategoria,
                NominaRegistroNormalizado.mes_fact == mes,
                NominaRegistroNormalizado.año_fact == anio,
            )
            await session.execute(stmt_del)

            # 4. Crear archivo "manual"
            archivo = await NominaService.crear_archivo_procesado(
                session, f"manual_otros_gerencia_{mes}_{anio}.json", b"manual_entry",
                0, "json", mes, anio, categoria, subcategoria
            )

            # 5. Persistir
            registros = await NominaService.persistir_registros_normalizados(
                session, archivo.id, mes, anio, rows, categoria, subcategoria, mapa_erp, excepciones
            )

            await session.commit()

            # 6. Formatear respuesta
            filas_frontend = []
            warnings_detalle = []
            for r in registros:
                base_item = {
                    "cedula": r.cedula,
                    "nombre": r.nombre_asociado,
                    "nombre_asociado": r.nombre_asociado,
                    "valor": r.valor,
                    "empresa": r.empresa,
                    "concepto": r.concepto,
                    "CEDULA": r.cedula,
                    "NOMBRE": r.nombre_asociado,
                    "VALOR": r.valor,
                    "EMPRESA": r.empresa,
                    "CONCEPTO": r.concepto,
                    "estado_erp": r.estado_validacion
                }
                if r.estado_validacion != "OK":
                    warnings_detalle.append({
                        "cedula": r.cedula,
                        "nombre": r.nombre_asociado,
                        "nombre_asociado": r.nombre_asociado,
                        "motivo": r.estado_validacion
                    })
                
                if r.estado_validacion not in ["RETIRADO", "SIN_ESTABLECIMIENTO"]:
                    filas_frontend.append(base_item)

            return {
                "filas": filas_frontend,
                "rows": filas_frontend,
                "summary": {
                    "total_asociados": len(set(r.cedula for r in registros)),
                    "total_filas": len(registros),
                    "total_valor": sum(r.valor for r in registros),
                    "mes": mes,
                    "anio": anio
                },
                "warnings": [],
                "warnings_detalle": warnings_detalle,
                "archivo_id": archivo.id
            }

        except Exception as e:
            await session.rollback()
            logger.error(f"Error procesando manual Otros Gerencia: {str(e)}")
            raise e

    @staticmethod
    async def procesar_manual_embargos(
        session: Session,
        db_erp: Any,
        data: List[Dict[str, Any]],
        mes: int,
        anio: int
    ) -> Dict[str, Any]:
        """Procesa datos ingresados manualmente para Embargos."""
        try:
            categoria = "DESCUENTOS"
            subcategoria = "EMBARGOS"

            # 1. Preparar filas virtuales
            rows = []
            for item in data:
                cedula = str(item.get("cedula", "")).strip()
                if not cedula: continue

                valor = item.get("valor", 0)
                try:
                    val_f = float(valor) if valor is not None else 0.0
                except:
                    val_f = 0.0
                
                if val_f > 0:
                    # Usar el concepto del item o por defecto EMBARGO
                    concepto = str(item.get("concepto", "EMBARGO")).strip().upper()
                    rows.append({
                        "cedula": cedula,
                        "valor": val_f,
                        "concepto": concepto,
                        "nombre_asociado": item.get("nombre", ""), # Fallback si no está en ERP
                        "empresa": ""
                    })

            # 2. Obtener info ERP
            excepciones = await ExcepcionService.obtener_excepciones_activas(session, subcategoria)
            mapa_erp = await NominaService.get_mapa_erp(db_erp, rows, excepciones)

            # 3. Borrar previos
            stmt_del = delete(NominaRegistroNormalizado).where(
                NominaRegistroNormalizado.subcategoria_final == subcategoria,
                NominaRegistroNormalizado.mes_fact == mes,
                NominaRegistroNormalizado.año_fact == anio,
            )
            await session.execute(stmt_del)

            # 4. Crear archivo "manual"
            archivo = await NominaService.crear_archivo_procesado(
                session, f"manual_embargos_{mes}_{anio}.json", b"manual_entry",
                0, "json", mes, anio, categoria, subcategoria
            )

            # 5. Persistir
            registros = await NominaService.persistir_registros_normalizados(
                session, archivo.id, mes, anio, rows, categoria, subcategoria, mapa_erp, excepciones
            )

            await session.commit()

            # 6. Formatear respuesta
            filas_frontend = []
            warnings_detalle = []
            for r in registros:
                base_item = {
                    "cedula": r.cedula,
                    "nombre": r.nombre_asociado,
                    "nombre_asociado": r.nombre_asociado,
                    "valor": r.valor,
                    "empresa": r.empresa,
                    "concepto": r.concepto,
                    "estado_erp": r.estado_validacion
                }
                if r.estado_validacion != "OK":
                    warnings_detalle.append({
                        "cedula": r.cedula,
                        "nombre": r.nombre_asociado,
                        "nombre_asociado": r.nombre_asociado,
                        "motivo": r.estado_validacion
                    })
                
                if r.estado_validacion not in ["RETIRADO", "SIN_ESTABLECIMIENTO"]:
                    filas_frontend.append(base_item)

            return {
                "filas": filas_frontend,
                "rows": filas_frontend,
                "summary": {
                    "total_asociados": len(set(r.cedula for r in registros)),
                    "total_filas": len(registros),
                    "total_valor": sum(r.valor for r in registros),
                    "mes": mes,
                    "anio": anio
                },
                "warnings": [],
                "warnings_detalle": warnings_detalle,
                "archivo_id": archivo.id
            }

        except Exception as e:
            await session.rollback()
            logger.error(f"Error procesando manual Embargos: {str(e)}")
            raise e

    @staticmethod
    async def procesar_manual_comisiones(
        session: Session,
        db_erp: Any,
        data: List[Dict[str, Any]],
        mes: int,
        anio: int
    ) -> Dict[str, Any]:
        """Procesa datos ingresados manualmente para Comisiones."""
        try:
            categoria = "COMISIONES"
            subcategoria = "COMISIONES"

            # 1. Preparar filas virtuales
            rows = []
            for item in data:
                cedula = str(item.get("cedula", "")).strip()
                if not cedula: continue

                valor = item.get("valor", 0)
                try:
                    val_f = float(valor) if valor is not None else 0.0
                except:
                    val_f = 0.0
                
                # Procesar incluso si el valor es 0 si el usuario lo envió, 
                # pero generalmente comisiones > 0
                if val_f >= 0:
                    rows.append({
                        "cedula": cedula,
                        "valor": val_f,
                        "concepto": "COMISIONES",
                        "nombre_asociado": item.get("nombre", ""),
                        "empresa": item.get("empresa", "")
                    })

            # 2. Obtener info ERP (Aun se usa para traer nombres/empresas actuales si no vienen)
            # Para comisiones, desactivamos la lógica de excepciones de descuento si no aplica
            mapa_erp = await NominaService.get_mapa_erp(db_erp, rows, [])

            # 3. Borrar previos
            stmt_del = delete(NominaRegistroNormalizado).where(
                NominaRegistroNormalizado.subcategoria_final == subcategoria,
                NominaRegistroNormalizado.mes_fact == mes,
                NominaRegistroNormalizado.año_fact == anio,
            )
            await session.execute(stmt_del)

            # 4. Crear archivo "manual"
            archivo = await NominaService.crear_archivo_procesado(
                session, f"manual_comisiones_{mes}_{anio}.json", b"manual_entry",
                0, "json", mes, anio, categoria, subcategoria
            )

            # 5. Persistir (Usando persistir_registros_normalizados pero sin warnings)
            registros = await NominaService.persistir_registros_normalizados(
                session, archivo.id, mes, anio, rows, categoria, subcategoria, mapa_erp, []
            )

            await session.commit()

            # 6. Formatear respuesta (Sin filtrar ni generar warnings)
            filas_frontend = []
            for r in registros:
                base_item = {
                    "cedula": r.cedula,
                    "nombre": r.nombre_asociado,
                    "nombre_asociado": r.nombre_asociado,
                    "valor": r.valor,
                    "empresa": r.empresa,
                    "concepto": r.concepto,
                    "CEDULA": r.cedula,
                    "NOMBRE": r.nombre_asociado,
                    "VALOR": r.valor,
                    "EMPRESA": r.empresa,
                    "CONCEPTO": r.concepto,
                    "estado_erp": r.estado_validacion
                }
                filas_frontend.append(base_item)

            return {
                "filas": filas_frontend,
                "rows": filas_frontend,
                "summary": {
                    "total_asociados": len(set(r.cedula for r in registros)),
                    "total_filas": len(registros),
                    "total_valor": sum(r.valor for r in registros),
                    "mes": mes,
                    "anio": anio
                },
                "warnings": [],
                "warnings_detalle": [],
                "archivo_id": archivo.id
            }

        except Exception as e:
            await session.rollback()
            logger.error(f"Error procesando manual Comisiones: {str(e)}")
            raise e
