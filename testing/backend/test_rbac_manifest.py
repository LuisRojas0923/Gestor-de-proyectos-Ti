"""Regresiones del manifiesto central y su sincronizacion RBAC."""

from collections import Counter
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.rbac_manifest import SYSTEM_MODULES_REGISTRY
from app.services.auth import rbac_discovery


def test_manifest_rbac_no_contiene_ids_duplicados():
    conteos = Counter(modulo["id"] for modulo in SYSTEM_MODULES_REGISTRY)
    duplicados = sorted(modulo_id for modulo_id, total in conteos.items() if total > 1)

    assert duplicados == [], f"IDs RBAC duplicados: {duplicados}"


def test_modulos_nomina_estan_registrados_una_sola_vez():
    for modulo_id in ("nomina_novedades", "comisiones"):
        coincidencias = [
            modulo for modulo in SYSTEM_MODULES_REGISTRY if modulo["id"] == modulo_id
        ]

        assert len(coincidencias) == 1
        assert coincidencias[0]["categoria"] == "portal"
        assert coincidencias[0]["es_critico"] is True


def test_validador_rechaza_ids_duplicados():
    manifiesto = [
        {"id": "duplicado"},
        {"id": "duplicado"},
    ]

    with pytest.raises(ValueError, match="duplicado"):
        rbac_discovery.validar_manifiesto_rbac(manifiesto)


@pytest.mark.asyncio
async def test_sincronizacion_rechaza_duplicados_antes_de_tocar_db(monkeypatch):
    monkeypatch.setattr(
        rbac_discovery,
        "SYSTEM_MODULES_REGISTRY",
        [{"id": "duplicado"}, {"id": "duplicado"}],
    )
    db = AsyncMock()

    with pytest.raises(ValueError, match="duplicado"):
        await rbac_discovery.sincronizar_manifiesto_rbac(db)

    db.execute.assert_not_awaited()
    db.commit.assert_not_awaited()
    db.rollback.assert_not_awaited()


@pytest.mark.asyncio
async def test_sincronizacion_serializa_workers_y_crea_permiso_admin(monkeypatch):
    modulo = {
        "id": "modulo_prueba",
        "nombre": "Módulo de prueba",
        "categoria": "portal",
        "descripcion": "Prueba",
        "es_critico": False,
    }
    monkeypatch.setattr(rbac_discovery, "SYSTEM_MODULES_REGISTRY", [modulo])

    permiso_inexistente = MagicMock()
    permiso_inexistente.first.return_value = None
    db = AsyncMock()
    db.execute.side_effect = [
        MagicMock(),
        MagicMock(),
        permiso_inexistente,
        MagicMock(),
    ]

    await rbac_discovery.sincronizar_manifiesto_rbac(db)

    primera_sentencia = str(db.execute.await_args_list[0].args[0])
    assert "pg_advisory_xact_lock" in primera_sentencia
    assert db.execute.await_args_list[-1].args[1] == {
        "rol": "admin",
        "modulo": "modulo_prueba",
    }
    db.commit.assert_awaited_once()
    db.rollback.assert_not_awaited()


@pytest.mark.asyncio
async def test_sincronizacion_conserva_permiso_admin_existente(monkeypatch):
    modulo = {
        "id": "modulo_prueba",
        "nombre": "Módulo de prueba",
        "categoria": "portal",
        "descripcion": None,
        "es_critico": False,
    }
    monkeypatch.setattr(rbac_discovery, "SYSTEM_MODULES_REGISTRY", [modulo])

    permiso_existente = MagicMock()
    permiso_existente.first.return_value = (1,)
    db = AsyncMock()
    db.execute.side_effect = [MagicMock(), MagicMock(), permiso_existente]

    await rbac_discovery.sincronizar_manifiesto_rbac(db)

    assert db.execute.await_count == 3
    db.commit.assert_awaited_once()
    db.rollback.assert_not_awaited()


@pytest.mark.asyncio
async def test_sincronizacion_revierte_escritura_parcial(monkeypatch):
    modulo = {
        "id": "modulo_prueba",
        "nombre": "Módulo de prueba",
        "categoria": "portal",
        "descripcion": None,
        "es_critico": False,
    }
    monkeypatch.setattr(rbac_discovery, "SYSTEM_MODULES_REGISTRY", [modulo])
    db = AsyncMock()
    db.execute.side_effect = [
        MagicMock(),
        MagicMock(),
        RuntimeError("DB no disponible"),
    ]

    with pytest.raises(RuntimeError, match="DB no disponible"):
        await rbac_discovery.sincronizar_manifiesto_rbac(db)

    assert db.execute.await_count == 3
    db.rollback.assert_awaited_once()
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_sincronizacion_propaga_error_critico(monkeypatch):
    monkeypatch.setattr(
        rbac_discovery,
        "SYSTEM_MODULES_REGISTRY",
        [
            {
                "id": "modulo_prueba",
                "nombre": "Módulo de prueba",
                "categoria": "portal",
                "descripcion": None,
                "es_critico": False,
            }
        ],
    )
    db = AsyncMock()
    db.execute.side_effect = RuntimeError("DB no disponible")

    with pytest.raises(RuntimeError, match="DB no disponible"):
        await rbac_discovery.sincronizar_manifiesto_rbac(db)

    db.rollback.assert_awaited_once()
    db.commit.assert_not_awaited()
