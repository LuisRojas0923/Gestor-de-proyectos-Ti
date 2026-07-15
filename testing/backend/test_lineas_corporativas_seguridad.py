from io import BytesIO
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi import UploadFile
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError

from app.api.auth.profile_router import obtener_usuario_actual_db
from app.api.lineas_corporativas.dependencies import (
    requiere_administrador_lineas_corporativas,
    requiere_permiso_lineas_corporativas,
)
from app.api.lineas_corporativas.archivos import (
    MAX_EXCEL_BYTES,
    MAX_EXCEL_UNCOMPRESSED_BYTES,
    leer_excel_seguro,
)
from app.api.lineas_corporativas.alertas_router import obtener_alertas_empleados
from app.api.lineas_corporativas.maestros_router import _traducir_error
from app.api.lineas_corporativas.schemas import (
    EmpleadoLineaCreate,
    EquipoMovilCreate,
    EquipoMovilUpdate,
)
from app.core.middleware.auditoria_resolver import inferir_entidad_desde_ruta
from app.database import obtener_db
from app.main import app
from app.services.auditoria.servicio import (
    ServicioAuditoria,
    _enmascarar_datos,
    inferir_modulo_desde_ruta,
)
from app.services.lineas_corporativas.maestros_service import (
    ConflictoIntegridadLineas,
    ErrorPersistenciaLineas,
    LineasCorporativasMaestrosService,
    RecursoEnUsoLineas,
    RecursoNoEncontradoLineas,
)


def test_equipo_normaliza_identificadores_vacios_en_create_y_update():
    creado = EquipoMovilCreate(modelo="Galaxy", imei="  ", serial="")
    actualizado = EquipoMovilUpdate(imei=" ", serial="   ")

    assert creado.imei is None
    assert creado.serial is None
    assert actualizado.imei is None
    assert actualizado.serial is None


@pytest.mark.parametrize(
    "payload",
    [
        {"modelo": None},
        {"modelo": ""},
    ],
)
def test_equipo_rechaza_modelo_nulo_o_vacio(payload):
    with pytest.raises(ValidationError):
        EquipoMovilCreate(**payload)


def test_persona_valida_documento_y_nombre():
    persona = EmpleadoLineaCreate(documento="CED-123", nombre="  Ana Pérez  ")
    assert persona.nombre == "Ana Pérez"

    with pytest.raises(ValidationError):
        EmpleadoLineaCreate(documento="../123", nombre="Ana")


def test_persona_conserva_tipo_legacy_beneficiario():
    persona = EmpleadoLineaCreate(
        documento="CED-123", nombre="Ana Pérez", tipo="BENEFICIARIO"
    )

    assert persona.tipo == "BENEFICIARIO"


@pytest.mark.asyncio
async def test_permiso_lineas_rechaza_rol_sin_acceso():
    usuario = SimpleNamespace(rol="consulta")
    with patch(
        "app.api.lineas_corporativas.dependencies.ServicioAuth.obtener_permisos_por_rol",
        new=AsyncMock(return_value=[]),
    ):
        with pytest.raises(HTTPException) as exc:
            await requiere_permiso_lineas_corporativas(AsyncMock(), usuario)

    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_permiso_lineas_acepta_rol_autorizado():
    usuario = SimpleNamespace(rol="lineas")
    with patch(
        "app.api.lineas_corporativas.dependencies.ServicioAuth.obtener_permisos_por_rol",
        new=AsyncMock(return_value=["lineas_corporativas"]),
    ):
        resultado = await requiere_permiso_lineas_corporativas(AsyncMock(), usuario)

    assert resultado is usuario


@pytest.mark.asyncio
async def test_administracion_lineas_rechaza_rol_no_admin():
    with pytest.raises(HTTPException) as exc:
        await requiere_administrador_lineas_corporativas(
            SimpleNamespace(rol="lineas")
        )

    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_administracion_lineas_acepta_admin():
    usuario = SimpleNamespace(rol="admin")

    assert await requiere_administrador_lineas_corporativas(usuario) is usuario


