import asyncio
import httpx

async def c():
    res = await httpx.AsyncClient().get('http://127.0.0.1:8000/api/v2/rrhh/requisiciones/77')
    d = res.json()
    print('Estado actual:', d.get('estado'))
    print('Historial:', [(h.get('estado_anterior'), h.get('estado_nuevo'), h.get('fecha')) for h in d.get('historial', [])])

asyncio.run(c())
