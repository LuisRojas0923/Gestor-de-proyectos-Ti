import asyncio
import aiohttp
import os
import base64

async def fetch():
    async with aiohttp.ClientSession() as session:
        # We need a valid token! We can't hit /asistencia without a token because it depends on usuario_actual.
        # But wait! If we don't send a token, it will return 401 Unauthorized, not 500!
        pass

asyncio.run(fetch())
