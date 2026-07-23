"""Concurrencia PostgreSQL de CELULARES, RETENCIONES y EMBARGOS."""

import asyncio
import io
import zipfile
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from sqlmodel import delete, select

from app.config import config
from app.models.novedades_nomina.nomina import (
    NominaArchivo,
    NominaExcepcion,
    NominaExcepcionHistorial,
    NominaRegistroNormalizado,
)
from app.services.novedades_nomina.nomina_service import NominaService


def _upload_xlsx(nombre: str):
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        archive.writestr("[Content_Types].xml", "<Types />")
        archive.writestr("xl/workbook.xml", "<workbook />")
    archivo = AsyncMock()
    archivo.filename = nombre
    archivo.content_type = (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    archivo.read = AsyncMock(return_value=output.getvalue())
    return archivo


@pytest.mark.asyncio
@pytest.mark.parametrize("subcategoria", ["CELULARES", "RETENCIONES", "EMBARGOS"])
async def test_flujos_directos_serializan_multiples_filas_por_cedula(
    tmp_path, monkeypatch, subcategoria
):
    monkeypatch.chdir(tmp_path)
    engine = create_async_engine(config.database_url, poolclass=NullPool)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    cedula = f"99{subcategoria[:3]}2098"
    mes, anio = 11, 2098
    excepcion_id = None
    resultados = []

    try:
        async with factory() as setup:
            await setup.execute(delete(NominaRegistroNormalizado).where(
                NominaRegistroNormalizado.subcategoria_final == subcategoria,
                NominaRegistroNormalizado.mes_fact == mes,
                NominaRegistroNormalizado.año_fact == anio,
            ))
            excepcion = NominaExcepcion(
                cedula=cedula,
                nombre_asociado="PRUEBA MULTIFILA",
                subcategoria=subcategoria,
                tipo="SALDO_FAVOR",
                estado="ACTIVO",
                valor_configurado=60,
                saldo_actual=60,
                creado_por="pytest",
            )
            setup.add(excepcion)
            await setup.commit()
            await setup.refresh(excepcion)
            excepcion_id = excepcion.id

        rows = [
            {"cedula": cedula, "valor": 40.0, "concepto": "LINEA 1"},
            {"cedula": cedula, "valor": 40.0, "concepto": "LINEA 2"},
        ]
        mapa_erp = {cedula: {
            "nombre": "PRUEBA MULTIFILA",
            "empresa": "REFRIDCOL",
            "estado": "ACTIVO",
            "ciudadcontratacion": "CALI",
        }}
        async with factory() as first, factory() as second:
            with patch.object(
                NominaService, "get_mapa_erp", new=AsyncMock(return_value=mapa_erp)
            ):
                resultados = await asyncio.gather(*[
                    NominaService.procesar_flujo(
                        session, AsyncMock(), [_upload_xlsx(f"{indice}.xlsx")],
                        "DESCUENTOS", subcategoria,
                        lambda _archivos: (rows, {}, []), "xlsx", mes, anio,
                    )
                    for indice, session in enumerate((first, second), 1)
                ])

        async with factory() as check:
            excepcion_final = await check.get(NominaExcepcion, excepcion_id)
            historiales = (await check.execute(select(NominaExcepcionHistorial).where(
                NominaExcepcionHistorial.excepcion_id == excepcion_id,
                NominaExcepcionHistorial.mes == mes,
                NominaExcepcionHistorial.anio == anio,
            ))).scalars().all()
            registros = (await check.execute(select(NominaRegistroNormalizado).where(
                NominaRegistroNormalizado.subcategoria_final == subcategoria,
                NominaRegistroNormalizado.mes_fact == mes,
                NominaRegistroNormalizado.año_fact == anio,
            ))).scalars().all()
            assert excepcion_final.saldo_actual == 0
            assert len(historiales) == 1
            assert historiales[0].valor_aplicado == 60
            assert sorted(registro.valor for registro in registros) == [0, 20]
    finally:
        if excepcion_id is not None:
            async with factory() as cleanup:
                await cleanup.execute(delete(NominaRegistroNormalizado).where(
                    NominaRegistroNormalizado.subcategoria_final == subcategoria,
                    NominaRegistroNormalizado.mes_fact == mes,
                    NominaRegistroNormalizado.año_fact == anio,
                ))
                await cleanup.execute(delete(NominaExcepcionHistorial).where(
                    NominaExcepcionHistorial.excepcion_id == excepcion_id
                ))
                await cleanup.execute(delete(NominaExcepcion).where(
                    NominaExcepcion.id == excepcion_id
                ))
                for resultado in resultados:
                    await cleanup.execute(delete(NominaArchivo).where(
                        NominaArchivo.id == resultado["archivo_id"]
                    ))
                await cleanup.commit()
        await engine.dispose()
