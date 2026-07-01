import pytest
from datetime import datetime
from sqlmodel import select
from app.models.novedades_nomina.nomina import NominaArchivo, NominaExcepcion, NominaRegistroNormalizado
from app.services.novedades_nomina.nomina_service import NominaService

@pytest.mark.asyncio
async def test_excepcion_contratista_en_archivo(db_session):
    """
    Verifica que si un colaborador tiene una excepción de tipo CONTRATISTAS
    y viene en el archivo de nómina, se le asigne la empresa 'CONTRATISTA'
    independientemente de si está o no en el ERP.
    """
    archivo = NominaArchivo(
        nombre_archivo="test_archivo_1.xlsx",
        hash_archivo="hash_test_1",
        tamaño_bytes=1024,
        tipo_archivo="xlsx",
        ruta_almacenamiento="/tmp/test",
        mes_fact=5,
        año_fact=2026,
        categoria="OTROS",
        subcategoria="PLANILLAS REGIONALES",
        estado="Cargado"
    )
    db_session.add(archivo)
    await db_session.commit()
    await db_session.refresh(archivo)

    ex = NominaExcepcion(
        cedula="999999",
        nombre_asociado="Contratista Prueba 1",
        subcategoria="PLANILLAS REGIONALES",
        tipo="CONTRATISTAS",
        estado="ACTIVO",
        valor_configurado=150000,
        creado_por="ADMIN"
    )
    db_session.add(ex)
    await db_session.commit()

    rows = [{"cedula": "999999", "valor": 120000, "concepto": "Honorarios"}]
    registros_a = await NominaService.persistir_registros_normalizados(
        session=db_session,
        archivo_id=archivo.id,
        mes=5,
        anio=2026,
        rows=rows,
        categoria="OTROS",
        subcategoria="PLANILLAS REGIONALES",
        mapa_erp={},
        excepciones_activas=[ex]
    )
    
    assert len(registros_a) == 1
    assert registros_a[0].empresa == "CONTRATISTA"
    assert registros_a[0].estado_validacion == "EXCEPCION_AUTORIZADA"

    mapa_erp = {
        "999999": {
            "nombre": "Contratista Prueba 1",
            "estado": "Activo",
            "empresa": "SOLID",
            "ciudadcontratacion": "Bogotá"
        }
    }
    
    registros_b = await NominaService.persistir_registros_normalizados(
        session=db_session,
        archivo_id=archivo.id,
        mes=5,
        anio=2026,
        rows=rows,
        categoria="OTROS",
        subcategoria="PLANILLAS REGIONALES",
        mapa_erp=mapa_erp,
        excepciones_activas=[ex]
    )
    
    assert len(registros_b) == 1
    assert registros_b[0].empresa == "CONTRATISTA"
    assert registros_b[0].estado_validacion == "EXCEPCION_AUTORIZADA"


@pytest.mark.asyncio
async def test_excepcion_contratista_inyectada(db_session):
    """
    Verifica que si un colaborador tiene una excepción de tipo CONTRATISTAS
    y NO viene en el archivo, se inyecte el registro con la empresa 'CONTRATISTA'.
    """
    archivo = NominaArchivo(
        nombre_archivo="test_archivo_2.xlsx",
        hash_archivo="hash_test_2",
        tamaño_bytes=1024,
        tipo_archivo="xlsx",
        ruta_almacenamiento="/tmp/test",
        mes_fact=5,
        año_fact=2026,
        categoria="OTROS",
        subcategoria="PLANILLAS REGIONALES",
        estado="Cargado"
    )
    db_session.add(archivo)
    await db_session.commit()
    await db_session.refresh(archivo)

    ex = NominaExcepcion(
        cedula="888888",
        nombre_asociado="Contratista Inyectado",
        subcategoria="PLANILLAS REGIONALES",
        tipo="CONTRATISTAS",
        estado="ACTIVO",
        valor_configurado=200000,
        creado_por="ADMIN"
    )
    db_session.add(ex)
    await db_session.commit()

    registros_a = await NominaService.persistir_registros_normalizados(
        session=db_session,
        archivo_id=archivo.id,
        mes=5,
        anio=2026,
        rows=[],
        categoria="OTROS",
        subcategoria="PLANILLAS REGIONALES",
        mapa_erp={},
        excepciones_activas=[ex]
    )
    
    assert len(registros_a) == 1
    assert registros_a[0].cedula == "888888"
    assert registros_a[0].valor == 200000
    assert registros_a[0].empresa == "CONTRATISTA"
    assert registros_a[0].estado_validacion == "EXCEPCION_AUTORIZADA"

    mapa_erp = {
        "888888": {
            "nombre": "Contratista Inyectado",
            "estado": "Activo",
            "empresa": "REFRIDCOL",
            "ciudadcontratacion": "Medellín"
        }
    }
    
    registros_b = await NominaService.persistir_registros_normalizados(
        session=db_session,
        archivo_id=archivo.id,
        mes=5,
        anio=2026,
        rows=[],
        categoria="OTROS",
        subcategoria="PLANILLAS REGIONALES",
        mapa_erp=mapa_erp,
        excepciones_activas=[ex]
    )
    
    assert len(registros_b) == 1
    assert registros_b[0].cedula == "888888"
    assert registros_b[0].valor == 200000
    assert registros_b[0].empresa == "CONTRATISTA"
    assert registros_b[0].estado_validacion == "EXCEPCION_AUTORIZADA"


