import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import HTTPException
from app.services.novedades_nomina.nomina_service import NominaService

@pytest.mark.asyncio
async def test_procesar_flujo_magic_bytes_invalidos():
    session = AsyncMock()
    db_erp = MagicMock()
    
    # Crear un archivo falso que NO es zip ni xlsx (faltan los magic bytes PK\x03\x04)
    file_mock = AsyncMock()
    file_mock.filename = "prueba.xlsx"
    file_mock.read.return_value = b"MALA FIRMA 12345"
    
    files = [file_mock]
    
    with pytest.raises(HTTPException) as excinfo:
        await NominaService.procesar_flujo(
            session=session,
            db_erp=db_erp,
            files=files,
            categoria="OTROS",
            subcategoria="SEGUROS HDI",
            extractor_fn=AsyncMock(),
            extension="xlsx",
            mes=6,
            anio=2026
        )
        
    assert excinfo.value.status_code == 400
    assert "Firma OOXML incorrecta" in str(excinfo.value.detail)

@pytest.mark.asyncio
async def test_procesar_flujo_excede_limite_archivos():
    session = AsyncMock()
    db_erp = MagicMock()
    
    files = [AsyncMock() for _ in range(11)] # 11 archivos
    
    with pytest.raises(HTTPException) as excinfo:
        await NominaService.procesar_flujo(
            session=session,
            db_erp=db_erp,
            files=files,
            categoria="OTROS",
            subcategoria="SEGUROS HDI",
            extractor_fn=AsyncMock(),
            extension="xlsx",
            mes=6,
            anio=2026
        )
        
    assert excinfo.value.status_code == 400
    assert "Máximo 10 archivos" in str(excinfo.value.detail)
