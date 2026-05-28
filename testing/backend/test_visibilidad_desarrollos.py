import pytest
import pytest_asyncio
from sqlalchemy import delete, text
from app.models.auth.usuario import RelacionUsuario, Usuario
from app.models.desarrollo.desarrollo import Desarrollo
from app.models.desarrollo.actividad import Actividad
from app.services.auth.servicio import ServicioAuth

TEST_USER_IDS = [
    "USR-VIS-GERENTE",
    "USR-VIS-DIRECTOR",
    "USR-VIS-JEFE",
    "USR-VIS-AJENO",
]

TEST_DEV_IDS = [
    "DEV-VIS-1",
    "DEV-VIS-2",
    "DEV-VIS-3",
    "DEV-VIS-4",
]


async def limpiar_visibilidad_test(db_session):
    await db_session.execute(delete(Actividad).where(Actividad.desarrollo_id.in_(TEST_DEV_IDS)))
    await db_session.execute(delete(Desarrollo).where(Desarrollo.id.in_(TEST_DEV_IDS)))
    await db_session.execute(
        delete(RelacionUsuario).where(
            RelacionUsuario.usuario_id.in_(TEST_USER_IDS)
            | RelacionUsuario.superior_id.in_(TEST_USER_IDS)
        )
    )
    await db_session.execute(delete(Usuario).where(Usuario.id.in_(TEST_USER_IDS)))
    await db_session.commit()


@pytest_asyncio.fixture
async def visibilidad_seed(db_session):
    await limpiar_visibilidad_test(db_session)

    hash_pwd = ServicioAuth.obtener_hash_contrasena("pass123")
    
    # Crear usuarios
    usuarios = [
        Usuario(id="USR-VIS-GERENTE", cedula="VIS-GERENTE", nombre="Gerente Vis", hash_contrasena=hash_pwd, rol="gerente", esta_activo=True),
        Usuario(id="USR-VIS-DIRECTOR", cedula="VIS-DIRECTOR", nombre="Director Vis", hash_contrasena=hash_pwd, rol="director", esta_activo=True),
        Usuario(id="USR-VIS-JEFE", cedula="VIS-JEFE", nombre="Jefe Vis", hash_contrasena=hash_pwd, rol="jefe", esta_activo=True),
        Usuario(id="USR-VIS-AJENO", cedula="VIS-AJENO", nombre="Ajeno Vis", hash_contrasena=hash_pwd, rol="usuario", esta_activo=True),
    ]
    db_session.add_all(usuarios)
    await db_session.flush()

    # Crear relaciones jerárquicas
    db_session.add_all([
        RelacionUsuario(usuario_id="USR-VIS-DIRECTOR", superior_id="USR-VIS-GERENTE", tipo_relacion="lineal"),
        RelacionUsuario(usuario_id="USR-VIS-JEFE", superior_id="USR-VIS-DIRECTOR", tipo_relacion="lineal"),
    ])
    
    # Crear desarrollos
    desarrollos = [
        Desarrollo(id="DEV-VIS-1", nombre="Proyecto Jefe", creado_por_id="USR-VIS-JEFE", responsable_id="USR-VIS-JEFE", estado_general="Pendiente"),
        Desarrollo(id="DEV-VIS-2", nombre="Proyecto Director", creado_por_id="USR-VIS-DIRECTOR", responsable_id="USR-VIS-DIRECTOR", estado_general="Pendiente"),
        Desarrollo(id="DEV-VIS-3", nombre="Proyecto Gerente", creado_por_id="USR-VIS-GERENTE", responsable_id="USR-VIS-GERENTE", estado_general="Pendiente"),
        Desarrollo(id="DEV-VIS-4", nombre="Proyecto Ajeno", creado_por_id="USR-VIS-AJENO", responsable_id="USR-VIS-AJENO", estado_general="Pendiente"),
    ]
    db_session.add_all(desarrollos)
    await db_session.flush()

    # Crear actividades para probar Regla 2 de WBS
    # Estructura:
    # 1000 (Raiz)
    #   ├── 1001 (Hijo A) -> Asignado a Jefe
    #   └── 1002 (Hijo B) -> Asignado a Ajeno (externo)
    #         └── 1003 (Nieto B) -> Asignado a Ajeno (externo)
    actividades = [
        Actividad(id=1000, desarrollo_id="DEV-VIS-1", titulo="Raiz Proyecto", parent_id=None, responsable_id="USR-VIS-JEFE", horas_estimadas=0, porcentaje_avance=0),
        Actividad(id=1001, desarrollo_id="DEV-VIS-1", titulo="Hijo A", parent_id=1000, responsable_id="USR-VIS-JEFE", horas_estimadas=0, porcentaje_avance=0),
        Actividad(id=1002, desarrollo_id="DEV-VIS-1", titulo="Hijo B", parent_id=1000, responsable_id="USR-VIS-AJENO", horas_estimadas=0, porcentaje_avance=0),
        Actividad(id=1003, desarrollo_id="DEV-VIS-1", titulo="Nieto B", parent_id=1002, responsable_id="USR-VIS-AJENO", horas_estimadas=0, porcentaje_avance=0),
    ]
    db_session.add_all(actividades)
    await db_session.commit()

    yield

    await limpiar_visibilidad_test(db_session)


