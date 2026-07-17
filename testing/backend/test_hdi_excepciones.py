"""
Tests unitarios para la política de SALDO_FAVOR en SEGUROS HDI.

Política confirmada:
- SALDO_FAVOR SOLO aplica a colaboradores con estado 'Retirado' en ERP.
- Para ACTIVOS: ERROR_SALDO_ACTIVO, RDC conservado (24%), valor intacto.
- Para RETIRADOS: EXCEPCION_SALDO_FAVOR, valor_rdc=0.0, valor_colaborador=valor_original
  (para contabilidad el registro muestra el valor total; el historial de excepción
  registra el saldo consumido).
- Para AUSENTES EN ERP: ERROR_SALDO_ACTIVO (falla cerrado).
"""
import pytest
from datetime import datetime
from sqlmodel import select
from app.models.novedades_nomina.nomina import NominaArchivo, NominaExcepcion, NominaRegistroNormalizado
from app.services.novedades_nomina.nomina_service import NominaService


def _make_archivo(db_session, nombre: str, mes: int = 6, anio: int = 2026) -> NominaArchivo:
    archivo = NominaArchivo(
        nombre_archivo=nombre,
        hash_archivo=f"hash_{nombre}",
        tamaño_bytes=1024,
        tipo_archivo="xlsx",
        ruta_almacenamiento="/tmp/test",
        mes_fact=mes,
        año_fact=anio,
        categoria="OTROS",
        subcategoria="SEGUROS HDI",
        estado="Cargado"
    )
    db_session.add(archivo)
    return archivo


def _make_excepcion(db_session, cedula: str, saldo: float = 70000.0) -> NominaExcepcion:
    ex = NominaExcepcion(
        cedula=cedula,
        nombre_asociado="COLABORADOR TEST",
        subcategoria="SEGUROS HDI",
        tipo="SALDO_FAVOR",
        estado="ACTIVO",
        valor_configurado=saldo,
        saldo_actual=saldo,
        creado_por="ADMIN"
    )
    db_session.add(ex)
    return ex


@pytest.mark.asyncio
async def test_hdi_excepcion_saldo_favor_retirado(db_session):
    """
    Colaborador RETIRADO con SALDO_FAVOR en HDI.

    Expectativas:
    - estado_validacion == EXCEPCION_SALDO_FAVOR
    - valor_rdc == 0.0  (retirado no recibe subsidio de empresa)
    - valor == 24922.0 (monto original)
    - valor_colaborador == 0.0  (descuento cubierto por SALDO_FAVOR)
    - El historial de la excepción consume el saldo (verificado por estado de excepción)
    """
    archivo = _make_archivo(db_session, "test_hdi_retirado.xlsx")
    await db_session.commit()
    await db_session.refresh(archivo)

    CEDULA = "16783959"
    ex = _make_excepcion(db_session, CEDULA, saldo=70000.0)
    await db_session.commit()
    await db_session.refresh(ex)

    mapa_erp = {
        CEDULA: {
            "nombre": "DELGADO REINA ALEXANDER",
            "estado": "Retirado",       # Estado exacto que activa la política
            "empresa": "REFRIDCOL",
            "ciudadcontratacion": "Cali"
        }
    }

    rows = [{
        "cedula": CEDULA,
        "nombre_asociado": "DELGADO REINA ALEXANDER",
        "empresa": "REFRIDCOL",
        "concepto": "SEGURO DE VIDA",
        "valor": 24922.0,
        "valor_rdc": 5981.0,       # El extractor calcula 24% sobre el titular activo por defecto
        "valor_colaborador": 18941.0,
        "observaciones": "Grupo CERT 31"
    }]

    registros = await NominaService.persistir_registros_normalizados(
        session=db_session,
        archivo_id=archivo.id,
        mes=6,
        anio=2026,
        rows=rows,
        categoria="OTROS",
        subcategoria="SEGUROS HDI",
        mapa_erp=mapa_erp,
        excepciones_activas=[ex]
    )

    assert len(registros) == 1
    reg = registros[0]

    # Retirado → empresa no subsidia
    assert reg.valor_rdc == 0.0, f"valor_rdc esperado 0.0, obtenido {reg.valor_rdc}"

    # Valor contable = valor original (para que no figure $0 en la nómina)
    assert reg.valor == 24922.0, f"valor esperado 24922.0, obtenido {reg.valor}"
    assert reg.valor_colaborador == 0.0, f"valor_colaborador esperado 0.0, obtenido {reg.valor_colaborador}"

    assert reg.estado_validacion == "EXCEPCION_SALDO_FAVOR"
    assert "Saldo favor aplicado" in reg.observaciones


