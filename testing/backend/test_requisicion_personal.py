import pytest
import pytest_asyncio
import httpx
from httpx import ASGITransport
from datetime import date, timedelta
from app.main import app
from app.models.rrhh.solicitud_personal import EstadoRP
from app.database import async_engine

@pytest_asyncio.fixture(scope="function")
async def client():
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test/api/v2") as ac:
        yield ac
    await async_engine.dispose()

@pytest.mark.asyncio
async def test_flujo_completo_requisicion_personal(client, db_session):
    try:
        # 1. Crear/Obtener Ciudad semilla necesaria para la prueba
        res_ciudades = await client.get("/rrhh/catalogos/ciudades")
        ciudad_id = None
        for c in res_ciudades.json():
            if c["nombre"] == "CALI":
                ciudad_id = c["id"]
                break
        if not ciudad_id:
            res_ciudad = await client.post("/rrhh/catalogos/ciudades?nombre=CALI")
            assert res_ciudad.status_code == 201
            ciudad_id = res_ciudad.json()["id"]
    
        # Crear/Obtener Área
        res_areas = await client.get("/rrhh/catalogos/areas")
        area_id = None
        for a in res_areas.json():
            if a["nombre"] == "TECNOLOGIA":
                area_id = a["id"]
                break
        if not area_id:
            res_area = await client.post("/rrhh/catalogos/areas?nombre=TECNOLOGIA")
            assert res_area.status_code == 201
            area_id = res_area.json()["id"]
    
        # Crear/Obtener Cargo
        res_cargos = await client.get(f"/rrhh/catalogos/cargos?area_id={area_id}")
        cargo_id = None
        for cg in res_cargos.json():
            if cg["nombre"] == "DESARROLLADOR":
                cargo_id = cg["id"]
                break
        if not cargo_id:
            res_cargo = await client.post(f"/rrhh/catalogos/cargos?area_id={area_id}&nombre=DESARROLLADOR")
            assert res_cargo.status_code == 201
            cargo_id = res_cargo.json()["id"]
    
        # Crear/Obtener Aprobador
        res_aprobadores = await client.get("/rrhh/catalogos/aprobadores")
        aprobador_exists = False
        for ap in res_aprobadores.json():
            if ap["area_id"] == area_id and ap["email_aprobador"] == "juan.gerente@refridcol.com":
                aprobador_exists = True
                break
        if not aprobador_exists:
            aprobador_payload = {
                "area_id": area_id,
                "nombre_aprobador": "Juan Gerente",
                "email_aprobador": "juan.gerente@refridcol.com",
                "activo": True
            }
            res_aprobador = await client.post("/rrhh/catalogos/aprobadores", json=aprobador_payload)
            assert res_aprobador.status_code == 201
    
        # 2. Crear una Requisición en estado BORRADOR
        fecha_ingreso = (date.today() + timedelta(days=10)).isoformat()
        req_payload = {
            "ciudad_id": ciudad_id,
            "ot": "OT-12345",
            "nombre_obra_proyecto": "Proyecto Alpha",
            "direccion_obra_proyecto": "Calle 10 # 5-6",
            "encargado_sitio": "Pedro Encargado",
            "numero_personas_requeridas": 2,
            "tsa": "APLICA",
            "duracion_obra_contrato": "6 meses",
            "fecha_probable_ingreso": fecha_ingreso,
            "centro_costo": "CC-99",
            "perfil_requerido": "Ingeniero de Software",
            "area_id": area_id,
            "cargo_id": cargo_id,
            "causal_requisicion": "Nueva Creación",
            "necesita_equipos_oficina": "SI",
            "equipos_oficina": ["Silla", "Escritorio"],
            "necesita_equipos_tecnologicos": "SI",
            "equipos_tecnologicos": ["Portatil", "Monitor"],
            "requiere_simcard": "NO",
            "salario_asignado": 3500000.0,
            "modalidad_contratacion": "PRESENCIAL",
            "tipo_contratacion": "INDEFINIDO"
        }
    
        res_borrador = await client.post(
            "/rrhh/requisiciones/borrador?correo_solicitante=test.solicitante@refridcol.com&nombre_solicitante=Test Solicitante",
            json=req_payload
        )
        assert res_borrador.status_code == 201
        req_data = res_borrador.json()
        assert req_data["estado"] == EstadoRP.BORRADOR
        requisicion_id = req_data["id"]
    
        # 3. Enviar a aprobación
        res_enviar = await client.post(
            f"/rrhh/requisiciones/{requisicion_id}/enviar?correo_solicitante=test.solicitante@refridcol.com&nombre_solicitante=Test Solicitante"
        )
        assert res_enviar.status_code == 200
        req_enviada = res_enviar.json()
        assert req_enviada["estado"] == EstadoRP.PENDIENTE_APROBACION
        assert req_enviada["rp"] is not None
        assert req_enviada["aprobador_email"] == "juan.gerente@refridcol.com"
    
        # 4. Aprobador: Devolver para ajuste
        res_devolver = await client.post(
            f"/rrhh/requisiciones/{requisicion_id}/devolver",
            json={"observacion": "Falta especificar más detalles"}
        )
        assert res_devolver.status_code == 200
        req_devuelta = res_devolver.json()
        assert req_devuelta["estado"] == EstadoRP.DEVUELTA_AJUSTE
    
        # 5. Solicitante edita la requisición devuelta
        req_payload["numero_personas_requeridas"] = 3
        res_editar = await client.put(
            f"/rrhh/requisiciones/{requisicion_id}?correo_solicitante=test.solicitante@refridcol.com&nombre_solicitante=Test Solicitante",
            json=req_payload
        )
        assert res_editar.status_code == 200
        assert res_editar.json()["numero_personas_requeridas"] == 3
    
        # Re-enviar a aprobación
        res_reenviar = await client.post(
            f"/rrhh/requisiciones/{requisicion_id}/enviar?correo_solicitante=test.solicitante@refridcol.com&nombre_solicitante=Test Solicitante"
        )
        assert res_reenviar.status_code == 200
        assert res_reenviar.json()["estado"] == EstadoRP.PENDIENTE_APROBACION
    
        # 6. Aprobador: Aprobar requisición
        res_aprobar = await client.post(
            f"/rrhh/requisiciones/{requisicion_id}/aprobar",
            json={"observacion": "Aprobado para contratación"}
        )
        assert res_aprobar.status_code == 200
        req_aprobada = res_aprobar.json()
        assert req_aprobada["estado"] == EstadoRP.APROBADA
    
        # 7. Gestión Humana: Mover a EN_PROCESO_SELECCION
        res_gh1 = await client.post(
            f"/rrhh/requisiciones/{requisicion_id}/gestion-humana/actualizar-estado",
            json={"nuevo_estado": EstadoRP.EN_PROCESO_SELECCION, "observacion": "Iniciando publicación de vacante"}
        )
        assert res_gh1.status_code == 200
        assert res_gh1.json()["estado"] == EstadoRP.EN_PROCESO_SELECCION
    
        # 8. Gestión Humana: Mover a CANDIDATO_SELECCIONADO
        res_gh2 = await client.post(
            f"/rrhh/requisiciones/{requisicion_id}/gestion-humana/actualizar-estado",
            json={"nuevo_estado": EstadoRP.CANDIDATO_SELECCIONADO, "observacion": "Candidato elegido"}
        )
        assert res_gh2.status_code == 200
        assert res_gh2.json()["estado"] == EstadoRP.CANDIDATO_SELECCIONADO
    
        # 9. Gestión Humana: Mover a EN_PROCESO_CONTRATACION
        res_gh3 = await client.post(
            f"/rrhh/requisiciones/{requisicion_id}/gestion-humana/actualizar-estado",
            json={"nuevo_estado": EstadoRP.EN_PROCESO_CONTRATACION, "observacion": "Firma de contrato pendiente"}
        )
        assert res_gh3.status_code == 200
        assert res_gh3.json()["estado"] == EstadoRP.EN_PROCESO_CONTRATACION
    
        # 10. Gestión Humana: Mover a CERRADA
        res_gh4 = await client.post(
            f"/rrhh/requisiciones/{requisicion_id}/gestion-humana/actualizar-estado",
            json={"nuevo_estado": EstadoRP.CERRADA, "observacion": "Proceso finalizado con éxito"}
        )
        assert res_gh4.status_code == 200
        assert res_gh4.json()["estado"] == EstadoRP.CERRADA
    
        # 11. Verificar Detalle, Historial y Comentarios
        res_detalle = await client.get(f"/rrhh/requisiciones/{requisicion_id}")
        assert res_detalle.status_code == 200
        detalle_data = res_detalle.json()
        assert len(detalle_data["historial"]) > 0
        assert len(detalle_data["equipos_oficina"]) == 2
        assert len(detalle_data["equipos_tecnologicos"]) == 2
    
        # Agregar comentario
        res_comentario = await client.post(
            f"/rrhh/requisiciones/{requisicion_id}/comentarios?usuario_nombre=Test GH&usuario_email=gh@refridcol.com",
            json={"comentario": "Comentario de prueba adicional"}
        )
        assert res_comentario.status_code == 201
    
        # Verificar comentario agregado
        res_detalle2 = await client.get(f"/rrhh/requisiciones/{requisicion_id}")
        assert len(res_detalle2.json()["comentarios"]) == 1
    finally:
        from sqlalchemy import text
        await db_session.execute(text("""
            DELETE FROM requisicion_equipos_oficina 
            WHERE requisicion_id IN (SELECT id FROM requisiciones_personal WHERE correo_solicitante = 'test.solicitante@refridcol.com')
        """))
        await db_session.execute(text("""
            DELETE FROM requisicion_equipos_tecnologicos 
            WHERE requisicion_id IN (SELECT id FROM requisiciones_personal WHERE correo_solicitante = 'test.solicitante@refridcol.com')
        """))
        await db_session.execute(text("""
            DELETE FROM historial_requisicion 
            WHERE requisicion_id IN (SELECT id FROM requisiciones_personal WHERE correo_solicitante = 'test.solicitante@refridcol.com')
        """))
        await db_session.execute(text("""
            DELETE FROM comentarios_requisicion 
            WHERE requisicion_id IN (SELECT id FROM requisiciones_personal WHERE correo_solicitante = 'test.solicitante@refridcol.com')
        """))
        await db_session.execute(text("DELETE FROM requisiciones_personal WHERE correo_solicitante = 'test.solicitante@refridcol.com'"))
        await db_session.execute(text("DELETE FROM aprobadores_area_rp WHERE email_aprobador = 'juan.gerente@refridcol.com'"))
        await db_session.execute(text("DELETE FROM cargos_rp WHERE nombre = 'DESARROLLADOR'"))
        await db_session.execute(text("DELETE FROM areas_rp WHERE nombre = 'TECNOLOGIA'"))
        await db_session.execute(text("DELETE FROM ciudades_rp WHERE nombre = 'CALI'"))
        await db_session.commit()

