import pytest
from sqlalchemy import delete, select, text

from app.models.auth.usuario import RelacionUsuario, Usuario
from app.services.jerarquia.service import JerarquiaService


TEST_USER_IDS = [
    "USR-JER-GERENTE",
    "USR-JER-DIRECTOR",
    "USR-JER-JEFE",
    "USR-JER-EJECUTOR",
    "USR-JER-SIN-EQUIPO",
]


async def limpiar_jerarquia_test(db_session):
    await db_session.execute(
        delete(RelacionUsuario).where(
            RelacionUsuario.usuario_id.in_(TEST_USER_IDS)
            | RelacionUsuario.superior_id.in_(TEST_USER_IDS)
        )
    )
    await db_session.execute(delete(Usuario).where(Usuario.id.in_(TEST_USER_IDS)))
    await db_session.commit()


async def asegurar_tabla_jerarquia(db_session):
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
    await db_session.commit()


@pytest.fixture
async def jerarquia_seed(db_session):
    await asegurar_tabla_jerarquia(db_session)
    await limpiar_jerarquia_test(db_session)

    usuarios = [
        Usuario(id="USR-JER-GERENTE", cedula="JER-GERENTE", nombre="Gerente Test", hash_contrasena="N/A", rol="gerente"),
        Usuario(id="USR-JER-DIRECTOR", cedula="JER-DIRECTOR", nombre="Director Test", hash_contrasena="N/A", rol="director"),
        Usuario(id="USR-JER-JEFE", cedula="JER-JEFE", nombre="Jefe Test", hash_contrasena="N/A", rol="jefe"),
        Usuario(id="USR-JER-EJECUTOR", cedula="JER-EJECUTOR", nombre="Ejecutor Test", hash_contrasena="N/A", rol="usuario"),
        Usuario(id="USR-JER-SIN-EQUIPO", cedula="JER-SIN-EQUIPO", nombre="Sin Equipo Test", hash_contrasena="N/A", rol="usuario"),
    ]
    db_session.add_all(usuarios)
    await db_session.flush()

    db_session.add_all([
        RelacionUsuario(usuario_id="USR-JER-DIRECTOR", superior_id="USR-JER-GERENTE", tipo_relacion="lineal"),
        RelacionUsuario(usuario_id="USR-JER-JEFE", superior_id="USR-JER-DIRECTOR", tipo_relacion="lineal"),
        RelacionUsuario(usuario_id="USR-JER-EJECUTOR", superior_id="USR-JER-JEFE", tipo_relacion="lineal"),
    ])
    await db_session.commit()

    yield

    await limpiar_jerarquia_test(db_session)


@pytest.mark.asyncio
async def test_obtener_equipo_retorna_subordinados_directos_e_indirectos(db_session, jerarquia_seed):
    equipo = await JerarquiaService.obtener_equipo(db_session, "USR-JER-GERENTE")

    assert [nodo.usuario_id for nodo in equipo] == ["USR-JER-DIRECTOR"]
    assert [nodo.usuario_id for nodo in equipo[0].subordinados] == ["USR-JER-JEFE"]
    assert [nodo.usuario_id for nodo in equipo[0].subordinados[0].subordinados] == ["USR-JER-EJECUTOR"]


@pytest.mark.asyncio
async def test_obtener_equipo_sin_subordinados_retorna_lista_vacia(db_session, jerarquia_seed):
    equipo = await JerarquiaService.obtener_equipo(db_session, "USR-JER-SIN-EQUIPO")

    assert equipo == []


@pytest.mark.asyncio
async def test_usuario_no_puede_tener_dos_superiores_activos(db_session, jerarquia_seed):
    relacion_existente = await db_session.scalar(
        select(RelacionUsuario).where(RelacionUsuario.usuario_id == "USR-JER-JEFE")
    )

    assert relacion_existente is not None

    with pytest.raises(ValueError, match="ya tiene un superior activo"):
        await JerarquiaService.crear_relacion(
            db_session,
            usuario_id="USR-JER-JEFE",
            superior_id="USR-JER-GERENTE",
            tipo_relacion="lineal",
        )


@pytest.mark.asyncio
async def test_obtener_ids_subordinados_incluye_todo_el_arbol(db_session, jerarquia_seed):
    subordinados = await JerarquiaService.obtener_ids_subordinados(db_session, "USR-JER-GERENTE")

    assert subordinados == ["USR-JER-DIRECTOR", "USR-JER-JEFE", "USR-JER-EJECUTOR"]