@pytest.mark.asyncio
async def test_hdi_excepcion_saldo_favor_activo(db_session):
    """
    Colaborador ACTIVO con SALDO_FAVOR en HDI.

    La política prohíbe aplicar SALDO_FAVOR a activos.

    Expectativas:
    - estado_validacion == ERROR_SALDO_ACTIVO
    - valor_rdc == 24000.0  (el RDC del activo se CONSERVA; la empresa sigue pagando su parte)
    - valor == 100000.0  (valor intacto)
    """
    archivo = _make_archivo(db_session, "test_hdi_activo.xlsx")
    await db_session.commit()
    await db_session.refresh(archivo)

    CEDULA = "12345678"
    ex = _make_excepcion(db_session, CEDULA, saldo=200000.0)
    await db_session.commit()
    await db_session.refresh(ex)

    mapa_erp = {
        CEDULA: {
            "nombre": "ACTIVO CON SALDO",
            "estado": "Activo",
            "empresa": "REFRIDCOL",
            "ciudadcontratacion": "Cali"
        }
    }

    rows = [{
        "cedula": CEDULA,
        "nombre_asociado": "ACTIVO CON SALDO",
        "empresa": "REFRIDCOL",
        "concepto": "SEGURO DE VIDA",
        "valor": 100000.0,
        "valor_rdc": 24000.0,
        "valor_colaborador": 76000.0,
        "observaciones": ""
    }]

    registros = await NominaService.persistir_registros_normalizados(
        session=db_session,
        archivo_id=archivo.id,
        mes=6,
        anio=2026,
        rows=rows,
        categoria="OTROS",
        subcategoria="SEGUROS HDI",
        mapa_erp=mapa_erp,
        excepciones_activas=[ex]
    )

    assert len(registros) == 1
    reg = registros[0]

    # Activo → SALDO_FAVOR rechazado
    assert reg.estado_validacion == "ERROR_SALDO_ACTIVO"
    assert "RETIRADO" in reg.observaciones

    # Valor intacto
    assert reg.valor == 100000.0, f"valor esperado 100000.0, obtenido {reg.valor}"

    # RDC conservado: empresa sigue pagando su 24%
    assert reg.valor_rdc == 24000.0, f"valor_rdc esperado 24000.0 (conservado para activo), obtenido {reg.valor_rdc}"


@pytest.mark.asyncio
async def test_hdi_excepcion_saldo_favor_ausente_erp(db_session):
    """
    Colaborador AUSENTE en ERP (no aparece en mapa_erp) con SALDO_FAVOR en HDI.

    La política falla cerrado: sin confirmación ERP → ERROR_SALDO_ACTIVO.
    También valida que no se conserve RDC (sin ERP → sin subsidio empresa).
    """
    archivo = _make_archivo(db_session, "test_hdi_ausente.xlsx")
    await db_session.commit()
    await db_session.refresh(archivo)

    CEDULA = "99999999"
    ex = _make_excepcion(db_session, CEDULA, saldo=50000.0)
    await db_session.commit()

    mapa_erp = {}  # ERP no devuelve al empleado

    rows = [{
        "cedula": CEDULA,
        "nombre_asociado": "SIN ESTABLECIMIENTO",
        "empresa": "REFRIDCOL",
        "concepto": "SEGURO DE VIDA",
        "valor": 30000.0,
        "valor_rdc": 7200.0,
        "valor_colaborador": 22800.0,
        "observaciones": ""
    }]

    registros = await NominaService.persistir_registros_normalizados(
        session=db_session,
        archivo_id=archivo.id,
        mes=6,
        anio=2026,
        rows=rows,
        categoria="OTROS",
        subcategoria="SEGUROS HDI",
        mapa_erp=mapa_erp,
        excepciones_activas=[ex]
    )

    assert len(registros) == 1
    reg = registros[0]

    # Sin ERP → falla cerrado → ERROR_SALDO_ACTIVO
    assert reg.estado_validacion == "ERROR_SALDO_ACTIVO"
    # Sin ERP → sin subsidio de empresa
    assert reg.valor_rdc == 0.0, f"valor_rdc esperado 0.0 (sin ERP), obtenido {reg.valor_rdc}"
