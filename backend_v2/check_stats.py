import asyncio
from datetime import datetime
from app.database import AsyncSessionLocal
from app.services.auditoria.servicio_estadisticas import ServicioAuditoriaEstadisticas

async def main():
    async with AsyncSessionLocal() as session:
        # Rango desde el 7 de junio al 7 de julio de 2026
        desde = datetime(2026, 6, 7, 0, 0, 0)
        hasta = datetime(2026, 7, 7, 23, 59, 59)
        
        stats = await ServicioAuditoriaEstadisticas.obtener_estadisticas(session, desde, hasta)
        
        por_dia = stats.get("por_dia", [])
        print("--- RESULTADO DE POR_DIA EN ESTADÍSTICAS ---")
        for d in por_dia:
            if "07-07" in d["fecha"] or "07-06" in d["fecha"]:
                print(f"Fecha: {d['fecha']} | Total Eventos: {d['total']}")

if __name__ == "__main__":
    asyncio.run(main())
