import pytest
from datetime import datetime
from sqlmodel import select
from app.models.novedades_nomina.nomina import NominaArchivo, NominaExcepcion, NominaRegistroNormalizado
from app.services.novedades_nomina.nomina_service import NominaService

@pytest.mark.asyncio
async def test_hdi_excepcion_saldo_favor_retirado(db_session):
    """
    Verifica que para SEGUROS HDI, si un colaborador tiene estado 'Retirado':
    1. No se le aplique el descuento de la empresa (valor_rdc = 0.0).
    2. El valor_colaborador asuma el 100% del valor.
    3. Si tiene una excepción de SALDO_FAVOR, se descuente de su balance actual,
       pero en la base de datos se conserve valor = valor_original y valor_colaborador = valor_original
       para que no figure con $0 facturados contablemente.
    """
    archivo = NominaArchivo(
        nombre_archivo="test_hdi_archivo.xlsx",
        hash_archivo="hash_hdi_test",
        tamaño_bytes=1024,
        tipo_archivo="pdf",
        ruta_almacenamiento="/tmp/test",
        mes_fact=6,
        año_fact=2026,
        categoria="OTROS",
        subcategoria="SEGUROS HDI",
        estado="Cargado"
    )
    db_session.add(archivo)
    await db_session.commit()
    await db_session.refresh(archivo)

    # Excepción de SALDO_FAVOR
    ex = NominaExcepcion(
        cedula="16783959",
        nombre_asociado="DELGADO REINA ALEXANDER",
        subcategoria="SEGUROS HDI",
        tipo="SALDO_FAVOR",
        estado="ACTIVO",
        valor_configurado=100000.0,
        saldo_actual=70000.0,
        creado_por="ADMIN"
    )
    db_session.add(ex)
    await db_session.commit()

    # Colaborador RETIRADO en ERP
    mapa_erp = {
        "16783959": {
            "nombre": "DELGADO REINA ALEXANDER",
            "estado": "Retirado",
            "empresa": "REFRIDCOL",
            "ciudadcontratacion": "Cali"
        }
    }

    # Fila simulada del extractor HDI
    # El extractor por defecto asume activo (24% RDC, 76% Colab)
    rows = [{
        "cedula": "16783959",
        "nombre_asociado": "DELGADO REINA ALEXANDER",
        "empresa": "REFRIDCOL",
        "concepto": "SEGURO DE VIDA",
        "valor": 24922.0,
        "valor_rdc": 5981.0,
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

    # 1. RDC debe ser 0.0 (no es colaborador activo)
    assert reg.valor_rdc == 0.0

    # 2. El colaborador asume el 100% de la prima
    # 3. Y aunque se aplicó la excepción (saldo_actual disminuyó), no debe guardarse en $0
    assert reg.valor == 24922.0
    assert reg.valor_colaborador == 24922.0
    assert reg.estado_validacion == "EXCEPCION_SALDO_FAVOR"
    assert "Saldo favor aplicado" in reg.observaciones