@pytest.mark.asyncio
async def test_cancelar_borrador_solicitante(client, db_session):
    try:
        # 1. Crear/Obtener Ciudad BOGOTA
        res_ciudades = await client.get("/rrhh/catalogos/ciudades")
        ciudad_id = None
        for c in res_ciudades.json():
            if c["nombre"] == "BOGOTA":
                ciudad_id = c["id"]
                break
        if not ciudad_id:
            res_ciudad = await client.post("/rrhh/catalogos/ciudades?nombre=BOGOTA")
            assert res_ciudad.status_code == 201
            ciudad_id = res_ciudad.json()["id"]

        # Crear/Obtener Área VENTAS
        res_areas = await client.get("/rrhh/catalogos/areas")
        area_id = None
        for a in res_areas.json():
            if a["nombre"] == "VENTAS":
                area_id = a["id"]
                break
        if not area_id:
            res_area = await client.post("/rrhh/catalogos/areas?nombre=VENTAS")
            assert res_area.status_code == 201
            area_id = res_area.json()["id"]

        # Crear/Obtener Cargo ASESOR
        res_cargos = await client.get(f"/rrhh/catalogos/cargos?area_id={area_id}")
        cargo_id = None
        for cg in res_cargos.json():
            if cg["nombre"] == "ASESOR":
                cargo_id = cg["id"]
                break
        if not cargo_id:
            res_cargo = await client.post(f"/rrhh/catalogos/cargos?area_id={area_id}&nombre=ASESOR")
            assert res_cargo.status_code == 201
            cargo_id = res_cargo.json()["id"]

        # Guardar borrador
        fecha_ingreso = (date.today() + timedelta(days=5)).isoformat()
        req_payload = {
            "ciudad_id": ciudad_id,
            "numero_personas_requeridas": 1,
            "fecha_probable_ingreso": fecha_ingreso,
            "area_id": area_id,
            "cargo_id": cargo_id,
        }
        res_borrador = await client.post(
            "/rrhh/requisiciones/borrador?correo_solicitante=test.solicitante@refridcol.com&nombre_solicitante=Test Solicitante",
            json=req_payload
        )
        assert res_borrador.status_code == 201
        requisicion_id = res_borrador.json()["id"]

        # Cancelar borrador
        res_cancelar = await client.post(
            f"/rrhh/requisiciones/{requisicion_id}/cancelar?correo_solicitante=test.solicitante@refridcol.com&nombre_solicitante=Test Solicitante&observacion=Ya no se requiere"
        )
        assert res_cancelar.status_code == 200
        assert res_cancelar.json()["estado"] == EstadoRP.CANCELADA
    finally:
        from sqlalchemy import text
        await db_session.execute(text("""
            DELETE FROM requisicion_equipos_oficina 
            WHERE requisicion_id IN (SELECT id FROM requisiciones_personal WHERE correo_solicitante = 'test.solicitante@refridcol.com')
        """))
        await db_session.execute(text("""
            DELETE FROM requisicion_equipos_tecnologicos 
            WHERE requisicion_id IN (SELECT id FROM requisiciones_personal WHERE correo_solicitante = 'test.solicitante@refridcol.com')
        """))
        await db_session.execute(text("""
            DELETE FROM historial_requisicion 
            WHERE requisicion_id IN (SELECT id FROM requisiciones_personal WHERE correo_solicitante = 'test.solicitante@refridcol.com')
        """))
        await db_session.execute(text("""
            DELETE FROM comentarios_requisicion 
            WHERE requisicion_id IN (SELECT id FROM requisiciones_personal WHERE correo_solicitante = 'test.solicitante@refridcol.com')
        """))
        await db_session.execute(text("DELETE FROM requisiciones_personal WHERE correo_solicitante = 'test.solicitante@refridcol.com'"))
        await db_session.execute(text("DELETE FROM cargos_rp WHERE nombre = 'ASESOR'"))
        await db_session.execute(text("DELETE FROM areas_rp WHERE nombre = 'VENTAS'"))
        await db_session.execute(text("DELETE FROM ciudades_rp WHERE nombre = 'BOGOTA'"))
        await db_session.commit()


