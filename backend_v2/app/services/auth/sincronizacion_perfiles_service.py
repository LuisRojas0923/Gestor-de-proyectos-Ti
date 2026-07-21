import math
import time
from collections import Counter
from typing import Any

from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_engine
from app.models.auth.sincronizacion_perfil import (
    EstadoEjecucion,
    EstadoPerfilERP,
    EstadoSincronizacion,
    PerfilLaboralERP,
    ResultadoSincronizacionPerfil,
    ResumenSincronizacionPerfiles,
)
from app.models.auth.usuario import Usuario
from app.services.auth.protected_identity_service import actualizar_correo_protegido
from app.services.erp.perfiles_laborales_service import (
    consultar_perfiles_laborales_bulk_async,
    obtener_perfil_laboral_por_cedula,
)
from app.utils_date import get_bogota_now


_CAMPOS_TEXTO_NULABLES = {
    "cargo": "cargo",
    "area": "area",
    "sede": "sede",
    "centrocosto": "centrocosto",
}
_LOCK_ID = "sincronizacion_perfiles_erp"


class FuenteERPNoDisponible(RuntimeError):
    pass


class LimiteSincronizacionExcedido(RuntimeError):
    pass


class SincronizacionEnCurso(RuntimeError):
    pass


def _texto(valor: Any, *, permite_vacio: bool) -> str | None:
    if valor is None:
        return None
    normalizado = str(valor).strip()
    if not normalizado:
        return None if permite_vacio else None
    if len(normalizado) > 255:
        raise ValueError("Dato ERP de texto fuera de rango")
    return normalizado


def _booleano_erp(valor: Any, actual: bool) -> bool:
    if valor is None:
        return actual
    if isinstance(valor, bool):
        return valor
    if isinstance(valor, (int, float)) and valor in (0, 1):
        return bool(valor)
    texto_valor = str(valor).strip().lower()
    if texto_valor in {"true", "t", "1", "s", "si", "sí", "y", "yes"}:
        return True
    if texto_valor in {"false", "f", "0", "n", "no"}:
        return False
    raise ValueError("Dato ERP booleano no reconocido")


def _base_viaticos(valor: Any) -> float | None:
    if valor is None:
        return None
    try:
        numero = float(valor)
    except (TypeError, ValueError) as exc:
        raise ValueError("Base de viaticos ERP invalida") from exc
    if not math.isfinite(numero) or numero < 0:
        raise ValueError("Base de viaticos ERP invalida")
    return numero


def _correo_valido(valor: Any) -> str | None:
    if valor is None:
        return None
    correo = str(valor).strip().lower()
    if not correo:
        return None
    if len(correo) > 255 or correo.count("@") != 1 or "." not in correo.rsplit("@", 1)[1]:
        return None
    return correo


def calcular_cambios_perfil(
    usuario: Usuario,
    perfil: PerfilLaboralERP,
) -> tuple[dict[str, Any], list[str]]:
    cambios: dict[str, Any] = {}
    advertencias: list[str] = []

    nombre = _texto(perfil.nombre, permite_vacio=False)
    if nombre and nombre != usuario.nombre:
        cambios["nombre"] = nombre

    for campo_local, campo_erp in _CAMPOS_TEXTO_NULABLES.items():
        valor = _texto(getattr(perfil, campo_erp), permite_vacio=True)
        if valor != getattr(usuario, campo_local):
            cambios[campo_local] = valor

    viaticante = _booleano_erp(perfil.viaticante, usuario.viaticante)
    if viaticante != usuario.viaticante:
        cambios["viaticante"] = viaticante

    baseviaticos = _base_viaticos(perfil.baseviaticos)
    if baseviaticos != usuario.baseviaticos:
        cambios["baseviaticos"] = baseviaticos

    correo = _correo_valido(perfil.correo)
    if perfil.correo and correo is None:
        advertencias.append("correo_erp_invalido")
    elif correo and correo != (usuario.correo or "").strip().lower():
        cambios["correo"] = correo
    return cambios, advertencias


async def _aplicar_cambios(
    db: AsyncSession,
    usuario: Usuario,
    cambios: dict[str, Any],
) -> None:
    for campo, valor in cambios.items():
        if campo != "correo":
            setattr(usuario, campo, valor)
    if "correo" in cambios:
        await actualizar_correo_protegido(
            db,
            usuario.id,
            cambios["correo"],
            True,
            False,
        )
    usuario.actualizado_en = get_bogota_now()


