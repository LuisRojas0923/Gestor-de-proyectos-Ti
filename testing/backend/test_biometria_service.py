from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.services.biometria.biometria_service import BiometriaService


class _FakeResult:
    def __init__(self, value=None):
        self.value = value

    def scalar_one_or_none(self):
        return self.value

    def scalars(self):
        return self

    def all(self):
        if self.value is None:
            return []
        if isinstance(self.value, list):
            return self.value
        return [self.value]

    def first(self):
        return self.value


class _FakeDbSinPerfil:
    async def execute(self, *args, **kwargs):
        return _FakeResult(None)


class _FakeDbConPerfil:
    def __init__(self, perfil):
        self.perfil = perfil

    async def execute(self, *args, **kwargs):
        return _FakeResult(self.perfil)


class _FakeDbConZonas:
    def __init__(self, zonas):
        self.zonas = zonas

    async def execute(self, *args, **kwargs):
        return _FakeResult(self.zonas)


class _FakeDbPerfilYZonas:
    def __init__(self, perfil, zonas):
        self.results = [perfil, zonas]

    async def execute(self, *args, **kwargs):
        return _FakeResult(self.results.pop(0))


class _FakeImage:
    filename = "foto.jpg"
    content_type = "image/jpeg"

    async def read(self):
        return b"imagen"


class _ImageNoDebeLeerse:
    filename = "foto.jpg"
    content_type = "image/jpeg"

    async def read(self):
        raise AssertionError("No debe leer imagen si la geocerca ya falla")


class _EngineNoDebeLlamarse:
    async def representar(self, *args, **kwargs):
        raise AssertionError("No debe llamar el motor sin embedding enrolado")


@pytest.mark.asyncio
async def test_asistencia_sin_embedding_devuelve_404_antes_del_motor():
    service = BiometriaService(engine_client=_EngineNoDebeLlamarse())
    usuario = SimpleNamespace(id="USR-1", rol="usuario")

    with pytest.raises(HTTPException) as exc:
        await service.marcar_asistencia(_FakeDbSinPerfil(), usuario, _FakeImage(), 1.0, 1.0)

    assert exc.value.status_code == 404


def test_filename_rechaza_traversal():
    with pytest.raises(HTTPException) as exc:
        BiometriaService._validar_filename("../secreto.jpg")

    assert exc.value.status_code == 400


def test_filename_motor_no_incluye_identidad_usuario():
    assert BiometriaService._filename_motor("image/jpeg") == "captura.jpg"
    assert BiometriaService._filename_motor("image/png") == "captura.png"


def test_comparar_embeddings_match():
    distance, confidence, match = BiometriaService._comparar_embeddings([1.0, 0.0], [1.0, 0.0])

    assert distance == pytest.approx(0.0)
    assert confidence == 100.0
    assert match is True


@pytest.mark.asyncio
async def test_obtener_estado_biometrico_enrolado_activo():
    perfil = SimpleNamespace(activo=True, creado_en=SimpleNamespace(isoformat=lambda: "2026-07-06T10:00:00"))
    service = BiometriaService(engine_client=_EngineNoDebeLlamarse())
    usuario = SimpleNamespace(id="USR-1", url_avatar="/api/v2/biometria/foto/USR-1.jpg")

    estado = await service.obtener_estado_biometrico(_FakeDbConPerfil(perfil), usuario)

    assert estado == {
        "enrolado": True,
        "fotoUrl": "/api/v2/biometria/foto/USR-1.jpg",
        "actualizadoEn": "2026-07-06T10:00:00",
    }


@pytest.mark.asyncio
async def test_obtener_estado_biometrico_sin_perfil():
    service = BiometriaService(engine_client=_EngineNoDebeLlamarse())
    usuario = SimpleNamespace(id="USR-1", url_avatar=None)

    estado = await service.obtener_estado_biometrico(_FakeDbSinPerfil(), usuario)

    assert estado == {"enrolado": False, "fotoUrl": None, "actualizadoEn": None}


@pytest.mark.asyncio
async def test_obtener_estado_biometrico_perfil_inactivo_no_enrola():
    perfil = SimpleNamespace(activo=False, creado_en=None)
    service = BiometriaService(engine_client=_EngineNoDebeLlamarse())
    usuario = SimpleNamespace(id="USR-1", url_avatar="/api/v2/biometria/foto/USR-1.jpg")

    estado = await service.obtener_estado_biometrico(_FakeDbConPerfil(perfil), usuario)

    assert estado == {"enrolado": False, "fotoUrl": None, "actualizadoEn": None}