@pytest.mark.asyncio
async def test_excepcion_retirado_autorizado_en_archivo(db_session):
    """
    Verifica que si un colaborador tiene una excepción de tipo RETIRADO_AUTORIZADO
    y viene en el archivo de nómina, se le asigne la empresa 'RETIRADO_AUTORIZADO'
    independientemente de si está o no en el ERP.
    """
    archivo = NominaArchivo(
        nombre_archivo="test_archivo_3.xlsx",
        hash_archivo="hash_test_3",
        tamaño_bytes=1024,
        tipo_archivo="xlsx",
        ruta_almacenamiento="/tmp/test",
        mes_fact=5,
        año_fact=2026,
        categoria="OTROS",
        subcategoria="PLANILLAS REGIONALES",
        estado="Cargado"
    )
    db_session.add(archivo)
    await db_session.commit()
    await db_session.refresh(archivo)

    ex = NominaExcepcion(
        cedula="777777",
        nombre_asociado="Retirado Prueba 1",
        subcategoria="PLANILLAS REGIONALES",
        tipo="RETIRADO_AUTORIZADO",
        estado="ACTIVO",
        valor_configurado=150000,
        creado_por="ADMIN"
    )
    db_session.add(ex)
    await db_session.commit()

    rows = [{"cedula": "777777", "valor": 120000, "concepto": "Liquidación"}]
    registros_a = await NominaService.persistir_registros_normalizados(
        session=db_session,
        archivo_id=archivo.id,
        mes=5,
        anio=2026,
        rows=rows,
        categoria="OTROS",
        subcategoria="PLANILLAS REGIONALES",
        mapa_erp={},
        excepciones_activas=[ex]
    )
    
    assert len(registros_a) == 1
    assert registros_a[0].empresa == "RETIRADO_AUTORIZADO"
    assert registros_a[0].estado_validacion == "EXCEPCION_AUTORIZADA"

    mapa_erp = {
        "777777": {
            "nombre": "Retirado Prueba 1",
            "estado": "Retirado",
            "empresa": "SOLID",
            "ciudadcontratacion": "Cali"
        }
    }
    
    registros_b = await NominaService.persistir_registros_normalizados(
        session=db_session,
        archivo_id=archivo.id,
        mes=5,
        anio=2026,
        rows=rows,
        categoria="OTROS",
        subcategoria="PLANILLAS REGIONALES",
        mapa_erp=mapa_erp,
        excepciones_activas=[ex]
    )
    
    assert len(registros_b) == 1
    assert registros_b[0].empresa == "RETIRADO_AUTORIZADO"
    assert registros_b[0].estado_validacion == "EXCEPCION_AUTORIZADA"


@pytest.mark.asyncio
async def test_excepcion_retirado_autorizado_inyectada(db_session):
    """
    Verifica que si un colaborador tiene una excepción de tipo RETIRADO_AUTORIZADO
    y NO viene en el archivo, se inyecte el registro con la empresa 'RETIRADO_AUTORIZADO'.
    """
    archivo = NominaArchivo(
        nombre_archivo="test_archivo_4.xlsx",
        hash_archivo="hash_test_4",
        tamaño_bytes=1024,
        tipo_archivo="xlsx",
        ruta_almacenamiento="/tmp/test",
        mes_fact=5,
        año_fact=2026,
        categoria="OTROS",
        subcategoria="PLANILLAS REGIONALES",
        estado="Cargado"
    )
    db_session.add(archivo)
    await db_session.commit()
    await db_session.refresh(archivo)

    ex = NominaExcepcion(
        cedula="666666",
        nombre_asociado="Retirado Inyectado",
        subcategoria="PLANILLAS REGIONALES",
        tipo="RETIRADO_AUTORIZADO",
        estado="ACTIVO",
        valor_configurado=300000,
        creado_por="ADMIN"
    )
    db_session.add(ex)
    await db_session.commit()

    registros_a = await NominaService.persistir_registros_normalizados(
        session=db_session,
        archivo_id=archivo.id,
        mes=5,
        anio=2026,
        rows=[],
        categoria="OTROS",
        subcategoria="PLANILLAS REGIONALES",
        mapa_erp={},
        excepciones_activas=[ex]
    )
    
    assert len(registros_a) == 1
    assert registros_a[0].cedula == "666666"
    assert registros_a[0].valor == 300000
    assert registros_a[0].empresa == "RETIRADO_AUTORIZADO"
    assert registros_a[0].estado_validacion == "EXCEPCION_AUTORIZADA"

    mapa_erp = {
        "666666": {
            "nombre": "Retirado Inyectado",
            "estado": "Retirado",
            "empresa": "REFRIDCOL",
            "ciudadcontratacion": "Bogotá"
        }
    }
    
    registros_b = await NominaService.persistir_registros_normalizados(
        session=db_session,
        archivo_id=archivo.id,
        mes=5,
        anio=2026,
        rows=[],
        categoria="OTROS",
        subcategoria="PLANILLAS REGIONALES",
        mapa_erp=mapa_erp,
        excepciones_activas=[ex]
    )
    
    assert len(registros_b) == 1
    assert registros_b[0].cedula == "666666"
    assert registros_b[0].valor == 300000
    assert registros_b[0].empresa == "RETIRADO_AUTORIZADO"
    assert registros_b[0].estado_validacion == "EXCEPCION_AUTORIZADA"
