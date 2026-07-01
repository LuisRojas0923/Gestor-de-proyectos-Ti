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
    from app.models.auth.usuario import Usuario
    from app.api.auth.router import obtener_usuario_actual_db

    mock_usuario = Usuario(
        id="USR-TEST-ADMIN",
        cedula="66903320",
        nombre="Torres Agudelo Maribell",
        rol="admin",
        correo="maribell.torres@refridcol.com",
        esta_activo=True,
        hash_contrasena="dummy"
    )
    app.dependency_overrides[obtener_usuario_actual_db] = lambda: mock_usuario

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test/api/v2") as ac:
        yield ac
    app.dependency_overrides.clear()
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
        req_aprobada_director = res_aprobar.json()
        assert req_aprobada_director["estado"] == EstadoRP.PENDIENTE_APROBACION_GERENCIA

        # 6b. Verificar Bandeja Gerente
        res_bandeja = await client.get("/rrhh/requisiciones/bandeja-gerente")
        assert res_bandeja.status_code == 200
        bandeja_ids = [r["id"] for r in res_bandeja.json()]
        assert requisicion_id in bandeja_ids

        # 6c. Gerencia: Aprobar requisición (Firma definitiva)
        res_aprobar_gerente = await client.post(
            f"/rrhh/requisiciones/{requisicion_id}/aprobar-gerente",
            json={"observacion": "Firma gerencial autorizada"}
        )
        assert res_aprobar_gerente.status_code == 200
        req_aprobada = res_aprobar_gerente.json()
        assert req_aprobada["estado"] == EstadoRP.APROBADA
    
        # 7. Asignar la requisición a las temporales (mueve a EN_PROCESO_SELECCION)
        from app.models.rrhh.seguimiento import EmpresaTemporal
        from sqlmodel import select
        res_temps = await db_session.execute(select(EmpresaTemporal))
        temporales = res_temps.scalars().all()
        summar = [t for t in temporales if t.nombre == "SUMMAR TEMPORALES"][0]

        res_assign = await client.post(
            f"/rrhh/requisiciones/{requisicion_id}/temporales",
            json={"temporal_ids": [summar.id]}
        )
        assert res_assign.status_code == 200

        # Verificar estado
        res_detalle_gh = await client.get(f"/rrhh/requisiciones/{requisicion_id}")
        assert res_detalle_gh.status_code == 200
        assert res_detalle_gh.json()["estado"] == EstadoRP.EN_PROCESO_SELECCION

        # 8. Agregar 3 candidatos (se requieren 3 personas)
        candidatos_ids = []
        for i in range(3):
            res_cand = await client.post(
                f"/rrhh/requisiciones/{requisicion_id}/candidatos",
                json={"temporal_id": summar.id, "nombre_candidato": f"Candidato {i}"}
            )
            assert res_cand.status_code == 201
            candidatos_ids.append(res_cand.json()["id"])

        # 9. Contratar candidatos para cerrar automáticamente la RP
        for cand_id in candidatos_ids:
            res_contratar = await client.put(
                f"/rrhh/requisiciones/candidatos/{cand_id}",
                json={"estado": "CONTRATADO", "observaciones": f"Contratando candidato {cand_id}"}
            )
            assert res_contratar.status_code == 200

        # 10. Verificar que la requisición se cerró automáticamente
        res_detalle_cerrada = await client.get(f"/rrhh/requisiciones/{requisicion_id}")
        assert res_detalle_cerrada.json()["estado"] == EstadoRP.CERRADA
    
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
            DELETE FROM candidatos_requisicion 
            WHERE requisicion_id IN (SELECT id FROM requisiciones_personal WHERE correo_solicitante = 'test.solicitante@refridcol.com')
        """))
        await db_session.execute(text("""
            DELETE FROM requisiciones_temporales 
            WHERE requisicion_id IN (SELECT id FROM requisiciones_personal WHERE correo_solicitante = 'test.solicitante@refridcol.com')
        """))
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

        # 3. Verificar que el área se haya creado o ya exista
        res_areas = await client.get("/rrhh/catalogos/areas")
        assert res_areas.status_code == 200
        areas = res_areas.json()
        assert any(a["nombre"] in ("ADMINISTRACION", "ADMINISTRACIÓN") for a in areas)
        
        # Obtener el ID del área ADMINISTRACION
        area_id = next(a["id"] for a in areas if a["nombre"] in ("ADMINISTRACION", "ADMINISTRACIÓN"))

        # 4. Verificar que el cargo se haya creado
        res_cargos = await client.get(f"/rrhh/catalogos/cargos?area_id={area_id}")
        assert res_cargos.status_code == 200
        cargos = res_cargos.json()
        assert any(c["nombre"].upper() == "DIRECTOR DE COSTOS Y CONTROL PRESUPUESTAL" for c in cargos)

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


@pytest.mark.asyncio
async def test_cancelar_requisicion_gh(client, db_session):
    from app.models.rrhh.solicitud_personal import RequisicionPersonal, EstadoRP
    from sqlalchemy import text
    try:
        # 1. Crear una requisición de personal directamente en la BD en estado APROBADA
        req = RequisicionPersonal(
            correo_solicitante="solicitante@test.com",
            nombre_solicitante="Solicitante Test",
            rp="RP-CANCEL-GH-TEST",
            consecutivo=98765,
            numero_personas_requeridas=1,
            estado=EstadoRP.APROBADA
        )
        db_session.add(req)
        await db_session.commit()
        await db_session.refresh(req)

        # 2. Intentar cancelar sin observación (debería dar 400)
        res_fail1 = await client.post(
            f"/rrhh/requisiciones/{req.id}/cancelar-gh",
            json={"observacion": ""}
        )
        assert res_fail1.status_code == 400

        # 3. Cancelar con observación
        res_cancel = await client.post(
            f"/rrhh/requisiciones/{req.id}/cancelar-gh",
            json={"observacion": "Cancelación por reestructuración del área"}
        )
        assert res_cancel.status_code == 200
        data = res_cancel.json()
        assert data["estado"] == EstadoRP.CANCELADA
        assert data["observacion_cierre"] == "Cancelación por reestructuración del área"

        # 4. Intentar cancelar una requisición ya cancelada (debería dar 403)
        res_fail2 = await client.post(
            f"/rrhh/requisiciones/{req.id}/cancelar-gh",
            json={"observacion": "Intento duplicado"}
        )
        assert res_fail2.status_code == 403
        
    finally:
        await db_session.execute(text("""
            DELETE FROM historial_requisicion 
            WHERE requisicion_id IN (SELECT id FROM requisiciones_personal WHERE rp = 'RP-CANCEL-GH-TEST')
        """))
        await db_session.execute(text("DELETE FROM requisiciones_personal WHERE rp = 'RP-CANCEL-GH-TEST'"))
        await db_session.commit()


@pytest.mark.asyncio
async def test_requisicion_validation_personas_requeridas(client, db_session):
    try:
        # Crear/Obtener Ciudad BOGOTA
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

        # 1. Probar crear borrador sin perfil_requerido (es opcional)
        # y sin numero_personas_requeridas (debe tomar default=1)
        req_payload_base = {
            "ciudad_id": ciudad_id,
            "area_id": area_id,
            "cargo_id": cargo_id,
        }
        res_borrador = await client.post(
            "/rrhh/requisiciones/borrador?correo_solicitante=test.solicitante@refridcol.com&nombre_solicitante=Test Solicitante",
            json=req_payload_base
        )
        assert res_borrador.status_code == 201
        data = res_borrador.json()
        assert data["perfil_requerido"] is None or data["perfil_requerido"] == ""
        assert data["numero_personas_requeridas"] == 1
        
        # 2. Probar que numero_personas_requeridas = 0 falla
        payload_0 = req_payload_base.copy()
        payload_0["numero_personas_requeridas"] = 0
        res_0 = await client.post(
            "/rrhh/requisiciones/borrador?correo_solicitante=test.solicitante@refridcol.com&nombre_solicitante=Test Solicitante",
            json=payload_0
        )
        assert res_0.status_code == 422

        # 3. Probar que numero_personas_requeridas = -5 falla
        payload_neg = req_payload_base.copy()
        payload_neg["numero_personas_requeridas"] = -5
        res_neg = await client.post(
            "/rrhh/requisiciones/borrador?correo_solicitante=test.solicitante@refridcol.com&nombre_solicitante=Test Solicitante",
            json=payload_neg
        )
        assert res_neg.status_code == 422

        # 4. Probar que numero_personas_requeridas = 1.5 (float) falla
        payload_float = req_payload_base.copy()
        payload_float["numero_personas_requeridas"] = 1.5
        res_float = await client.post(
            "/rrhh/requisiciones/borrador?correo_solicitante=test.solicitante@refridcol.com&nombre_solicitante=Test Solicitante",
            json=payload_float
        )
        assert res_float.status_code == 422

        # 5. Probar que numero_personas_requeridas = True (bool) falla
        payload_bool = req_payload_base.copy()
        payload_bool["numero_personas_requeridas"] = True
        res_bool = await client.post(
            "/rrhh/requisiciones/borrador?correo_solicitante=test.solicitante@refridcol.com&nombre_solicitante=Test Solicitante",
            json=payload_bool
        )
        assert res_bool.status_code == 422

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
