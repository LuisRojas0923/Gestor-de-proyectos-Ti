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


# --- PRUEBA DE IMPORTACIÓN DE INVENTARIO ---
@pytest.mark.asyncio
async def test_importar_inventario(client):
    """
    Verifica el endpoint de importación de inventario con un Excel mock.
    """
    import polars as pl
    import io
    import random
    
    timestamp = int(datetime.now().timestamp())
    rand_line1 = f"311{random.randint(1000000, 9999999)}"
    rand_line2 = f"311{random.randint(1000000, 9999999)}"
    rand_doc1 = f"DOC-{timestamp}-1"
    rand_doc2 = f"DOC-{timestamp}-2"
    
    # 1. Crear un DataFrame mock con la estructura del Excel de inventario
    df = pl.DataFrame({
        "LINEA": [rand_line1, rand_line2],
        "DOCUMENTO DE ASIGNADO": [rand_doc1, rand_doc2],
        "NOMBRE DE ASIGNADO": ["Empleado Uno", "Empleado Dos"],
        "CARGO": ["ANALISTA", "COORDINADOR"],
        "AREA": ["SISTEMAS", "OPERACIONES"],
        "CENTRO DE COSTO": ["CC-SIST", "CC-OPER"],
        "EMPRESA": ["CLARO", "CLARO"],
        "ESTATUS": ["ACTIVA", "ACTIVA"],
        "ESTADO DE ASIGNACION": ["ASIGNADA", "ASIGNADA"],
        "FECHA DE ACTUALIZACION": ["2026-07-10", "2026-07-10"],
        "CONVENIO #1": ["50%", "100%"]
    })
    
    # Escribir a un buffer en formato Excel
    buffer = io.BytesIO()
    df.write_excel(buffer)
    buffer.seek(0)
    
    files = {
        'archivo': ('Inventario_Mock.xlsx', buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    }
    
    # 2. Enviar archivo al endpoint
    response = await client.post("/lineas-corporativas/importar-inventario", files=files)
    assert response.status_code == 200
    
    data = response.json()
    assert data["lineas_creadas"] > 0
    assert data["empleados_creados"] > 0
    
    # 3. Verificar que se hayan creado en la base de datos
    # Listar líneas
    resp_l = await client.get("/lineas-corporativas/")
    assert resp_l.status_code == 200
    lineas = resp_l.json()
    assert any(l["linea"] == rand_line1 for l in lineas)
    assert any(l["linea"] == rand_line2 for l in lineas)
    
    # Verificar que el empleado y su centro de costos se actualizó correctamente
    linea_uno = next(l for l in lineas if l["linea"] == rand_line1)
    assert linea_uno["asignado"]["nombre"] == "Empleado Uno"
    assert linea_uno["asignado"]["centro_costo"] == "CC-SIST"
    assert linea_uno["cobro_fijo_coef"] == 0.5  # 50%
    
    linea_dos = next(l for l in lineas if l["linea"] == rand_line2)
    assert linea_dos["cobro_fijo_coef"] == 1.0  # 100%


@pytest.mark.asyncio
async def test_fase2_endpoints(client, db_session):
    """
    Verifica los endpoints de la Fase 2: auditoría cruzada y exportables de nómina y contabilidad.
    """
    # 1. Crear datos de prueba en la base de datos local
    from app.models.linea_corporativa.factura_model import FacturaLinea
    from app.models.linea_corporativa import LineaCorporativa, EmpleadoLinea
    import random
    
    rand_doc = f"RET-{random.randint(10000, 99999)}"
    line_inactiva = f"311{random.randint(1000000, 9999999)}"
    line_activa = f"311{random.randint(1000000, 9999999)}"
    
    # Crear un empleado retirado local para el test
    emp_ret = EmpleadoLinea(
        documento=rand_doc,
        nombre="Empleado Inactivo",
        tipo="INTERNO",
        centro_costo="CC-TEST"
    )
    db_session.add(emp_ret)
    
    # Crear dos líneas (una inactiva y una activa con empleado retirado)
    l_inactiva = LineaCorporativa(
        linea=line_inactiva,
        empresa="CLARO",
        estatus="INACTIVA",
        estado_asignacion="ASIGNADA",
        documento_asignado=rand_doc
    )
    l_activa = LineaCorporativa(
        linea=line_activa,
        empresa="CLARO",
        estatus="ACTIVA",
        estado_asignacion="ASIGNADA",
        documento_asignado=rand_doc
    )
    db_session.add(l_inactiva)
    db_session.add(l_activa)
    await db_session.flush()
    
    # Agregar facturas para el periodo 202607
    fact_inactiva = FacturaLinea(
        linea_id=l_inactiva.id,
        periodo="202607",
        documento_asignado=rand_doc,
        centro_costo="CC-TEST",
        cargo_mes=50000.0,
        total=50000.0,
        pago_empleado=25000.0,
        pago_refridcol=25000.0
    )
    fact_activa = FacturaLinea(
        linea_id=l_activa.id,
        periodo="202607",
        documento_asignado=rand_doc,
        centro_costo="CC-TEST",
        cargo_mes=80000.0,
        total=80000.0,
        pago_empleado=40000.0,
        pago_refridcol=40000.0
    )
    db_session.add(fact_inactiva)
    db_session.add(fact_activa)
    await db_session.commit()
    
    # 2. Probar Auditoría Cruce
    # Como db_erp no está disponible, emulamos la respuesta.
    response = await client.get("/lineas-corporativas/cruce/auditoria", params={"periodo": "202607"})
    assert response.status_code == 200, f"Error: {response.status_code}, Body: {response.text}"
    res_data = response.json()
    
    # La línea inactiva debe figurar como fuga
    assert len(res_data["fugas"]) > 0
    assert any(f["numero"] == line_inactiva for f in res_data["fugas"])
    
    # 3. Probar Exportación de Nómina
    response_nom = await client.get("/lineas-corporativas/cruce/exportar-nomina", params={"periodo": "202607"})
    assert response_nom.status_code == 200, f"Error: {response_nom.status_code}, Body: {response_nom.text}"
    assert "text/csv" in response_nom.headers["content-type"]
    csv_content = response_nom.text
    assert "DOCUMENTO;EMPLEADO;VALOR A DEDUCIR" in csv_content
    assert rand_doc in csv_content
    
    # 4. Probar Exportación Contable
    response_con = await client.get("/lineas-corporativas/cruce/exportar-contable", params={"periodo": "202607"})
    assert response_con.status_code == 200
    assert "text/csv" in response_con.headers["content-type"]
    csv_con_content = response_con.text
    assert "CENTRO COSTO;CARGO MES;DESCUENTO MES" in csv_con_content
    assert "CC-TEST" in csv_con_content


