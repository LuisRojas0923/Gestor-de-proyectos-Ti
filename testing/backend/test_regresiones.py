import pytest
import os
from datetime import datetime
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Usamos cédula de prueba estándar del proyecto
TEST_USER_CEDULA = os.getenv("TEST_USER_CEDULA", "1107068093")
TEST_USER_PASS = os.getenv("TEST_USER_PASS", "1107068093")

@pytest.mark.asyncio
async def test_regresion_salud_sistema(client):
    """Verifica que el núcleo del sistema responda (Health Check)"""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["estado"] == "saludable"

@pytest.mark.asyncio
async def test_regresion_ciclo_vida_ticket(client, auth_token):
    """
    PRUEBA DE ORO: Garantiza que la creación y consulta de tickets (funcionalidad core)
    siga funcionando sin regresiones.
    """
    if not auth_token:
        pytest.skip("No se pudo obtener token de autenticación. Verifique credenciales de prueba.")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # 1. Definir ID único para esta ejecución
    ticket_id = f"REG-TKT-{int(datetime.now().timestamp())}"
    
    # 2. Intentar Creación
    payload = {
        "id": ticket_id,
        "categoria_id": "soporte_software",
        "asunto": "Ticket de Validación de Estabilidad",
        "descripcion": "Este ticket es generado automáticamente por la suite de regresiones para asegurar que nada se rompa.",
        "creador_id": TEST_USER_CEDULA,
        "nombre_creador": "Guardián de Regresiones",
        "correo_creador": "test@empresa.com",
        "prioridad": "Media",
        "areas_impactadas": ["Tecnología", "Garantía de Calidad"]
    }
    
    response_create = await client.post("/soporte/", json=payload, headers=headers)
    assert response_create.status_code in [200, 201], f"Fallo en creación: {response_create.text}"
    
    # IMPORTANTE: El servicio ignora el ID enviado y genera uno nuevo (TKT-XXXX)
    ticket_real_id = response_create.json()["id"]
    
    # 3. Verificar Persistencia (Consulta por ID)
    response_get = await client.get(f"/soporte/{ticket_real_id}", headers=headers)
    assert response_get.status_code == 200
    data = response_get.json()
    assert data["id"] == ticket_real_id
    assert data["asunto"] == payload["asunto"]
    
    # 4. Verificar en Listado General
    response_list = await client.get("/soporte/", headers=headers, params={"search": ticket_real_id})
    assert response_list.status_code == 200
    tickets = response_list.json()
    assert any(t["id"] == ticket_real_id for t in tickets), "El ticket creado no fue encontrado en el listado general."

@pytest.mark.asyncio
async def test_regresion_autenticacion_y_perfil(client, auth_token):
    """Garantiza que el sistema de usuarios y perfiles siga siendo íntegro"""
    if not auth_token:
        pytest.skip("Sin token")
        
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = await client.get("/auth/yo", headers=headers)
    assert response.status_code == 200
    assert response.json()["cedula"] == TEST_USER_CEDULA

@pytest.mark.asyncio
async def test_regresion_maestros_soporte(client):
    """Asegura que las categorías y catálogos básicos sigan disponibles"""
    response = await client.get("/soporte/categorias")
    assert response.status_code == 200
    categorias = response.json()
    assert len(categorias) > 0, "No se encontraron categorías de soporte configuradas."
    assert any(cat["id"] == "soporte_software" for cat in categorias), "Categoría core 'soporte_software' desaparecida."
