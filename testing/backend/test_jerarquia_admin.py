import pytest
from sqlalchemy import delete, select, text

from app.models.auth.usuario import HistorialRelacionUsuario, RelacionUsuario, Usuario
from app.services.jerarquia.service import JerarquiaService


TEST_USER_IDS = ["USR-ORG-GER", "USR-ORG-DIR-A", "USR-ORG-DIR-B", "USR-ORG-EMP"]


async def asegurar_tablas_jerarquia_admin(db_session):
    await db_session.execute(text("""
        CREATE TABLE IF NOT EXISTS relaciones_usuarios (
            id SERIAL PRIMARY KEY,
            usuario_id VARCHAR(50) NOT NULL REFERENCES usuarios(id),
            superior_id VARCHAR(50) NOT NULL REFERENCES usuarios(id),
            tipo_relacion VARCHAR(50) NOT NULL DEFAULT 'lineal',
            esta_activa BOOLEAN NOT NULL DEFAULT TRUE,
            creado_en TIMESTAMPTZ DEFAULT NOW(),
            actualizado_en TIMESTAMPTZ
        )
    """))
    await db_session.execute(text("""
        CREATE UNIQUE INDEX IF NOT EXISTS ux_relaciones_usuarios_usuario_activo
        ON relaciones_usuarios(usuario_id) WHERE esta_activa
    """))
    await db_session.execute(text("""
        CREATE TABLE IF NOT EXISTS historial_relaciones_usuarios (
            id SERIAL PRIMARY KEY,
            usuario_id VARCHAR(50) NOT NULL,
            superior_anterior_id VARCHAR(50),
            superior_nuevo_id VARCHAR(50),
            accion VARCHAR(50) NOT NULL,
            realizado_por_id VARCHAR(50),
            observacion TEXT,
            creado_en TIMESTAMPTZ DEFAULT NOW()
        )
    """))
    await db_session.commit()


async def limpiar_admin_test(db_session):
    await db_session.execute(delete(HistorialRelacionUsuario).where(HistorialRelacionUsuario.usuario_id.in_(TEST_USER_IDS)))
    await db_session.execute(
        delete(RelacionUsuario).where(
            RelacionUsuario.usuario_id.in_(TEST_USER_IDS)
            | RelacionUsuario.superior_id.in_(TEST_USER_IDS)
        )
    )
    await db_session.execute(delete(Usuario).where(Usuario.id.in_(TEST_USER_IDS)))
    await db_session.commit()


@pytest.fixture
async def jerarquia_admin_seed(db_session):
    await asegurar_tablas_jerarquia_admin(db_session)
    await limpiar_admin_test(db_session)
    db_session.add_all([
        Usuario(id="USR-ORG-GER", cedula="ORG-GER", nombre="Gerente Org", hash_contrasena="N/A", rol="gerente"),
        Usuario(id="USR-ORG-DIR-A", cedula="ORG-DIR-A", nombre="Director A", hash_contrasena="N/A", rol="director"),
        Usuario(id="USR-ORG-DIR-B", cedula="ORG-DIR-B", nombre="Director B", hash_contrasena="N/A", rol="director"),
        Usuario(id="USR-ORG-EMP", cedula="ORG-EMP", nombre="Empleado Org", hash_contrasena="N/A", rol="usuario"),
    ])
    await db_session.commit()
    yield
    await limpiar_admin_test(db_session)


@pytest.mark.asyncio
async def test_asignar_superior_reemplaza_relacion_activa_y_deja_historial(db_session, jerarquia_admin_seed):
    primera = await JerarquiaService.asignar_superior(db_session, "USR-ORG-EMP", "USR-ORG-DIR-A", realizado_por_id="USR-ORG-GER")
    segunda = await JerarquiaService.asignar_superior(db_session, "USR-ORG-EMP", "USR-ORG-DIR-B", realizado_por_id="USR-ORG-GER")

    assert primera.id != segunda.id
    relaciones = await JerarquiaService.listar_relaciones(db_session)
    activas = [rel for rel in relaciones if rel.usuario_id == "USR-ORG-EMP"]
    assert len(activas) == 1
    assert activas[0].superior_id == "USR-ORG-DIR-B"

    historial = (await db_session.execute(
        select(HistorialRelacionUsuario).where(HistorialRelacionUsuario.usuario_id == "USR-ORG-EMP")
    )).scalars().all()
    assert len(historial) == 2


@pytest.mark.asyncio
async def test_desactivar_relacion_elimina_relacion_activa(db_session, jerarquia_admin_seed):
    relacion = await JerarquiaService.asignar_superior(db_session, "USR-ORG-EMP", "USR-ORG-DIR-A")
    await JerarquiaService.desactivar_relacion(db_session, relacion.id)

    relaciones = await JerarquiaService.listar_relaciones(db_session)
    assert all(rel.usuario_id != "USR-ORG-EMP" for rel in relaciones)


@pytest.mark.asyncio
async def test_asignar_superior_previene_ciclos(db_session, jerarquia_admin_seed):
    await JerarquiaService.asignar_superior(db_session, "USR-ORG-DIR-A", "USR-ORG-GER")
    await JerarquiaService.asignar_superior(db_session, "USR-ORG-EMP", "USR-ORG-DIR-A")

    with pytest.raises(ValueError, match="ciclo"):
        await JerarquiaService.asignar_superior(db_session, "USR-ORG-GER", "USR-ORG-EMP")
