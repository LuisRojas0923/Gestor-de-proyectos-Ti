import pytest
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# --- PRUEBAS DE EQUIPOS MÓVILES ---
@pytest.mark.asyncio
async def test_crear_y_listar_equipos(client):
    """Verifica el flujo de gestión de inventario de equipos"""
    equipo_payload = {
        "marca": "SAMSUNG",
        "modelo": "Galaxy S23 Test",
        "imei": f"IMEI-{int(datetime.now().timestamp())}",
        "serial": "SN-999-TEST",
        "estado_fisico": "NUEVO",
        "observaciones": "Equipo de prueba automatizada"
    }
    
    # 1. Crear Equipo
    response = await client.post("/lineas-corporativas/equipos", json=equipo_payload)
    assert response.status_code == 200 # Según router.py es 200
    equipo_data = response.json()
    assert equipo_data["modelo"] == equipo_payload["modelo"]
    assert "id" in equipo_data
    
    # 2. Listar y encontrarlo
    response_list = await client.get("/lineas-corporativas/equipos")
    assert response_list.status_code == 200
    equipos = response_list.json()
    assert any(e["id"] == equipo_data["id"] for e in equipos)

# --- PRUEBAS DE PERSONAS (EMPLEADOS COR) ---
@pytest.mark.asyncio
async def test_crear_y_listar_personas(client):
    """Verifica la gestión de personas asociadas a líneas"""
    cedula_test = f"ID-{int(datetime.now().timestamp())}"
    persona_payload = {
        "documento": cedula_test,
        "nombre": "EMPLEADO TEST LINEAS",
        "tipo": "INTERNO",
        "cargo": "Analista de Pruebas",
        "area": "Tecnología",
        "centro_costo": "999-TEST"
    }
    
    # 1. Crear Persona
    response = await client.post("/lineas-corporativas/personas", json=persona_payload)
    assert response.status_code == 200
    persona_data = response.json()
    assert persona_data["documento"] == cedula_test
    
    # 2. Listar y encontrarlo
    response_list = await client.get("/lineas-corporativas/personas")
    assert response_list.status_code == 200
    personas = response_list.json()
    assert any(p["documento"] == cedula_test for p in personas)

# --- PRUEBA DE CICLO DE VIDA DE LÍNEA ---
@pytest.mark.asyncio
async def test_flujo_completo_linea(client):
    """
    PRUEBA INTEGRAL: Crea equipo, persona y línea, luego consulta y actualiza.
    """
    timestamp = int(datetime.now().timestamp())
    nro_linea = f"300{str(timestamp)[-7:]}"
    
    # 1. Preparar Dependencias (Equipo y Persona)
    resp_e = await client.post("/lineas-corporativas/equipos", json={"modelo": "MOCK-EQ", "marca": "MOCK"})
    equipo_id = resp_e.json()["id"]
    
    cedula = f"CED-{timestamp}"
    await client.post("/lineas-corporativas/personas", json={"documento": cedula, "nombre": "TEST"})
    
    # 2. Crear Línea
    linea_payload = {
        "linea": nro_linea,
        "empresa": "CLARO",
        "estatus": "ACTIVA",
        "estado_asignacion": "ASIGNADA",
        "equipo_id": equipo_id,
        "documento_asignado": cedula,
        "documento_cobro": cedula,
        "nombre_plan": "Plan Ilimitado Test",
        "cobro_fijo_coef": 0.5,
        "cobro_especiales_coef": 1.0
    }
    
    response = await client.post("/lineas-corporativas/", json=linea_payload)
    assert response.status_code == 201
    linea_data = response.json()
    assert linea_data["linea"] == nro_linea
    assert linea_data["equipo"]["id"] == equipo_id
    
    # 3. Obtener por ID
    linea_id = linea_data["id"]
    response_get = await client.get(f"/lineas-corporativas/{linea_id}")
    assert response_get.status_code == 200
    assert response_get.json()["linea"] == nro_linea
    
    # 4. Actualizar
    update_payload = {"estatus": "INACTIVA", "observaciones": "Prueba de actualización"}
    response_put = await client.put(f"/lineas-corporativas/{linea_id}", json=update_payload)
    assert response_put.status_code == 200
    assert response_put.json()["estatus"] == "INACTIVA"

# --- PRUEBA DE REPORTES Y ALERTAS ---
@pytest.mark.asyncio
async def test_endpoints_auxiliares(client):
    """Verifica reportes y alertas"""
    # 1. Reporte CO (periodo dummy)
    response = await client.get("/lineas-corporativas/reporte-co", params={"periodo": "2026-01"})
    if response.status_code != 200:
        print(f"ERROR 500 DETAIL: {response.json().get('detail')}")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    
    # 2. Alertas de Empleados
    response = await client.get("/lineas-corporativas/alertas-empleados")
    assert response.status_code == 200
    assert "alertas" in response.json()

# --- PRUEBA DE IMPORTACIÓN REAL ---
@pytest.mark.asyncio
async def test_importar_factura_real(client):
    """
    Verifica el motor de dispersión usando el archivo Excel real de Claro.
    """
    import os
    
    # RUTA AL ARCHIVO REAL PROVISTO POR EL USUARIO
    excel_path = r"c:\Users\amejoramiento6\Gestor-de-proyectos-Ti\Factura_8.22439237_6046263105.xlsx.XLSX"
    if not os.path.exists(excel_path):
        pytest.skip(f"Archivo real no encontrado en {excel_path}")

    # 1. Preparar Dependencias: Registrar la linea 3126207416 que existe en el Excel
    # Primero necesitamos un equipo
    resp_e = await client.post("/lineas-corporativas/equipos", json={"modelo": "REAL-TEST-EQ", "marca": "MOCK"})
    equipo_id = resp_e.json()["id"]
    
    # Una persona
    cedula = "CED-REAL-TEST"
    await client.post("/lineas-corporativas/personas", json={
        "documento": cedula, 
        "nombre": "TITULAR REAL", 
        "centro_costo": "CC-REAL-PROD"
    })
    
    # Crear la Línea que coincida con el MIN del Excel
    linea_payload = {
        "linea": "3126207416",
        "empresa": "CLARO",
        "estatus": "ACTIVA",
        "estado_asignacion": "ASIGNADA",
        "equipo_id": equipo_id,
        "documento_asignado": cedula,
        "documento_cobro": cedula,
        "nombre_plan": "Plan Real Test",
        "cobro_fijo_coef": 0.5, # 50% empresa, 50% empleado
        "cobro_especiales_coef": 1.0 # 100% empleado
    }
    await client.post("/lineas-corporativas/", json=linea_payload)

    # 2. Ejecutar Importación
    with open(excel_path, "rb") as f:
        files = {
            'archivo': ('Factura_Real.xlsx', f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        }
        # El archivo tiene periodo 202604 según mi inspección
        response = await client.post(
            "/lineas-corporativas/importar-factura", 
            params={"periodo": "2026-04"},
            files=files
        )
    
    assert response.status_code == 200
    data = response.json()
    assert data["registros_procesados"] > 0
    
    # 3. Validar Reporte CO
    # El MIN 3126207416 tiene un total de ~132,681.49 en el Excel
    response_co = await client.get("/lineas-corporativas/reporte-co", params={"periodo": "2026-04"})
    assert response_co.status_code == 200
    reporte = response_co.json()
    assert len(reporte) > 0
    
    # Verificar que el Centro de Costo de la línea aparezca en el reporte
    assert any(row["co"] == "CC-REAL-PROD" for row in reporte)
