import pytest
import pytest_asyncio
from datetime import datetime
from app.models.auditoria.accion_usuario import AuditoriaAccionUsuario
from app.services.auditoria.servicio_estadisticas import ServicioAuditoriaEstadisticas

@pytest_asyncio.fixture(scope="function")
async def db_session():
    from app.database import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        yield session
        # Asegurar rollback al finalizar el test para no ensuciar ni alterar datos reales
        await session.rollback()

@pytest.mark.asyncio
async def test_obtener_estadisticas_clasificacion_fallos_detallados(db_session):
    # NOTA: No hacemos delete() para evitar borrar los datos de desarrollo del usuario.
    # En su lugar, usaremos flush() y rollback() al final de la sesión para aislar el test.

    # 1. Insertar fallos simulados con timestamps únicos en el futuro lejano o usarlos directamente en el test.
    # Para que el test no se contamine con los datos reales existentes en la base de datos,
    # mediremos la diferencia (delta) de fallos añadidos por el test.
    
    # Obtener conteo inicial
    stats_inicial = await ServicioAuditoriaEstadisticas.obtener_estadisticas(db_session)
    fallos_map_inicial = {f["tipo"]: f["total"] for f in stats_inicial.get("tipos_fallos", [])}

    # 2. Insertar fallos simulados temporales
    fallos_a_insertar = [
        # Fallo de autenticación en login
        AuditoriaAccionUsuario(
            usuario_id="usr-1",
            modulo="auth",
            accion="login",
            resultado="fallo",
            ruta="/api/v2/auth/login",
            codigo_respuesta=401,
            timestamp=datetime.now()
        ),
        # Fallo de permisos
        AuditoriaAccionUsuario(
            usuario_id="usr-2",
            modulo="auditoria_sistema",
            accion="consultar",
            resultado="denegado",
            ruta="/api/v2/auditoria/eventos",
            codigo_respuesta=403,
            timestamp=datetime.now()
        ),
        # Fallo de validación en viáticos
        AuditoriaAccionUsuario(
            usuario_id="usr-3",
            modulo="viaticos",
            accion="crear",
            resultado="fallo",
            ruta="/api/v2/viaticos/enviar",
            codigo_respuesta=422,
            timestamp=datetime.now()
        ),
        # Fallo interno en salas
        AuditoriaAccionUsuario(
            usuario_id="usr-4",
            modulo="reserva_salas",
            accion="crear",
            resultado="fallo",
            ruta="/api/v2/reserva-salas/crear",
            codigo_respuesta=500,
            timestamp=datetime.now()
        ),
    ]

    for f in fallos_a_insertar:
        db_session.add(f)
    
    # Escribir en la base de datos temporalmente dentro de la transacción actual
    await db_session.flush()

    # 3. Obtener estadísticas nuevas
    stats_nuevo = await ServicioAuditoriaEstadisticas.obtener_estadisticas(db_session)
    
    # Mapear los detalles del nuevo resultado
    fallos_nuevo = {f["tipo"]: f for f in stats_nuevo.get("tipos_fallos", [])}
    fallos_inicial = {f["tipo"]: f for f in stats_inicial.get("tipos_fallos", [])}

    # 4. Aserciones basadas en diferencias (deltas) de detalles para aislar la prueba
    assert "Autenticación" in fallos_nuevo
    assert "Permiso" in fallos_nuevo
    assert "Validación" in fallos_nuevo
    assert "Sistema" in fallos_nuevo

    # Comprobar los detalles específicos dentro de cada macro
    detalles_auth = fallos_nuevo["Autenticación"].get("detalles", {})
    detalles_auth_inicial = fallos_inicial.get("Autenticación", {}).get("detalles", {})
    
    detalles_perm = fallos_nuevo["Permiso"].get("detalles", {})
    detalles_perm_inicial = fallos_inicial.get("Permiso", {}).get("detalles", {})
    
    detalles_valid = fallos_nuevo["Validación"].get("detalles", {})
    detalles_valid_inicial = fallos_inicial.get("Validación", {}).get("detalles", {})
    
    detalles_sys = fallos_nuevo["Sistema"].get("detalles", {})
    detalles_sys_inicial = fallos_inicial.get("Sistema", {}).get("detalles", {})

    # Mensajes esperados
    msg_auth = "Credenciales incorrectas (Usuario o contraseña inválida)"
    msg_perm = "Intento de acceso a zona restringida (Módulo: Seguridad y Auditoría)"
    msg_valid = "Formulario de viáticos incompleto o con datos inválidos"
    msg_sys = "Fallo de servidor al procesar el módulo: Reserva de Espacios"

    assert detalles_auth.get(msg_auth, 0) - detalles_auth_inicial.get(msg_auth, 0) == 1
    assert detalles_perm.get(msg_perm, 0) - detalles_perm_inicial.get(msg_perm, 0) == 1
    assert detalles_valid.get(msg_valid, 0) - detalles_valid_inicial.get(msg_valid, 0) == 1
    assert detalles_sys.get(msg_sys, 0) - detalles_sys_inicial.get(msg_sys, 0) == 1
