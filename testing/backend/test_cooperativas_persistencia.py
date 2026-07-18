from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.novedades_nomina import persistencia_cooperativas


@pytest.mark.asyncio
async def test_guardar_archivos_cooperativa_persiste_todo_el_lote(
    monkeypatch,
    tmp_path,
):
    monkeypatch.setattr(persistencia_cooperativas, "STORAGE_DIR", tmp_path)

    archivos = await persistencia_cooperativas.guardar_archivos_cooperativa(
        [b"archivo-uno", b"archivo-dos"],
        ["uno.pdf", "dos.pdf"],
    )

    assert [archivo["nombre_original"] for archivo in archivos] == [
        "uno.pdf",
        "dos.pdf",
    ]
    assert [Path(archivo["ruta"]).read_bytes() for archivo in archivos] == [
        b"archivo-uno",
        b"archivo-dos",
    ]


@pytest.mark.asyncio
async def test_preparar_reemplazo_cooperativa_bloquea_antes_de_eliminar():
    session = AsyncMock()

    await persistencia_cooperativas.preparar_reemplazo_cooperativa(
        session,
        "GRANCOOP",
        7,
        2026,
    )

    assert session.execute.await_count == 2
    bloqueo, eliminacion = session.execute.await_args_list
    assert "pg_advisory_xact_lock" in str(bloqueo.args[0])
    assert bloqueo.args[1] == {"clave": "nomina-cooperativa:GRANCOOP:2026:7"}
    assert "DELETE FROM nomina_registros_normalizados" in str(eliminacion.args[0])


@pytest.mark.asyncio
async def test_registrar_archivos_cooperativa_crea_metadatos_para_todo_el_lote():
    session = MagicMock()
    session.flush = AsyncMock()
    archivos = [
        {
            "nombre_original": "uno.pdf",
            "hash": "a" * 64,
            "tamaño_bytes": 10,
            "tipo_archivo": "pdf",
            "ruta": "uploads/uno.pdf",
        },
        {
            "nombre_original": "dos.pdf",
            "hash": "b" * 64,
            "tamaño_bytes": 20,
            "tipo_archivo": "pdf",
            "ruta": "uploads/dos.pdf",
        },
    ]

    principal = await persistencia_cooperativas.registrar_archivos_cooperativa(
        session,
        archivos,
        7,
        2026,
        "GRANCOOP",
    )

    assert session.add.call_count == 2
    assert session.flush.await_count == 2
    assert principal.nombre_archivo == "uno.pdf"
