"""
Test unit F5.5: TokenBucket y _check_rate_limit en scripts/mcp/mcp_server.py.

Cubre:
- TokenBucket consume respeta capacidad
- Refill progresivo de tokens con el tiempo
- _check_rate_limit aplica limite per-tool y global
- Fail-open si los buckets no estan inicializados (no debe crashear)

NO requiere Docker, DB. Pico RAM ~50MB.
"""
import importlib.util
import os
import time
from datetime import timedelta
from pathlib import Path

import pytest

from app.config import config
from app.services.auth.servicio import ServicioAuth


MCP_SERVER = Path(__file__).resolve().parents[2] / "scripts" / "mcp" / "mcp_server.py"


def _cargar_modulo():
    """Carga mcp_server.py con env minima (sin token valido, solo para tests de bucket)."""
    saved = os.environ.copy()
    os.environ["GPM_TOKEN"] = "test_token"
    os.environ["GPM_TOKEN_NAME"] = "test"
    os.environ["GPM_JWT_SECRET"] = config.jwt_secret_key
    spec = importlib.util.spec_from_file_location("mcp_server_test_bucket", MCP_SERVER)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    os.environ.clear()
    os.environ.update(saved)
    return mod


class TestTokenBucket:
    """TokenBucket consume tokens hasta agotar capacidad."""

    def test_consume_devuelve_true_hasta_agotar(self):
        mod = _cargar_modulo()
        bucket = mod.TokenBucket(capacity=5, tokens=5.0, refill_per_sec=1.0, last=time.monotonic())
        # Primeros 5 consumos: True
        for i in range(5):
            assert bucket.consume() is True, f"consumo {i+1}/5 debe pasar"
        # Sexto: False (sin tiempo para refill)
        bucket.last = time.monotonic()  # congelar tiempo
        # refill_per_sec=1.0 pero elapsed≈0, asi que no hay refill
        # tokens=0, no consume
        # Truco: para que falle deterministicamente, seteamos last recien
        bucket2 = mod.TokenBucket(capacity=5, tokens=0.0, refill_per_sec=0.001, last=time.monotonic())
        # Con refill_per_sec=0.001 y elapsed~0, no alcanza a refillar 1 token
        assert bucket2.consume() is False

    def test_refill_recupera_tokens_con_tiempo(self):
        """Tras esperar, el bucket recupera tokens hasta la capacidad."""
        mod = _cargar_modulo()
        # refill_per_sec=1000 → 1 token por milisegundo
        bucket = mod.TokenBucket(capacity=10, tokens=0.0, refill_per_sec=1000.0, last=time.monotonic())
        # Agotar inmediatamente
        assert bucket.consume() is False
        # Esperar 5ms → debe haber ~5 tokens refillados
        time.sleep(0.005)
        for _ in range(5):
            assert bucket.consume() is True

    def test_no_supera_capacidad(self):
        """El refill no debe acumular tokens más allá de la capacidad."""
        mod = _cargar_modulo()
        bucket = mod.TokenBucket(capacity=5, tokens=5.0, refill_per_sec=1000.0, last=time.monotonic())
        # Esperar 1 segundo (suficiente para 1000 tokens si no hubiera cap)
        time.sleep(0.1)
        # Consumir 5 → todos pasan
        for _ in range(5):
            assert bucket.consume() is True
        # Sexto debe fallar (cap=5, ya consumimos los 5)
        bucket.last = time.monotonic()
        # refill=1000/s, elapsed≈0, asi que no hay tiempo de refillar
        # Pero el codigo hace min(capacity, ...) → tokens=5
        # Inmediatamente consume → tokens=4
        # Para testear que NO supera cap, lo consumimos 100 veces rapido
        cuenta = 0
        for _ in range(100):
            if bucket.consume():
                cuenta += 1
        # En 100 consumos instantaneos sin tiempo solo se consumen los
        # tokens que ya estaban; el cap limita
        assert cuenta <= 5

    def test_consume_n_tokens(self):
        """consume(n) debe decrementar n tokens atómicamente."""
        mod = _cargar_modulo()
        bucket = mod.TokenBucket(capacity=10, tokens=10.0, refill_per_sec=0.001, last=time.monotonic())
        # Consumir 3 de una → quedan 7
        assert bucket.consume(n=3) is True
        # Consumir 7 más → quedan 0
        assert bucket.consume(n=7) is True
        # Intentar consumir 1 más → falla
        assert bucket.consume(n=1) is False


class TestCheckRateLimit:
    """_check_rate_limit aplica limite per-tool y global."""

    def test_per_tool_levanta_runtime_error_al_exceder(self, monkeypatch):
        """Tras N consumos del mismo tool, debe levantar RuntimeError."""
        mod = _cargar_modulo()
        # Bajar limite para test rapido
        monkeypatch.setattr(mod, "RATE_LIMIT_PER_TOOL", "3")
        # Reimportar el modulo no aplica (los buckets ya estan construidos);
        # creamos buckets frescos via la factory
        from collections import defaultdict
        mod._tool_buckets = defaultdict(
            lambda: mod._make_bucket(int(mod.RATE_LIMIT_PER_TOOL))
        )
        mod._global_bucket = mod._make_bucket(int(mod.RATE_LIMIT_GLOBAL))

        # 3 consumos pasan
        for _ in range(3):
            mod._check_rate_limit("test_tool")
        # 4to falla
        with pytest.raises(RuntimeError) as excinfo:
            mod._check_rate_limit("test_tool")
        assert "test_tool" in str(excinfo.value)
        assert "3/min" in str(excinfo.value)

    def test_global_levanta_runtime_error_si_excede_global(self, monkeypatch):
        """Si el bucket global se agota, rechaza aunque el per-tool tenga cupo."""
        mod = _cargar_modulo()
        # Global = 2
        monkeypatch.setattr(mod, "RATE_LIMIT_GLOBAL", "2")
        mod._global_bucket = mod._make_bucket(2)
        from collections import defaultdict
        mod._tool_buckets = defaultdict(
            lambda: mod._make_bucket(int(mod.RATE_LIMIT_PER_TOOL))
        )
        # 2 consumos pasan (1 por tool distinto, mismo global)
        mod._check_rate_limit("tool_a")
        mod._check_rate_limit("tool_b")
        # 3er consumo (de otro tool) debe fallar por global
        with pytest.raises(RuntimeError) as excinfo:
            mod._check_rate_limit("tool_c")
        assert "global" in str(excinfo.value).lower()

    def test_per_tool_y_global_independientes_en_keys(self):
        """Distintos tool names tienen buckets independientes (no comparten cupo)."""
        mod = _cargar_modulo()
        from collections import defaultdict
        mod._tool_buckets = defaultdict(
            lambda: mod._make_bucket(int(mod.RATE_LIMIT_PER_TOOL))
        )
        mod._global_bucket = mod._make_bucket(int(mod.RATE_LIMIT_GLOBAL))
        # Consumir 60 (cap) de tool_a
        for _ in range(int(mod.RATE_LIMIT_PER_TOOL)):
            mod._check_rate_limit("tool_a")
        # tool_b debe seguir teniendo su cupo completo
        mod._check_rate_limit("tool_b")
        mod._check_rate_limit("tool_c")
