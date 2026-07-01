import pytest
import pytest_asyncio
import httpx
import random
from httpx import ASGITransport
from datetime import date, datetime, timedelta

from app.main import app
from app.models.rrhh.solicitud_personal import RequisicionPersonal, EstadoRP
from app.models.rrhh.seguimiento import EmpresaTemporal
from app.database import async_engine, init_db
from sqlmodel import select

@pytest_asyncio.fixture(scope="function")
async def client():
    # Garantizar que las tablas existan y el semillado se ejecute
    await init_db()
    
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
async def test_catalogo_temporales(client, db_session):
    # 1. Listar temporales iniciales (sembradas)
    res = await client.get("/rrhh/requisiciones/temporales")
    assert res.status_code == 200
    temps = res.json()
    nombres = [t["nombre"] for t in temps]
    assert "SUMMAR TEMPORALES" in nombres
    assert "MULTIEMPLEOS" in nombres
    assert "DIRECTO" in nombres

    # 2. Crear una nueva temporal con nombre aleatorio para evitar colisión de índice único
    nombre_test = f"TEMPORAL TEST {random.randint(1000, 9999)}"
    res_crear = await client.post("/rrhh/requisiciones/temporales", json={"nombre": nombre_test})
    assert res_crear.status_code == 201
    nueva = res_crear.json()
    assert nueva["nombre"] == nombre_test
    assert nueva["activo"] is True

    # 3. Intentar crear una duplicada (debe retornar 400)
    res_dup = await client.post("/rrhh/requisiciones/temporales", json={"nombre": nombre_test})
    assert res_dup.status_code == 400


@pytest.mark.asyncio
async def test_seguimiento_y_auto_cierre(client, db_session):
    # Usar valores aleatorios para evitar colisión de claves únicas
    suffix = random.randint(10000, 99999)
    rp_nombre = f"RP-T-{suffix}"
    
    # 1. Crear una requisición de personal directamente en la BD en estado APROBADA
    req = RequisicionPersonal(
        correo_solicitante="solicitante@test.com",
        nombre_solicitante="Solicitante Test",
        rp=rp_nombre,
        consecutivo=suffix,
        numero_personas_requeridas=1, # 1 vacante
        estado=EstadoRP.APROBADA
    )
    db_session.add(req)
    await db_session.commit()
    await db_session.refresh(req)

    # Obtener las temporales de la base de datos
    res_temps = await db_session.execute(select(EmpresaTemporal))
    temporales = res_temps.scalars().all()
    summar = [t for t in temporales if t.nombre == "SUMMAR TEMPORALES"][0]
    multi = [t for t in temporales if t.nombre == "MULTIEMPLEOS"][0]

    # 2. Asignar la requisición a las temporales
    res_assign = await client.post(
        f"/rrhh/requisiciones/{req.id}/temporales",
        json={"temporal_ids": [summar.id, multi.id]}
    )
    assert res_assign.status_code == 200
    asignaciones = res_assign.json()
    assert len(asignaciones) == 2
    
    # Verificar que el estado cambió automáticamente a EN_PROCESO_SELECCION
    await db_session.refresh(req)
    assert req.estado == EstadoRP.EN_PROCESO_SELECCION

    # 3. Actualizar la fecha de envío de HV para Summar
    fecha_envio_str = datetime.utcnow().isoformat()
    res_date = await client.put(
        f"/rrhh/requisiciones/{req.id}/temporales/{summar.id}/envio-hv",
        json={"fecha_envio_hv": fecha_envio_str}
    )
    assert res_date.status_code == 200
    assert res_date.json()["fecha_envio_hv"] is not None

    # 4. Agregar candidatos al pipeline
    res_cand1 = await client.post(
        f"/rrhh/requisiciones/{req.id}/candidatos",
        json={"temporal_id": summar.id, "nombre_candidato": "Candidato Uno", "observaciones": "Primer perfil"}
    )
    assert res_cand1.status_code == 201
    c1 = res_cand1.json()
    assert c1["nombre_candidato"] == "Candidato Uno"
    assert c1["estado"] == "POR_EVALUAR"

    res_cand2 = await client.post(
        f"/rrhh/requisiciones/{req.id}/candidatos",
        json={"temporal_id": multi.id, "nombre_candidato": "Candidato Dos"}
    )
    assert res_cand2.status_code == 201
    c2 = res_cand2.json()

    # 5. Obtener estadísticas del seguimiento
    res_stats = await client.get(f"/rrhh/requisiciones/{req.id}/seguimiento-stats")
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert stats["total_hv"] == 2
    assert stats["por_evaluar"] == 2
    assert stats["aplica"] == 0

    # 6. Descartar Candidato Uno (NO_APLICA) con causal
    res_update1 = await client.put(
        f"/rrhh/requisiciones/candidatos/{c1['id']}",
        json={"estado": "NO_APLICA", "causal_descarte": "N.C.EXP", "observaciones": "Falta experiencia"}
    )
    assert res_update1.status_code == 200
    c1_updated = res_update1.json()
    assert c1_updated["estado"] == "NO_APLICA"
    assert c1_updated["causal_descarte"] == "N.C.EXP"

    # 7. Contratar Candidato Dos
    res_update2 = await client.put(
        f"/rrhh/requisiciones/candidatos/{c2['id']}",
        json={"estado": "CONTRATADO", "observaciones": "Seleccionado definitivo"}
    )
    assert res_update2.status_code == 200
    c2_updated = res_update2.json()
    assert c2_updated["estado"] == "CONTRATADO"

    # 8. Verificar que la requisición se cerró automáticamente al completarse la vacante
    await db_session.refresh(req)
    assert req.estado == EstadoRP.CERRADA
    assert req.fecha_cierre is not None
    assert "Cierre automático" in req.observacion_cierre

    # Verificar estadísticas finales
    res_stats_final = await client.get(f"/rrhh/requisiciones/{req.id}/seguimiento-stats")
    assert res_stats_final.status_code == 200
    stats_final = res_stats_final.json()
    assert stats_final["total_hv"] == 2
    assert stats_final["no_aplica"] == 1
    assert stats_final["contratados"] == 1
    assert stats_final["causales_descarte"]["N.C.EXP"] == 1


