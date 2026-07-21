def test_default_uuid_acepta_prefijo_public_de_postgresql():
    from app.core.migrations.bitacoras_operacionales_schema import (
        _normalizar_default,
    )

    assert _normalizar_default("public.gen_random_uuid()") == "gen_random_uuid()"
    assert _normalizar_default("gen_random_uuid()") == "gen_random_uuid()"
    assert _normalizar_default("now()") == "now()"