def _resultado_no_sincronizable(estado: EstadoPerfilERP) -> ResultadoSincronizacionPerfil:
    mapping = {
        EstadoPerfilERP.NO_ENCONTRADO: EstadoSincronizacion.NO_ENCONTRADO,
        EstadoPerfilERP.SIN_CONTRATO_ACTIVO: EstadoSincronizacion.SIN_CONTRATO_ACTIVO,
    }
    return ResultadoSincronizacionPerfil(estado=mapping[estado])


async def sincronizar_usuario_desde_erp(
    db: AsyncSession,
    usuario: Usuario,
    *,
    aplicar: bool = True,
) -> ResultadoSincronizacionPerfil:
    try:
        resultado_erp = await obtener_perfil_laboral_por_cedula(usuario.cedula)
    except Exception as exc:
        raise FuenteERPNoDisponible("ERP de perfiles no disponible") from exc
    if resultado_erp.estado != EstadoPerfilERP.ENCONTRADO_ACTIVO:
        return _resultado_no_sincronizable(resultado_erp.estado)

    try:
        cambios, advertencias = calcular_cambios_perfil(usuario, resultado_erp.perfil)
    except ValueError:
        return ResultadoSincronizacionPerfil(estado=EstadoSincronizacion.DATO_ERP_INVALIDO)
    if not cambios:
        return ResultadoSincronizacionPerfil(
            estado=EstadoSincronizacion.SIN_CAMBIOS,
            advertencias=advertencias,
        )
    if not aplicar:
        return ResultadoSincronizacionPerfil(
            estado=EstadoSincronizacion.ACTUALIZADO,
            campos_modificados=sorted(cambios),
            advertencias=advertencias,
        )

    try:
        await db.execute(text("SET LOCAL lock_timeout = '3s'"))
        bloqueado = (
            await db.execute(
                select(Usuario)
                .where(Usuario.id == usuario.id)
                .execution_options(populate_existing=True)
                .with_for_update()
            )
        ).scalar_one_or_none()
        if bloqueado is None:
            raise ValueError("Usuario local no encontrado")
        cambios, advertencias = calcular_cambios_perfil(bloqueado, resultado_erp.perfil)
        if not cambios:
            return ResultadoSincronizacionPerfil(
                estado=EstadoSincronizacion.SIN_CAMBIOS,
                advertencias=advertencias,
            )
        await _aplicar_cambios(db, bloqueado, cambios)
        await db.commit()
        await db.refresh(bloqueado)
        return ResultadoSincronizacionPerfil(
            estado=EstadoSincronizacion.ACTUALIZADO,
            campos_modificados=sorted(cambios),
            advertencias=advertencias,
        )
    except IntegrityError:
        await db.rollback()
        return ResultadoSincronizacionPerfil(
            estado=EstadoSincronizacion.DATO_ERP_INVALIDO
        )
    except SQLAlchemyError:
        await db.rollback()
        return ResultadoSincronizacionPerfil(estado=EstadoSincronizacion.FALLIDO)
    except Exception:
        await db.rollback()
        raise


def _acumular(
    resumen: ResumenSincronizacionPerfiles,
    resultado: ResultadoSincronizacionPerfil,
    frecuencia: Counter,
) -> None:
    resumen.evaluados += 1
    if resultado.estado == EstadoSincronizacion.ACTUALIZADO:
        resumen.actualizados += 1
        frecuencia.update(resultado.campos_modificados)
    elif resultado.estado == EstadoSincronizacion.SIN_CAMBIOS:
        resumen.sin_cambios += 1
    elif resultado.estado in {
        EstadoSincronizacion.NO_ENCONTRADO,
        EstadoSincronizacion.SIN_CONTRATO_ACTIVO,
    }:
        resumen.no_sincronizables += 1
    else:
        resumen.fallidos += 1