@pytest.mark.asyncio
async def test_capacidad_contrataciones_excedida(client, db_session):
    suffix = random.randint(10000, 99999)
    rp_nombre = f"RP-T-{suffix}"
    
    # 1. Crear una requisición de personal con 1 vacante
    req = RequisicionPersonal(
        correo_solicitante="solicitante@test.com",
        nombre_solicitante="Solicitante Test",
        rp=rp_nombre,
        consecutivo=suffix,
        numero_personas_requeridas=1,
        estado=EstadoRP.APROBADA
    )
    db_session.add(req)
    await db_session.commit()
    await db_session.refresh(req)

    res_temps = await db_session.execute(select(EmpresaTemporal))
    temporales = res_temps.scalars().all()
    summar = [t for t in temporales if t.nombre == "SUMMAR TEMPORALES"][0]

    await client.post(
        f"/rrhh/requisiciones/{req.id}/temporales",
        json={"temporal_ids": [summar.id]}
    )

    res_cand1 = await client.post(
        f"/rrhh/requisiciones/{req.id}/candidatos",
        json={"temporal_id": summar.id, "nombre_candidato": "Candidato A"}
    )
    c1 = res_cand1.json()

    res_cand2 = await client.post(
        f"/rrhh/requisiciones/{req.id}/candidatos",
        json={"temporal_id": summar.id, "nombre_candidato": "Candidato B"}
    )
    c2 = res_cand2.json()

    res_contratar1 = await client.put(
        f"/rrhh/requisiciones/candidatos/{c1['id']}",
        json={"estado": "CONTRATADO"}
    )
    assert res_contratar1.status_code == 200

    res_contratar2 = await client.put(
        f"/rrhh/requisiciones/candidatos/{c2['id']}",
        json={"estado": "CONTRATADO"}
    )
    assert res_contratar2.status_code == 404
    assert "ya se han completado" in res_contratar2.json()["detail"]
