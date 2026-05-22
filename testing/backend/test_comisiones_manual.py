import pytest
from unittest.mock import patch
from app.services.novedades_nomina.nomina_manual_service import NominaManualService
from app.models.novedades_nomina.nomina import NominaRegistroNormalizado, NominaArchivo
from sqlmodel import select, delete

@pytest.mark.asyncio
async def test_procesar_manual_comisiones_activos_vs_inactivos(db_session):
    """
    Verifica que al procesar comisiones de forma manual:
    1. Solo los colaboradores ACTIVOS se registren en nomina_registros_normalizados.
    2. Los inactivos o no encontrados aparezcan en warnings_detalle.
    3. Todos se muestren en la respuesta de filas.
    """
    # Mock data a procesar
    input_data = [
        {"cedula": "999991", "nombre": "Colaborador Activo", "empresa": "REFRIDCOL", "valor": 150000},
        {"cedula": "999992", "nombre": "Colaborador Retirado", "empresa": "REFRIDCOL", "valor": 200000},
        {"cedula": "999993", "nombre": "Colaborador No En ERP", "empresa": "REFRIDCOL", "valor": 300000}
    ]
    
    # Mock de EmpleadosService.consultar_empleados_bulk
    mock_erp_data = {
        "999991": {"nombre": "Colaborador Activo", "empresa": "REFRIDCOL", "estado": "ACTIVO", "ciudadcontratacion": "BOGOTA"},
        "999992": {"nombre": "Colaborador Retirado", "empresa": "REFRIDCOL", "estado": "RETIRADO", "ciudadcontratacion": "MEDELLIN"}
    }
    
    # Usamos mock.patch para interceptar la consulta al ERP
    with patch("app.services.erp.empleados_service.EmpleadosService.consultar_empleados_bulk", return_value=mock_erp_data):
        # Ejecutamos el procesamiento manual
        res = await NominaManualService.procesar_manual_comisiones(
            session=db_session,
            db_erp="mock_db_erp",
            data=input_data,
            mes=5,
            anio=2026
        )
        
    try:
        # 1. Validar la respuesta del servicio
        assert res is not None
        assert "filas" in res
        assert "warnings_detalle" in res
        
        # Deben retornar las 3 filas en la respuesta para visualizarse en el frontend
        filas = res["filas"]
        assert len(filas) == 3
        
        cedulas_filas = [f["cedula"] for f in filas]
        assert "999991" in cedulas_filas
        assert "999992" in cedulas_filas
        assert "999993" in cedulas_filas
        
        # Debe haber warnings para el retirado y el que no existe en el ERP
        warnings = res["warnings_detalle"]
        assert len(warnings) == 2
        
        cedulas_warnings = [w["cedula"] for w in warnings]
        assert "999992" in cedulas_warnings
        assert "999993" in cedulas_warnings
        
        # 2. Validar que solo el activo quedó persistido en la base de datos
        stmt = select(NominaRegistroNormalizado).where(
            NominaRegistroNormalizado.subcategoria_final == "COMISIONES",
            NominaRegistroNormalizado.mes_fact == 5,
            NominaRegistroNormalizado.año_fact == 2026
        )
        db_records = (await db_session.execute(stmt)).scalars().all()
        
        # Solo el activo debe estar en la BD
        assert len(db_records) == 1
        assert db_records[0].cedula == "999991"
        assert db_records[0].valor == 150000
        
    finally:
        # LIMPIEZA ABSOLUTA: Eliminar cualquier registro de prueba creado para evitar conflictos
        await db_session.execute(
            delete(NominaRegistroNormalizado).where(
                NominaRegistroNormalizado.cedula.in_(["999991", "999992", "999993"]),
                NominaRegistroNormalizado.subcategoria_final == "COMISIONES"
            )
        )
        await db_session.execute(
            delete(NominaArchivo).where(
                NominaArchivo.nombre_archivo == "manual_comisiones_5_2026.json"
            )
        )
        await db_session.commit()