@pytest.mark.asyncio
async def test_obtener_estado_biometrico_no_expone_foto_url_externa():
    perfil = SimpleNamespace(activo=True, creado_en=None)
    service = BiometriaService(engine_client=_EngineNoDebeLlamarse())
    usuario = SimpleNamespace(id="USR-1", url_avatar="https://example.com/foto.jpg")

    estado = await service.obtener_estado_biometrico(_FakeDbConPerfil(perfil), usuario)

    assert estado == {"enrolado": True, "fotoUrl": None, "actualizadoEn": None}


@pytest.mark.asyncio
async def test_resolver_zona_por_geocerca_acepta_coordenadas_dentro_del_radio():
    service = BiometriaService(engine_client=_EngineNoDebeLlamarse())
    zona = SimpleNamespace(id=10, latitud=6.2442, longitud=-75.5812, radio=100)

    zona_id = await service._resolver_zona_id_por_geocerca(
        _FakeDbConZonas([zona]),
        zona_id=10,
        latitud=6.24425,
        longitud=-75.58125,
    )

    assert zona_id == 10


@pytest.mark.asyncio
async def test_resolver_zona_por_geocerca_deriva_zona_real_si_id_cliente_es_invalido():
    service = BiometriaService(engine_client=_EngineNoDebeLlamarse())
    zona = SimpleNamespace(id=10, latitud=6.2442, longitud=-75.5812, radio=100)

    zona_id = await service._resolver_zona_id_por_geocerca(
        _FakeDbConZonas([zona]),
        zona_id=999,
        latitud=6.24425,
        longitud=-75.58125,
    )

    assert zona_id == 10


@pytest.mark.asyncio
async def test_resolver_zona_por_geocerca_elige_zona_mas_cercana_si_hay_solape():
    service = BiometriaService(engine_client=_EngineNoDebeLlamarse())
    zona_amplia = SimpleNamespace(id=1, latitud=6.2400, longitud=-75.5800, radio=1000)
    zona_cercana = SimpleNamespace(id=2, latitud=6.2442, longitud=-75.5812, radio=100)

    zona_id = await service._resolver_zona_id_por_geocerca(
        _FakeDbConZonas([zona_amplia, zona_cercana]),
        zona_id=None,
        latitud=6.24425,
        longitud=-75.58125,
    )

    assert zona_id == 2


@pytest.mark.asyncio
async def test_resolver_zona_por_geocerca_rechaza_coordenadas_fuera_del_radio():
    service = BiometriaService(engine_client=_EngineNoDebeLlamarse())
    zona = SimpleNamespace(id=10, latitud=6.2442, longitud=-75.5812, radio=50)

    with pytest.raises(HTTPException) as exc:
        await service._resolver_zona_id_por_geocerca(
            _FakeDbConZonas([zona]),
            zona_id=10,
            latitud=6.2600,
            longitud=-75.6000,
        )

    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_asistencia_fuera_de_geocerca_no_lee_imagen_ni_llama_motor():
    perfil = SimpleNamespace(activo=True, embedding=[1.0, 0.0])
    zona = SimpleNamespace(id=10, latitud=6.2442, longitud=-75.5812, radio=50)
    service = BiometriaService(engine_client=_EngineNoDebeLlamarse())

    with pytest.raises(HTTPException) as exc:
        await service.marcar_asistencia(
            _FakeDbPerfilYZonas(perfil, [zona]),
            SimpleNamespace(id="USR-1"),
            _ImageNoDebeLeerse(),
            latitud=6.2600,
            longitud=-75.6000,
            zona_id=10,
        )

    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_evidencia_admin_fuera_de_alcance_es_404_generico():
    service = BiometriaService(engine_client=_EngineNoDebeLlamarse())

    with pytest.raises(HTTPException) as exc:
        await service.ruta_evidencia_admin(_FakeDbSinPerfil(), 999, {"100"})

    assert exc.value.status_code == 404
    assert exc.value.detail == "Recurso no encontrado"


@pytest.mark.asyncio
async def test_evidencia_admin_bypass_recupera_por_registro(monkeypatch):
    service = BiometriaService(engine_client=_EngineNoDebeLlamarse())
    registro = SimpleNamespace(evidencia_url="/api/v2/biometria/evidencia/prueba.jpg")
    usuario = SimpleNamespace(cedula="100")
    db = _FakeDbConPerfil((registro, usuario))
    monkeypatch.setattr("pathlib.Path.exists", lambda _path: True)

    ruta = await service.ruta_evidencia_admin(db, 1, None)

    assert ruta.name == "prueba.jpg"
