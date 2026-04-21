import pytest
import os
from app.config import config

@pytest.mark.asyncio
async def test_infra_disk_write_access():
    """
    Valida que el sistema tenga permisos de escritura en la ruta de adjuntos configurada.
    Fundamental tras la migracin de Base64 a Disco.
    """
    # Intentamos crear un directorio de prueba en el storage_path
    test_dir = os.path.join(config.storage_path, "infra_test")
    try:
        os.makedirs(test_dir, exist_ok=True)
        test_file = os.path.join(test_dir, "write_test.tmp")
        with open(test_file, "w") as f:
            f.write("test")
        
        # Limpiar
        os.remove(test_file)
        os.rmdir(test_dir)
        assert True
    except Exception as e:
        pytest.fail(f"Fallo de infraestructura: No hay permisos de escritura en {config.storage_path}. Error: {e}")

@pytest.mark.asyncio
async def test_infra_erp_bridge_health(client, auth_token):
    """
    Valida que el puente con el ERP responda correctamente.
    """
    if not auth_token:
        pytest.skip("Sin token")
        
    headers = {"Authorization": f"Bearer {auth_token}"}
    # Consultamos un endpoint que dependa del ERP
    response = await client.get("/erp/empleados/me", headers=headers)
    
    # Si devuelve 200 o 404 (usuario no encontrado pero ERP respondi) es aceptable.
    # Si devuelve 503 o ConnectionError, la infra de ERP est cada.
    assert response.status_code in [200, 404, 204], f"El puente ERP no responde adecuadamente: {response.status_code}"
