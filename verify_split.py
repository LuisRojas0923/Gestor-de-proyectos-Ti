import asyncio
from backend_v2.app.api.novedades_nomina.nomina_router import obtener_catalogo

async def verify():
    catalog = await obtener_catalogo()
    print("Catalog:", catalog)
    novedades = catalog.get("NOVEDADES", [])
    if "PLANILLAS REGIONALES 1Q" in novedades and "PLANILLAS REGIONALES 2Q" in novedades:
        print("SUCCESS: Planillas Regionales split correctly.")
    else:
        print("FAILURE: Planillas Regionales NOT split correctly.")

if __name__ == "__main__":
    asyncio.run(verify())
