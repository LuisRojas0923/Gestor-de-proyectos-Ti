import pytest
import uuid
from httpx import AsyncClient
from app.main import app
from app.models.reserva_salas.models import Room
from app.models.auth.usuario import Usuario
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import obtener_db

@pytest.fixture
def override_get_db(db_session):
    async def _override():
        yield db_session
    app.dependency_overrides[obtener_db] = _override
    yield
    app.dependency_overrides.pop(obtener_db, None)

@pytest.mark.asyncio
async def test_middleware_auditoria_creacion_reserva(override_get_db, db_session: AsyncSession):
    # 1. Preparar un usuario autenticado y una sala válida
    usuario_test = Usuario(
        id=str(uuid.uuid4()),
        cedula=str(uuid.uuid4())[:10],
        correo=f"{uuid.uuid4().hex[:10]}@test.com",
        hash_contrasena="hash_test",
        nombre="Usuario Auditoria",
        rol="admin",
        esta_activo=True
    )
    db_session.add(usuario_test)

    room_id = uuid.uuid4()
    sala_test = Room(
        id=room_id,
        name="Sala Pruebas",
        capacity=10,
        resources=["TV"],
        is_active=True
    )
    db_session.add(sala_test)
    await db_session.commit()

    # 2. Hacer la petición simulando que el middleware actúa
    # Necesitamos simular el token o usar dependencias
    # Podemos hacer patch de obtener_usuario_actual_db para forzar el usuario
    from app.api.auth.router import obtener_usuario_actual_db
    from starlette.requests import Request
    def mock_user(request: Request):
        request.state.usuario_id = usuario_test.id
        request.state.usuario_nombre = usuario_test.nombre
        request.state.usuario_rol = usuario_test.rol
        return usuario_test

    app.dependency_overrides[obtener_usuario_actual_db] = mock_user

    from datetime import datetime, timezone, timedelta
    start_dt = datetime.now(timezone.utc).replace(hour=14, minute=0, second=0)
    end_dt = start_dt + timedelta(hours=1)

    from app.services.auth.servicio import ServicioAuth
    token = ServicioAuth.crear_token_acceso({"sub": usuario_test.cedula, "rol": usuario_test.rol})

    from httpx import ASGITransport
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {token}"}
    ) as ac:
        response = await ac.post(
            "/api/v2/reserva-salas/reservations",
            json={
                "room_id": str(room_id),
                "start_datetime": start_dt.isoformat(),
                "end_datetime": end_dt.isoformat(),
                "title": "Reunión de prueba auditoría"
            }
        )

    # Restaurar override del usuario
    app.dependency_overrides.pop(obtener_usuario_actual_db, None)

    assert response.status_code == 200, response.text

    # 3. Verificar que la auditoría se registró (que el middleware no falló por JSONB de UUID/Datetime)
    from app.models.auditoria.accion_usuario import AuditoriaAccionUsuario
    from sqlmodel import select

    # Refrescar la transacción para asegurar visibilidad determinista del commit hecho por el middleware en otra sesión
    await db_session.commit()

    result = await db_session.execute(
        select(AuditoriaAccionUsuario)
        .where(
            AuditoriaAccionUsuario.ruta == "/api/v2/reserva-salas/reservations",
            AuditoriaAccionUsuario.usuario_id == str(usuario_test.id)
        )
    )
    auditorias = result.scalars().all()

    # Debe existir al menos un evento de auditoría por la creación
    assert len(auditorias) > 0, "No se encontró el evento de auditoría para este usuario"
    auditoria = auditorias[0]

    # Comprobar que los datos nuevos tienen UUID convertido a string y room_name insertado
    assert auditoria.datos_nuevos is not None
    assert isinstance(auditoria.datos_nuevos, dict)
    assert auditoria.datos_nuevos["room_id"] == str(room_id)
    assert auditoria.datos_nuevos["room_name"] == "Sala Pruebas"