async def sincronizar_usuarios_activos_desde_erp(
    db: AsyncSession,
    *,
    aplicar: bool,
    tamano_lote: int = 100,
) -> ResumenSincronizacionPerfiles:
    inicio = time.monotonic()
    total = (
        await db.execute(
            select(func.count()).select_from(Usuario).where(Usuario.esta_activo)
        )
    ).scalar_one()
    if total > 1000:
        raise LimiteSincronizacionExcedido("Limite operativo excedido")

    lock_conn = None
    if aplicar:
        lock_conn = await async_engine.connect()
        adquirido = (
            await lock_conn.execute(
                text("SELECT pg_try_advisory_lock(hashtext(:nombre))"),
                {"nombre": _LOCK_ID},
            )
        ).scalar_one()
        if not adquirido:
            await lock_conn.close()
            raise SincronizacionEnCurso("Ya existe una sincronizacion en curso")

    resumen = ResumenSincronizacionPerfiles(estado_general=EstadoEjecucion.COMPLETO)
    frecuencia: Counter = Counter()
    ultimo_id = ""
    try:
        while True:
            if time.monotonic() - inicio >= 180:
                resumen.estado_general = EstadoEjecucion.PARCIAL_TIMEOUT
                break
            try:
                usuarios = list((await db.execute(
                    select(Usuario)
                    .where(Usuario.esta_activo, Usuario.id > ultimo_id)
                    .order_by(Usuario.id)
                    .limit(tamano_lote)
                )).scalars().all())
            except SQLAlchemyError:
                await db.rollback()
                if resumen.evaluados == 0:
                    raise
                resumen.estado_general = EstadoEjecucion.PARCIAL
                break
            if not usuarios:
                break
            ultimo_id = usuarios[-1].id
            try:
                perfiles = await consultar_perfiles_laborales_bulk_async(
                    [u.cedula for u in usuarios]
                )
            except Exception as exc:
                if resumen.evaluados == 0:
                    raise FuenteERPNoDisponible("ERP de perfiles no disponible") from exc
                resumen.estado_general = EstadoEjecucion.PARCIAL
                resumen.lotes_fallidos += 1
                resumen.evaluados += len(usuarios)
                resumen.fallidos += len(usuarios)
                continue

            if aplicar:
                try:
                    await db.execute(text("SET LOCAL lock_timeout = '3s'"))
                except SQLAlchemyError:
                    await db.rollback()
                    if resumen.evaluados == 0:
                        raise
                    resumen.estado_general = EstadoEjecucion.PARCIAL
                    break

            provisionales: list[ResultadoSincronizacionPerfil] = []
            for usuario in usuarios:
                resultado_erp = perfiles[usuario.cedula.strip()]
                if resultado_erp.estado != EstadoPerfilERP.ENCONTRADO_ACTIVO:
                    provisionales.append(_resultado_no_sincronizable(resultado_erp.estado))
                    continue
                try:
                    if aplicar:
                        async with db.begin_nested():
                            bloqueado = (
                                await db.execute(
                                    select(Usuario)
                                    .where(Usuario.id == usuario.id, Usuario.esta_activo)
                                    .execution_options(populate_existing=True)
                                    .with_for_update()
                                )
                            ).scalar_one_or_none()
                            if bloqueado is None:
                                provisionales.append(ResultadoSincronizacionPerfil(
                                    estado=EstadoSincronizacion.FALLIDO
                                ))
                                continue
                            cambios, warnings = calcular_cambios_perfil(
                                bloqueado, resultado_erp.perfil
                            )
                            if cambios:
                                await _aplicar_cambios(db, bloqueado, cambios)
                                await db.flush()
                        estado = (
                            EstadoSincronizacion.ACTUALIZADO
                            if cambios else EstadoSincronizacion.SIN_CAMBIOS
                        )
                    else:
                        cambios, warnings = calcular_cambios_perfil(
                            usuario, resultado_erp.perfil
                        )
                        estado = (
                            EstadoSincronizacion.ACTUALIZADO
                            if cambios else EstadoSincronizacion.SIN_CAMBIOS
                        )
                    provisionales.append(ResultadoSincronizacionPerfil(
                        estado=estado,
                        campos_modificados=sorted(cambios),
                        advertencias=warnings,
                    ))
                except (ValueError, IntegrityError):
                    provisionales.append(ResultadoSincronizacionPerfil(
                        estado=EstadoSincronizacion.DATO_ERP_INVALIDO
                    ))
                except SQLAlchemyError:
                    provisionales.append(ResultadoSincronizacionPerfil(
                        estado=EstadoSincronizacion.FALLIDO
                    ))

            if aplicar:
                try:
                    await db.commit()
                except Exception:
                    await db.rollback()
                    resumen.estado_general = EstadoEjecucion.PARCIAL
                    resumen.lotes_fallidos += 1
                    resumen.evaluados += len(provisionales)
                    resumen.fallidos += len(provisionales)
                    continue
            resumen.lotes_completados += 1
            for resultado in provisionales:
                _acumular(resumen, resultado, frecuencia)
    finally:
        if lock_conn is not None:
            try:
                await lock_conn.execute(
                    text("SELECT pg_advisory_unlock(hashtext(:nombre))"),
                    {"nombre": _LOCK_ID},
                )
            finally:
                await lock_conn.close()

    resumen.frecuencia_campos = dict(frecuencia)
    resumen.duracion_ms = int((time.monotonic() - inicio) * 1000)
    return resumen