@pytest.mark.asyncio
async def test_excel_rechaza_extension_y_tamano_invalidos():
    with pytest.raises(HTTPException) as extension_error:
        await leer_excel_seguro(UploadFile(BytesIO(b"texto"), filename="matriz.txt"))
    assert extension_error.value.status_code == 415

    contenido = BytesIO(b"PK" + b"0" * MAX_EXCEL_BYTES)
    with pytest.raises(HTTPException) as tamano_error:
        await leer_excel_seguro(UploadFile(contenido, filename="matriz.xlsx"))
    assert tamano_error.value.status_code == 413


@pytest.mark.asyncio
async def test_excel_rechaza_firma_zip_y_contenido_descomprimido_invalidos():
    with pytest.raises(HTTPException) as firma_error:
        await leer_excel_seguro(UploadFile(BytesIO(b"NO"), filename="matriz.xlsx"))
    assert firma_error.value.status_code == 415

    with pytest.raises(HTTPException) as zip_error:
        await leer_excel_seguro(UploadFile(BytesIO(b"PK-corrupto"), filename="matriz.xlsx"))
    assert zip_error.value.status_code == 415

    archivo_zip = MagicMock()
    archivo_zip.__enter__.return_value.infolist.return_value = [
        SimpleNamespace(file_size=MAX_EXCEL_UNCOMPRESSED_BYTES + 1)
    ]
    with patch(
        "app.api.lineas_corporativas.archivos.ZipFile", return_value=archivo_zip
    ):
        with pytest.raises(HTTPException) as contenido_error:
            await leer_excel_seguro(
                UploadFile(BytesIO(b"PK"), filename="matriz.xlsx")
            )
    assert contenido_error.value.status_code == 413


@pytest.mark.parametrize(
    ("ruta", "tipo", "identificador"),
    [
        ("/api/v2/lineas-corporativas/equipos/42", "equipo_movil", "42"),
        ("/api/v2/lineas-corporativas/personas/CED-123", "persona_linea", "CED-123"),
        ("/api/v2/lineas-corporativas/personas/CED%20123", "persona_linea", "CED%20123"),
    ],
)
def test_auditoria_resuelve_entidad_anidada(ruta, tipo, identificador):
    assert inferir_entidad_desde_ruta(ruta) == (tipo, identificador)
    assert inferir_modulo_desde_ruta(ruta) == "lineas_corporativas"


def test_auditoria_redacta_pii_de_lineas_corporativas():
    datos = _enmascarar_datos(
        {
            "documento": "1107068093",
            "nombre": "Persona Privada",
            "imei": "123456789012345",
            "serial": "ABC-123",
            "modelo": "Galaxy",
        },
        modulo="lineas_corporativas",
    )

    assert datos == {
        "documento": "[REDACTED]",
        "nombre": "[REDACTED]",
        "imei": "[REDACTED]",
        "serial": "[REDACTED]",
        "modelo": "Galaxy",
    }


def test_auditoria_no_redacta_nombre_en_otros_modulos():
    assert _enmascarar_datos({"nombre": "Actividad"}) == {"nombre": "Actividad"}


@pytest.mark.asyncio
async def test_auditoria_anonimiza_identificador_y_ruta_de_persona():
    db = AsyncMock()

    await ServicioAuditoria.registrar(
        db,
        usuario_id="usuario-prueba",
        modulo="lineas_corporativas",
        accion="actualizar",
        entidad_tipo="persona_linea",
        entidad_id="1107068093",
        ruta="/api/v2/lineas-corporativas/personas/1107068093",
        datos_nuevos={"documento_asignado": "1107068093"},
    )

    sentencia = db.execute.await_args.args[0]
    parametros = sentencia.compile().params
    assert parametros["entidad_id"] == "[REDACTED]"
    assert parametros["ruta"].endswith("/personas/[REDACTED]")
    assert parametros["datos_nuevos"]["documento_asignado"] == "[REDACTED]"