async def obtener_token_usuario(client, cedula):
    response = await client.post("/auth/login", data={
        "username": cedula,
        "password": "pass123"
    })
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_solo_mios_jefe(client, visibilidad_seed):
    token = await obtener_token_usuario(client, "VIS-JEFE")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = await client.get("/desarrollos/?solo_mios=true", headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    ids = [d["id"] for d in data]
    # El jefe solo debe ver su propio proyecto
    assert "DEV-VIS-1" in ids
    assert "DEV-VIS-2" not in ids
    assert "DEV-VIS-3" not in ids
    assert "DEV-VIS-4" not in ids


@pytest.mark.asyncio
async def test_solo_mios_director(client, visibilidad_seed):
    token = await obtener_token_usuario(client, "VIS-DIRECTOR")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = await client.get("/desarrollos/?solo_mios=true", headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    ids = [d["id"] for d in data]
    # El director debe ver su propio proyecto y el de su subordinado (jefe)
    assert "DEV-VIS-2" in ids
    assert "DEV-VIS-1" in ids
    assert "DEV-VIS-3" not in ids
    assert "DEV-VIS-4" not in ids


@pytest.mark.asyncio
async def test_solo_mios_gerente(client, visibilidad_seed):
    token = await obtener_token_usuario(client, "VIS-GERENTE")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = await client.get("/desarrollos/?solo_mios=true", headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    ids = [d["id"] for d in data]
    # El gerente debe ver su propio proyecto y los de sus subordinados (director y jefe)
    assert "DEV-VIS-3" in ids
    assert "DEV-VIS-2" in ids
    assert "DEV-VIS-1" in ids
    assert "DEV-VIS-4" not in ids


@pytest.mark.asyncio
async def test_solo_mios_ajeno(client, visibilidad_seed):
    token = await obtener_token_usuario(client, "VIS-AJENO")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = await client.get("/desarrollos/?solo_mios=true", headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    ids = [d["id"] for d in data]
    # El ajeno debe ver su propio proyecto y el proyecto donde colabora (DEV-VIS-1)
    assert "DEV-VIS-4" in ids
    assert "DEV-VIS-1" in ids
    assert "DEV-VIS-2" not in ids
    assert "DEV-VIS-3" not in ids


@pytest.mark.asyncio
async def test_listar_desarrollos_anonimo_retorna_401(client, visibilidad_seed):
    """Acceso sin token a /desarrollos/ debe retornar 401"""
    response = await client.get("/desarrollos/")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_listar_desarrollos_forzar_solo_mios_analista(client, visibilidad_seed):
    """Un usuario comun no debe poder ver todo solicitando solo_mios=false"""
    token = await obtener_token_usuario(client, "VIS-AJENO")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = await client.get("/desarrollos/?solo_mios=false", headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    ids = [d["id"] for d in data]
    # Se le debe forzar solo_mios=True y ver solo sus proyectos permitidos (DEV-VIS-4 y DEV-VIS-1 por colaboracion)
    assert "DEV-VIS-4" in ids
    assert "DEV-VIS-1" in ids
    assert "DEV-VIS-2" not in ids
    assert "DEV-VIS-3" not in ids


@pytest.mark.asyncio
async def test_obtener_arbol_actividades_anonimo_retorna_401(client, visibilidad_seed):
    """Acceso sin token al WBS debe retornar 401"""
    response = await client.get("/actividades/desarrollo/DEV-VIS-1/arbol")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_obtener_arbol_actividades_ajeno_retorna_403(client, visibilidad_seed):
    """Un usuario ajeno sin asignaciones en el desarrollo debe recibir 403"""
    token = await obtener_token_usuario(client, "VIS-AJENO")
    headers = {"Authorization": f"Bearer {token}"}
    
    # DEV-VIS-2 pertenece al Director y no tiene actividades para el ajeno
    response = await client.get("/actividades/desarrollo/DEV-VIS-2/arbol", headers=headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_obtener_arbol_actividades_externo_filtrado_scoped(client, visibilidad_seed):
    """Colaborador externo (ajeno) con actividades asignadas ve solo su tarea y sus ancestros"""
    token = await obtener_token_usuario(client, "VIS-AJENO")
    headers = {"Authorization": f"Bearer {token}"}
    
    # DEV-VIS-1 pertenece al Jefe, pero tiene a Hijo B (1002) y Nieto B (1003) asignados al Ajeno.
    response = await client.get("/actividades/desarrollo/DEV-VIS-1/arbol", headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    # Debe ver a Raiz (1000) y a Hijo B (1002) que a su vez contiene a Nieto B (1003)
    assert len(data) == 1
    raiz = data[0]
    assert raiz["id"] == 1000
    assert len(raiz["subactividades"]) == 1
    
    hijo_b = raiz["subactividades"][0]
    assert hijo_b["id"] == 1002
    assert len(hijo_b["subactividades"]) == 1
    
    nieto_b = hijo_b["subactividades"][0]
    assert nieto_b["id"] == 1003
    
    # El Hijo A (1001) asignado a Jefe NO debe estar en las subactividades de la Raiz
    # porque el Ajeno no tiene relacion con el.
    titulos_raiz_subs = [s["titulo"] for s in raiz["subactividades"]]
    assert "Hijo A" not in titulos_raiz_subs


@pytest.mark.asyncio
async def test_obtener_arbol_actividades_superior_completo(client, visibilidad_seed):
    """El superior del responsable de la actividad ve todo el WBS"""
    token = await obtener_token_usuario(client, "VIS-DIRECTOR")
    headers = {"Authorization": f"Bearer {token}"}
    
    # DEV-VIS-1 pertenece al Jefe (subordinado del Director)
    response = await client.get("/actividades/desarrollo/DEV-VIS-1/arbol", headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    # El Director debe poder ver el WBS completo sin ningun filtrado
    assert len(data) == 1
    raiz = data[0]
    assert raiz["id"] == 1000
    titulos_raiz_subs = [s["titulo"] for s in raiz["subactividades"]]
    assert "Hijo A" in titulos_raiz_subs
    assert "Hijo B" in titulos_raiz_subs
