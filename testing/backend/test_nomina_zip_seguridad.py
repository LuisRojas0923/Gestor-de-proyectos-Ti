import os
import io
import zipfile
import pytest
from unittest.mock import patch, AsyncMock
from fastapi import UploadFile, HTTPException
from sqlmodel import select

from app.models.novedades_nomina.nomina import NominaRegistroNormalizado, NominaArchivo
from app.services.novedades_nomina.nomina_service import NominaService
from app.services.novedades_nomina.tabla_maestra_service import TablaMaestraService


# ──────────────────────────────────────────────────────────────────────────────
# Utilidades de Mock para las Pruebas
# ──────────────────────────────────────────────────────────────────────────────

class MockUploadFile(UploadFile):
    """Simula un archivo subido en memoria para inyectarlo al servicio real."""
    def __init__(self, filename: str, content: bytes):
        super().__init__(filename=filename, file=io.BytesIO(content))
        self._content = content
        
    async def read(self, *args, **kwargs):
        return self._content

def build_zip_content(filename: str, content: bytes) -> bytes:
    """Crea un ZIP real en memoria para testear la extracción y sanitización."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr(filename, content)
    buf.seek(0)
    return buf.read()

def extractor_dummy(binarios):
    """Simula el extractor retornando 1 fila válida para avanzar el flujo."""
    rows = [{
        "cedula": "12345",
        "valor": 1000.0,
        "nombre_asociado": "Test User",
        "valor_rdc": 0.0,
        "valor_colaborador": 1000.0,
        "empresa": "REFRIDCOL",
        "concepto": "Prueba",
        "ciudad": "Cali",
        "observaciones": "",
        "horas": 0,
        "dias": 0,
        "estado_validacion": "OK",
    }]
    return rows, {"total": 1}, []


# ──────────────────────────────────────────────────────────────────────────────
# 1. Pruebas de Integración (Atomicidad, Rollback Físico y Sanitización ZIP)
# ──────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestIntegracionZipSeguridad:

    async def test_sanitizacion_nombres_zip(self, db_session):
        """
        Inyecta un ZIP malicioso al servicio real y verifica que en el STORAGE_DIR
        el ZIP guardado solo contenga el archivo sanitizado.
        """
        malicious_zip = build_zip_content("../../etc/passwd", b"malicioso")
        file_upload = MockUploadFile(filename="test_upload.zip", content=malicious_zip)
        db_erp_mock = AsyncMock()
        
        with patch("app.services.novedades_nomina.nomina_service.NominaService.get_mapa_erp", return_value={}):
            with patch("app.services.novedades_nomina.excepcion_service.ExcepcionService.obtener_excepciones_activas", return_value=[]):
                # Ejecutamos el flujo real con la DB real
                await NominaService.procesar_flujo(
                    session=db_session,
                    db_erp=db_erp_mock,
                    files=[file_upload],
                    categoria="OTROS",
                    subcategoria="SEGUROS HDI",
                    extractor_fn=extractor_dummy,
                    extension="zip",
                    mes=1,
                    anio=2026
                )
                
        # Buscar el archivo generado en la DB
        result = await db_session.execute(select(NominaArchivo))
        archivos = result.scalars().all()
        assert len(archivos) == 1
        archivo_db = archivos[0]
        
        # Verificar sistema de archivos
        storage_path = archivo_db.ruta_almacenamiento
        assert os.path.exists(storage_path)
        
        # Leer el ZIP escrito por el servicio
        with zipfile.ZipFile(storage_path, "r") as zf:
            nombres = zf.namelist()
            assert "passwd" in nombres
            assert "../../etc/passwd" not in nombres

        # Limpiar
        os.remove(storage_path)

    async def test_rollback_fisico_en_fallo_commit(self, db_session):
        """
        Simula que shutil.move se realiza correctamente pero la Base de Datos falla.
        Asegura que NominaService.procesar_flujo capture el error, ejecute rollback
        y borre el archivo mal-guardado del sistema.
        """
        valid_zip = build_zip_content("datos.xlsx", b"valido")
        file_upload = MockUploadFile(filename="test_upload.zip", content=valid_zip)
        db_erp_mock = AsyncMock()

        # Capturaremos el hash para buscar si el archivo quedó
        from app.services.novedades_nomina.nomina_service import NominaService
        hash_file = NominaService.calcular_hash(valid_zip)

        original_commit = db_session.commit
        
        async def mock_commit_error():
            raise Exception("DB Down - Fallo forzado")
            
        with patch.object(db_session, "commit", side_effect=mock_commit_error):
            with patch("app.services.novedades_nomina.nomina_service.NominaService.get_mapa_erp", return_value={}):
                with patch("app.services.novedades_nomina.excepcion_service.ExcepcionService.obtener_excepciones_activas", return_value=[]):
                    with pytest.raises(HTTPException) as exc:
                        await NominaService.procesar_flujo(
                            session=db_session,
                            db_erp=db_erp_mock,
                            files=[file_upload],
                            categoria="OTROS",
                            subcategoria="SEGUROS HDI",
                            extractor_fn=extractor_dummy,
                            extension="zip",
                            mes=2,
                            anio=2026
                        )
                    assert exc.value.status_code == 500

        # Verificamos rollback de BD
        result = await db_session.execute(select(NominaArchivo))
        assert len(result.scalars().all()) == 0

        # Verificamos rollback físico (El archivo FINAL no debe existir)
        # NominaService crea los archivos en "uploads/{hash}.zip"
        expected_path = os.path.join("uploads", f"{hash_file}.zip")
        assert not os.path.exists(expected_path)


# ──────────────────────────────────────────────────────────────────────────────
# 2. Pruebas de Integración (Tabla Maestra Q1/Q2)
# ──────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestIntegracionTablaMaestra:

    async def test_tabla_maestra_q1_q2_agrupacion(self, db_session):
        """
        Almacena registros reales en PostgreSQL y verifica que TablaMaestraService
        los clasifique y agrupe correctamente según la quincena (Q1 y Q2).
        """
        # Q1: Mes 3
        reg1 = NominaRegistroNormalizado(
            archivo_id=None,
            cedula="Q1-123",
            mes_fact=3,
            año_fact=2026,
            categoria="OTROS",
            subcategoria="SEGUROS HDI",
            subcategoria_final="SEGUROS HDI",
            valor=100.0,
            valor_rdc=24.0,
            valor_colaborador=76.0,
            estado_validacion="OK"
        )
        # Q2: Mes 8
        reg2 = NominaRegistroNormalizado(
            archivo_id=None,
            cedula="Q2-456",
            mes_fact=8,
            año_fact=2026,
            categoria="OTROS",
            subcategoria="SEGUROS HDI",
            subcategoria_final="SEGUROS HDI",
            valor=200.0,
            valor_rdc=48.0,
            valor_colaborador=152.0,
            estado_validacion="OK"
        )
        # Q2: Otra categoría
        reg3 = NominaRegistroNormalizado(
            archivo_id=None,
            cedula="Q2-789",
            mes_fact=8,
            año_fact=2026,
            categoria="OTROS",
            subcategoria="CELULARES",
            subcategoria_final="CELULARES",
            valor=50000.0,
            valor_rdc=0.0,
            valor_colaborador=50000.0,
            estado_validacion="OK"
        )
        
        db_session.add_all([reg1, reg2, reg3])
        await db_session.commit()

        # Mock validacion_disponibilidad para que deje generar
        # ya que faltarían las otras "subcategorías base"
        with patch.object(TablaMaestraService, "validar_disponibilidad", return_value={"completo": True, "disponibles": ["SEGUROS HDI", "CELULARES"]}):
            # Probar Q1 (Mes 3)
            res_q1 = await TablaMaestraService.generar_tabla_maestra(
                session=db_session, mes=3, anio=2026, quincena="Q1"
            )
            assert res_q1["error"] is False
            filas_q1 = res_q1["filas"]
            assert len(filas_q1) == 1
            assert filas_q1[0]["CEDULA"] == "Q1-123"
            
            # Seguros HDI aplica el valor del colaborador (76) dividido en 2 = 38
            assert filas_q1[0]["VALOR QUINCENAL"] == 38.0

            # Probar Q2 (Mes 8)
            res_q2 = await TablaMaestraService.generar_tabla_maestra(
                session=db_session, mes=8, anio=2026, quincena="Q2"
            )
            assert res_q2["error"] is False
            filas_q2 = res_q2["filas"]
            assert len(filas_q2) == 2
            
            cedulas_q2 = [f["CEDULA"] for f in filas_q2]
            assert "Q2-456" in cedulas_q2
            assert "Q2-789" in cedulas_q2

            # Celulares (50000) dividido en 2 = 25000
            fila_celulares = next(f for f in filas_q2 if f["CEDULA"] == "Q2-789")
            assert fila_celulares["VALOR QUINCENAL"] == 25000.0