@pytest.mark.asyncio
async def test_servicio_equipo_hace_rollback_por_conflicto_integridad():
    db = AsyncMock()
    db.add = MagicMock()
    db.commit.side_effect = IntegrityError("insert", {}, Exception("duplicate imei"))

    with pytest.raises(ConflictoIntegridadLineas):
        await LineasCorporativasMaestrosService.crear_equipo(
            db, EquipoMovilCreate(modelo="Galaxy", imei="123")
        )

    db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_servicio_clasifica_fallo_inesperado_como_error_persistencia():
    db = AsyncMock()
    db.add = MagicMock()
    db.flush.side_effect = RuntimeError("conexión perdida")

    with pytest.raises(ErrorPersistenciaLineas):
        await LineasCorporativasMaestrosService.crear_equipo(
            db, EquipoMovilCreate(modelo="Galaxy")
        )

    db.rollback.assert_awaited_once()


def test_router_traduce_errores_sin_exponer_detalles_internos():
    no_encontrado = _traducir_error(RecursoNoEncontradoLineas("No existe"))
    conflicto = _traducir_error(ConflictoIntegridadLineas("Duplicado"))
    persistencia = _traducir_error(ErrorPersistenciaLineas("SQL privado"))

    assert (no_encontrado.status_code, no_encontrado.detail) == (404, "No existe")
    assert (conflicto.status_code, conflicto.detail) == (409, "Duplicado")
    assert persistencia.status_code == 500
    assert "SQL privado" not in persistencia.detail


@pytest.mark.asyncio
async def test_servicio_no_elimina_linea_con_historial_facturado():
    db = AsyncMock()
    db.get.return_value = SimpleNamespace(id=7)
    resultado = MagicMock()
    resultado.scalar_one_or_none.return_value = 99
    db.execute.return_value = resultado

    with pytest.raises(RecursoEnUsoLineas):
        await LineasCorporativasMaestrosService.eliminar_linea(db, 7)

    db.delete.assert_not_awaited()


@pytest.mark.asyncio
async def test_alertas_empleados_degrada_si_erp_no_responde():
    db_local = AsyncMock()
    resultado = MagicMock()
    resultado.scalars.return_value.all.return_value = ["1107068093"]
    db_local.execute.return_value = resultado
    db_erp = MagicMock()
    db_erp.execute.side_effect = RuntimeError("ERP fuera de servicio")

    respuesta = await obtener_alertas_empleados(db_erp, db_local)

    assert respuesta == {"error": "ERP no disponible", "alertas": {}}


@pytest.mark.asyncio
async def test_api_lineas_requiere_autenticacion():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/v2/lineas-corporativas/equipos")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_api_lineas_rechaza_usuario_sin_permiso():
    async def usuario_pruebas():
        return SimpleNamespace(rol="consulta")

    async def db_pruebas():
        yield AsyncMock()

    app.dependency_overrides[obtener_usuario_actual_db] = usuario_pruebas
    app.dependency_overrides[obtener_db] = db_pruebas
    try:
        with patch(
            "app.api.lineas_corporativas.dependencies.ServicioAuth.obtener_permisos_por_rol",
            new=AsyncMock(return_value=[]),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                response = await client.get("/api/v2/lineas-corporativas/equipos")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_api_lineas_rechaza_mutacion_a_usuario_no_admin():
    async def usuario_pruebas():
        return SimpleNamespace(rol="lineas")

    async def db_pruebas():
        yield AsyncMock()

    app.dependency_overrides[obtener_usuario_actual_db] = usuario_pruebas
    app.dependency_overrides[obtener_db] = db_pruebas
    try:
        with patch(
            "app.api.lineas_corporativas.dependencies.ServicioAuth.obtener_permisos_por_rol",
            new=AsyncMock(return_value=["lineas_corporativas"]),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                response = await client.post(
                    "/api/v2/lineas-corporativas/equipos",
                    json={"modelo": "Equipo restringido"},
                )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 403