@pytest.mark.asyncio
async def test_sincronizacion_directores_area(client, db_session):
    from app.models.auth.usuario import Usuario
    from sqlalchemy import text
    
    try:
        # 1. Crear un usuario director de prueba con credenciales únicas
        director_test = Usuario(
            id="USR-TEST-DIRECTOR-123",
            cedula="TEST-DIRECTOR-123",
            nombre="OSORIO LENIS HARRY TEST",
            rol="director",
            area="ADMINISTRACION",
            cargo="DIRECTOR DE COSTOS Y CONTROL PRESUPUESTAL",
            esta_activo=True,
            hash_contrasena="dummy"
        )
        db_session.add(director_test)
        await db_session.commit()

        # 2. Ejecutar la sincronización
        res_sync = await client.post("/rrhh/catalogos/sincronizar-jerarquia")
        assert res_sync.status_code == 200

        # 3. Verificar que el área se haya creado
        res_areas = await client.get("/rrhh/catalogos/areas")
        assert res_areas.status_code == 200
        areas = res_areas.json()
        assert any(a["nombre"] == "ADMINISTRACION" for a in areas)
        
        # Obtener el ID del área ADMINISTRACION
        area_id = next(a["id"] for a in areas if a["nombre"] == "ADMINISTRACION")

        # 4. Verificar que el cargo se haya creado
        res_cargos = await client.get(f"/rrhh/catalogos/cargos?area_id={area_id}")
        assert res_cargos.status_code == 200
        cargos = res_cargos.json()
        assert any(c["nombre"] == "DIRECTOR DE COSTOS Y CONTROL PRESUPUESTAL" for c in cargos)

        # 5. Verificar que OSORIO LENIS HARRY TEST se haya creado como aprobador de área
        res_aprobadores = await client.get("/rrhh/catalogos/aprobadores")
        assert res_aprobadores.status_code == 200
        aprobadores = res_aprobadores.json()
        assert any(
            ap["nombre_aprobador"] == "OSORIO LENIS HARRY TEST" and 
            ap["area_id"] == area_id and 
            ap["email_aprobador"] == "test-director-123@refridcol.com" 
            for ap in aprobadores
        )
    finally:
        # Limpieza rigurosa de las tablas afectadas por la prueba
        await db_session.execute(text("DELETE FROM aprobadores_area_rp WHERE email_aprobador = 'test-director-123@refridcol.com'"))
        await db_session.execute(text("DELETE FROM cargos_rp WHERE nombre = 'DIRECTOR DE COSTOS Y CONTROL PRESUPUESTAL'"))
        await db_session.execute(text("DELETE FROM usuarios WHERE id = 'USR-TEST-DIRECTOR-123'"))
        await db_session.commit()

