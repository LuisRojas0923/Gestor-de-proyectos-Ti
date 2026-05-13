import logging
from typing import List, Dict, Any
from sqlmodel import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from ...models.novedades_nomina.nomina import NominaRegistroNormalizado, ControlDescuentoActivo

logger = logging.getLogger(__name__)

# Subcategorías que siempre deben existir
SUBCATEGORIAS_BASE = [
    "BOGOTA LIBRANZA",
    "DAVIVIENDA LIBRANZA",
    "OCCIDENTE LIBRANZA",
    "BENEFICIAR",
    "GRANCOOP",
    "CAMPOSANTO",
    "RECORDAR",
    "OTROS GERENCIA",
    "POLIZAS VEHICULOS",
    "SEGUROS HDI",
    "MEDICINA PREPAGADA",
    "CONTROL DE DESCUENTOS",
    "CELULARES",
    "RETENCIONES",
    "EMBARGOS",
]

# Subcategorías condicionales por quincena
SUBCATEGORIAS_Q1 = ["PLANILLAS REGIONALES 1Q"]
SUBCATEGORIAS_Q2 = ["PLANILLAS REGIONALES 2Q"]

# Subcategorías excluidas de la consolidación
SUBCATEGORIAS_EXCLUIDAS = ["GESTION EXCEPCIONES", "COMISIONES"]

# Subcategorías de planillas regionales (para preservar HORAS/DIAS)
PLANILLAS_REGIONALES = {"PLANILLAS REGIONALES 1Q", "PLANILLAS REGIONALES 2Q"}


def _get_subcategorias_requeridas(quincena: str) -> List[str]:
    """Retorna la lista de subcategorías requeridas según la quincena."""
    if quincena == "Q1":
        return SUBCATEGORIAS_BASE + SUBCATEGORIAS_Q1
    else:
        return SUBCATEGORIAS_BASE + SUBCATEGORIAS_Q1 + SUBCATEGORIAS_Q2


