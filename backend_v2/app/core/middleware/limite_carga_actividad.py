"""Límite ASGI previo al parser multipart para evidencias WBS."""

import re

from starlette.responses import JSONResponse


PATRON_CARGA_ACTIVIDAD = re.compile(r"^/api/v2/actividades/[^/]+/archivo$")


class CargaActividadExcedida(Exception):
    pass


class LimiteCargaActividadMiddleware:
    def __init__(self, app, max_body_size: int):
        self.app = app
        self.max_body_size = max_body_size

    async def __call__(self, scope, receive, send):
        if (
            scope["type"] != "http"
            or scope.get("method") != "POST"
            or not PATRON_CARGA_ACTIVIDAD.fullmatch(scope.get("path", ""))
        ):
            await self.app(scope, receive, send)
            return

        headers = {key.lower(): value for key, value in scope.get("headers", [])}
        content_length = headers.get(b"content-length")
        if content_length:
            try:
                if int(content_length) > self.max_body_size:
                    await self._responder_413(scope, receive, send)
                    return
            except ValueError:
                await self._responder_413(scope, receive, send)
                return

        recibido = 0
        respuesta_iniciada = False

        async def receive_limitado():
            nonlocal recibido
            try:
                mensaje = await receive()
                if mensaje["type"] == "http.request":
                    recibido += len(mensaje.get("body", b""))
                    if recibido > self.max_body_size:
                        raise CargaActividadExcedida
                return mensaje
            except CargaActividadExcedida:
                raise
            except Exception as exc:
                raise RuntimeError("No se pudo leer el cuerpo de la solicitud") from exc

        async def send_controlado(mensaje):
            nonlocal respuesta_iniciada
            try:
                if mensaje["type"] == "http.response.start":
                    respuesta_iniciada = True
                await send(mensaje)
            except Exception as exc:
                raise RuntimeError("No se pudo enviar la respuesta") from exc

        try:
            await self.app(scope, receive_limitado, send_controlado)
        except CargaActividadExcedida:
            if not respuesta_iniciada:
                await self._responder_413(scope, receive, send)

    @staticmethod
    async def _responder_413(scope, receive, send):
        respuesta = JSONResponse(
            {"detail": "La solicitud supera el tamaño permitido"},
            status_code=413,
        )
        await respuesta(scope, receive, send)
