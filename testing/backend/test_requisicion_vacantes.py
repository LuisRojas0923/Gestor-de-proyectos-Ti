import pytest
import pytest_asyncio
import httpx
from httpx import ASGITransport
from datetime import date, timedelta
from sqlalchemy import text, select
from sqlmodel import select as sqlmodel_select

from app.main import app
from app.models.rrhh.solicitud_personal import RequisicionPersonal, EstadoRP
from app.models.auth.usuario import Usuario, RelacionUsuario
from app.database import async_engine

@pytest_asyncio.fixture(scope="function")
async def client():
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
async def test_ciclo_vida_vacantes_rp(client, db_session):
    solicitante_email = "test.solicitante.vacantes@refridcol.com"
    rp_code = "RP-VAC-TEST"
    
    try:
        # 1. Crear el usuario solicitante en la base de datos
        solicitante = Usuario(
            id="USR-SOLICITANTE-VAC",
            cedula="9988776655",
            correo=solicitante_email,
            nombre="Solicitante Vacantes Test",
            rol="usuario",
            esta_activo=True,
            hash_contrasena="dummy"
        )
        db_session.add(solicitante)
        await db_session.commit()

        # 2. Crear una requisición de personal directamente en estado PENDIENTE_APROBACION_GERENCIA
        req = RequisicionPersonal(
            correo_solicitante=solicitante_email,
            nombre_solicitante="Solicitante Vacantes Test",
            rp=rp_code,
            consecutivo=778899,
            numero_personas_requeridas=2,
            cargo_nombre="Desarrollador Backend Test",
            area_nombre="Tecnologia",
            estado=EstadoRP.PENDIENTE_APROBACION_GERENCIA
        )
        db_session.add(req)
        await db_session.commit()
        await db_session.refresh(req)

        # 3. Aprobar por Gerente (Firma definitiva)
        # Esto debería gatillar _crear_vacantes_en_jerarquia
        res_aprobar = await client.post(
            f"/rrhh/requisiciones/{req.id}/aprobar-gerente",
            json={"observacion": "Aprobando plazas de vacante de prueba"}
        )
        assert res_aprobar.status_code == 200
        assert res_aprobar.json()["estado"] == EstadoRP.APROBADA

        # 4. Verificar que se crearon los dos usuarios virtuales vacantes
        res_users = await db_session.execute(
            sqlmodel_select(Usuario).where(Usuario.id.like(f"VAC-{rp_code}-%"))
        )
        vacantes = res_users.scalars().all()
        assert len(vacantes) == 2
        for v in vacantes:
            assert v.esta_activo is True
            assert v.cargo == "Desarrollador Backend Test"
            assert v.nombre == "[VACANTE] Desarrollador Backend Test"

        # 5. Verificar que se crearon las dos relaciones jerárquicas
        res_rels = await db_session.execute(
            sqlmodel_select(RelacionUsuario).where(RelacionUsuario.usuario_id.like(f"VAC-{rp_code}-%"))
        )
        relaciones = res_rels.scalars().all()
        assert len(relaciones) == 2
        for r in relaciones:
            assert r.esta_activa is True
            assert r.superior_id == "USR-SOLICITANTE-VAC"

        # 6. Cancelar la requisición desde GH
        res_cancel = await client.post(
            f"/rrhh/requisiciones/{req.id}/cancelar-gh",
            json={"observacion": "Cancelación por pruebas"}
        )
        assert res_cancel.status_code == 200
        assert res_cancel.json()["estado"] == EstadoRP.CANCELADA

        # 7. Verificar que las vacantes y relaciones se marcaron como inactivas
        db_session.expire_all()
        res_users_after = await db_session.execute(
            sqlmodel_select(Usuario).where(Usuario.id.like(f"VAC-{rp_code}-%"))
        )
        vacantes_after = res_users_after.scalars().all()
        for v in vacantes_after:
            assert v.esta_activo is False

        res_rels_after = await db_session.execute(
            sqlmodel_select(RelacionUsuario).where(RelacionUsuario.usuario_id.like(f"VAC-{rp_code}-%"))
        )
        relaciones_after = res_rels_after.scalars().all()
        for r in relaciones_after:
            assert r.esta_activa is False

    finally:
        # Limpieza de base de datos
        await db_session.execute(text("DELETE FROM relaciones_usuarios WHERE usuario_id LIKE 'VAC-RP-VAC-TEST-%'"))
        await db_session.execute(text("DELETE FROM usuarios WHERE id LIKE 'VAC-RP-VAC-TEST-%'"))
        await db_session.execute(text("DELETE FROM usuarios WHERE id = 'USR-SOLICITANTE-VAC'"))
        await db_session.execute(text("""
            DELETE FROM historial_requisicion 
            WHERE requisicion_id IN (SELECT id FROM requisiciones_personal WHERE rp = 'RP-VAC-TEST')
        """))
        await db_session.execute(text("DELETE FROM requisiciones_personal WHERE rp = 'RP-VAC-TEST'"))
        await db_session.commit()