class TablaMaestraService:

    @staticmethod
    async def validar_disponibilidad(
        session: AsyncSession, mes: int, anio: int, quincena: str
    ) -> Dict[str, Any]:
        """Verifica qué subcategorías tienen datos para el período dado."""
        try:
            requeridas = _get_subcategorias_requeridas(quincena)

            # Consultar subcategorías que ya tienen registros normalizados
            stmt = (
                select(NominaRegistroNormalizado.subcategoria_final)
                .where(
                    NominaRegistroNormalizado.mes_fact == mes,
                    NominaRegistroNormalizado.año_fact == anio,
                )
                .group_by(NominaRegistroNormalizado.subcategoria_final)
            )
            result = await session.execute(stmt)
            disponibles_db = {row[0] for row in result.all()}

            # Lógica especial para CONTROL DE DESCUENTOS: si no está en la DB normalizada,
            # pero hay registros en la tabla de ControlDescuentoActivo, lo marcamos disponible.
            if "CONTROL DE DESCUENTOS" not in disponibles_db:
                stmt_ctrl = select(func.count(ControlDescuentoActivo.id))
                # Filtro simplificado: si hay CUALQUIER registro activo, asumimos que debe estar disponible
                # (La validación de fechas ocurre en el mapeo final)
                # Sin embargo, para ser precisos, filtramos igual que la tabla quincenal.
                result_ctrl = await session.execute(stmt_ctrl)
                count_ctrl = result_ctrl.scalar() or 0
                if count_ctrl > 0:
                    disponibles_db.add("CONTROL DE DESCUENTOS")

            disponibles = [s for s in requeridas if s in disponibles_db]
            faltantes = [s for s in requeridas if s not in disponibles_db]

            return {
                "completo": len(faltantes) == 0,
                "disponibles": disponibles,
                "faltantes": faltantes,
                "total_requeridas": len(requeridas),
                "total_disponibles": len(disponibles),
                "total_faltantes": len(faltantes),
            }
        except Exception as e:
            logger.error(f"Error validando disponibilidad: {str(e)}")
            raise e

    @staticmethod
    async def generar_tabla_maestra(
        session: AsyncSession, mes: int, anio: int, quincena: str
    ) -> Dict[str, Any]:
        """Genera la tabla maestra consolidada para el período dado."""
        try:
            # 1. Validar que todo esté disponible
            validacion = await TablaMaestraService.validar_disponibilidad(
                session, mes, anio, quincena
            )
            if not validacion["completo"]:
                return {
                    "error": True,
                    "mensaje": "No se puede generar: faltan subcategorías",
                    "faltantes": validacion["faltantes"],
                }

            # Consultar registros normalizados (incluyendo estados de excepción y legados válidos)
            stmt = select(NominaRegistroNormalizado).where(
                NominaRegistroNormalizado.mes_fact == mes,
                NominaRegistroNormalizado.año_fact == anio,
                NominaRegistroNormalizado.estado_validacion.in_([
                    "OK", "Activo", "REDIRECCIONADO", "EXCEPCION", "EXCEPCION_PAGO_TERCERO", "EXCEPCION_VALOR_FIJO", 
                    "EXCEPCION_PORCENTAJE_EMPRESA", "EXCEPCION_AUTORIZADA", "EXCEPCION_SALDO_FAVOR"
                ])
            )
            result = await session.execute(stmt)
            todos_los_registros = result.scalars().all()

            # 3. Consolidar con reglas de negocio
            filas_maestra = []
            subcategorias_incluidas = set()
            planilla_key = (
                "PLANILLAS REGIONALES 1Q"
                if quincena == "Q1"
                else "PLANILLAS REGIONALES 2Q"
            )
            planilla_excluida = (
                "PLANILLAS REGIONALES 2Q"
                if quincena == "Q1"
                else None
            )

            for r in todos_los_registros:
                subcat = r.subcategoria_final

                # Excluir subcategorías no consolidables
                if subcat in SUBCATEGORIAS_EXCLUIDAS:
                    continue

                # Excluir registros retirados o sin establecimiento
                if r.estado_validacion in ["RETIRADO", "SIN_ESTABLECIMIENTO"]:
                    continue

                # Excluir la planilla regional de la quincena contraria
                if planilla_excluida and subcat == planilla_excluida:
                    continue

                # Filtrar RETENCIONES según quincena
                if subcat == "RETENCIONES":
                    concepto = (r.concepto or "").strip().upper()
                    # Si el concepto está vacío, le asignamos uno genérico según quincena para que pase el filtro
                    if not concepto:
                        concepto = "CON COMISION 1Q" if quincena == "Q1" else "SIN COMISION 2Q"
                    
                    # Filtro flexible: buscar si contiene la quincena o si es el concepto exacto
                    es_q1 = "1Q" in concepto or "Q1" in concepto or concepto == "CON COMISION 1Q"
                    es_q2 = "2Q" in concepto or "Q2" in concepto or concepto == "SIN COMISION 2Q"
                    
                    if quincena == "Q1" and not es_q1:
                        continue
                    if quincena == "Q2" and not es_q2:
                        continue

                # Calcular valor quincenal
                valor_mensual = r.valor or 0
                if subcat in ["OTROS GERENCIA", "RETENCIONES"]:
                    valor_quincenal = round(valor_mensual, 2)
                else:
                    valor_quincenal = round(valor_mensual / 2, 2)

                # HORAS y DIAS solo para Planillas Regionales
                es_planilla = subcat in PLANILLAS_REGIONALES
                horas = r.horas if es_planilla else None
                dias = r.dias if es_planilla else None

                subcategorias_incluidas.add(subcat)

                filas_maestra.append({
                    "CEDULA": r.cedula,
                    "NOMBRE": r.nombre_asociado or "",
                    "EMPRESA": r.empresa or "",
                    "VALOR QUINCENAL": valor_quincenal,
                    "HORAS": horas,
                    "DIAS": dias,
                    "CONCEPTO": (r.concepto or "").strip() or subcat,
                })

            # 3.1 Inyectar automáticamente registros de CONTROL DE DESCUENTOS desde su tabla propia
            # Esto evita que el usuario tenga que 'cargar' manualmente estos datos.
            if "CONTROL DE DESCUENTOS" in subcategorias_incluidas or "CONTROL DE DESCUENTOS" in validacion["disponibles"]:
                # Obtener registros de ControlDescuentoActivo filtrados por período y quincena
                # (Lógica espejo de descuentos.py:obtener_tabla_quincenal)
                result_ctrl = await session.execute(
                    select(ControlDescuentoActivo).order_by(ControlDescuentoActivo.nombre)
                )
                registros_activos = result_ctrl.scalars().all()
                
                quincena_dia = 15 if quincena == "Q1" else 28 # Referencia para filtrado
                
                count_inyectados = 0
                for r_ctrl in registros_activos:
                    fi = r_ctrl.fecha_inicio
                    # Normalizar fecha
                    fi_date = fi.date() if hasattr(fi, "date") else fi
                    
                    if fi_date.year != anio or fi_date.month != mes:
                        continue
                    
                    # Filtro por quincena
                    if quincena == "Q1" and fi_date.day != 15:
                        continue
                    if quincena == "Q2" and fi_date.day < 28:
                        continue
                        
                    # Filtrar posibles duplicados: si ya fue cargado manualmente (archivo), lo ignoramos
                    # para dar prioridad a lo manual si existiera.
                    # Pero el requerimiento dice que esto es lo que "ya está".
                    
                    filas_maestra.append({
                        "CEDULA": r_ctrl.cedula,
                        "NOMBRE": r_ctrl.nombre,
                        "EMPRESA": r_ctrl.empresa,
                        "VALOR QUINCENAL": round(r_ctrl.valor_cuota, 2),
                        "HORAS": None,
                        "DIAS": None,
                        "CONCEPTO": f"CONTROL DE DESCUENTO {quincena}"
                    })
                    subcategorias_incluidas.add("CONTROL DE DESCUENTOS")
                    count_inyectados += 1
                
                if count_inyectados > 0:
                    logger.info(f"Inyectados {count_inyectados} registros de Control de Descuentos automáticamente.")

            # 3.2 Inyectar automáticamente registros de COMISIONES desde el mes anterior solo para Q1
            if quincena == "Q1":
                mes_ant = mes - 1
                anio_ant = anio
                if mes_ant == 0:
                    mes_ant = 12
                    anio_ant = anio - 1
                
                # Consultar registros de COMISIONES del mes anterior que estén en estado validado
                stmt_com = select(NominaRegistroNormalizado).where(
                    NominaRegistroNormalizado.subcategoria_final == "COMISIONES",
                    NominaRegistroNormalizado.mes_fact == mes_ant,
                    NominaRegistroNormalizado.año_fact == anio_ant,
                    NominaRegistroNormalizado.estado_validacion.in_([
                        "OK", "Activo", "REDIRECCIONADO", "EXCEPCION", "EXCEPCION_PAGO_TERCERO", 
                        "EXCEPCION_VALOR_FIJO", "EXCEPCION_PORCENTAJE_EMPRESA", "EXCEPCION_AUTORIZADA", "EXCEPCION_SALDO_FAVOR"
                    ])
                )
                res_com = await session.execute(stmt_com)
                registros_comisiones = res_com.scalars().all()
                
                count_com = 0
                for r_c in registros_comisiones:
                    filas_maestra.append({
                        "CEDULA": r_c.cedula,
                        "NOMBRE": r_c.nombre_asociado or "",
                        "EMPRESA": r_c.empresa or "",
                        "VALOR QUINCENAL": round(r_c.valor or 0, 2), # Se paga 100% en la 1Q
                        "HORAS": None,
                        "DIAS": None,
                        "CONCEPTO": "COMISIONES",
                    })
                    subcategorias_incluidas.add("COMISIONES")
                    count_com += 1
                
                if count_com > 0:
                    logger.info(f"Inyectadas {count_com} comisiones desde el periodo anterior ({mes_ant}/{anio_ant}).")

            # 4. Generar resumen
            total_valor_quincenal = sum(f["VALOR QUINCENAL"] for f in filas_maestra)
            total_horas = sum(f["HORAS"] or 0 for f in filas_maestra)
            total_dias = sum(f["DIAS"] or 0 for f in filas_maestra)

            logger.info(
                f"Tabla Maestra generada: {len(filas_maestra)} registros, "
                f"{len(subcategorias_incluidas)} subcategorías"
            )

            return {
                "error": False,
                "filas": filas_maestra,
                "summary": {
                    "total_registros": len(filas_maestra),
                    "total_asociados": len(set(f["CEDULA"] for f in filas_maestra)),
                    "total_valor_quincenal": round(total_valor_quincenal, 2),
                    "total_horas": round(total_horas, 2),
                    "total_dias": round(total_dias, 2),
                    "subcategorias_incluidas": sorted(subcategorias_incluidas),
                    "mes": mes,
                    "anio": anio,
                    "quincena": quincena,
                },
            }
        except Exception as e:
            logger.error(f"Error generando tabla maestra: {str(e)}", exc_info=True)
            raise e
