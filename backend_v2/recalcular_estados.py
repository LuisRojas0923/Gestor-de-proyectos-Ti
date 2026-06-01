"""
Recalculo masivo de porcentaje_progreso y estado_general de todos los desarrollos.
Fórmula: Completada/Completado=100, En Progreso=50, resto=0 → promedio.
Estado:  si alguna actividad está En Progreso y el desarrollo está Pendiente → En Progreso.
"""
import asyncio
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text
from app.config import config

SQL_ACTIVIDADES = """
    SELECT desarrollo_id, estado
    FROM actividades
    WHERE desarrollo_id IS NOT NULL
"""

SQL_DESARROLLOS = """
    SELECT id, estado_general, porcentaje_progreso FROM desarrollos
"""

def _puntos(estado: str) -> int:
    if estado in ("Completada", "Completado"):
        return 100
    if estado == "En Progreso":
        return 50
    return 0

async def run():
    engine = create_async_engine(config.database_url)
    async with async_sessionmaker(engine)() as db:
        # Agrupar actividades por desarrollo
        rows = (await db.execute(text(SQL_ACTIVIDADES))).fetchall()  # [CONTROLADO]
        grupos: dict[str, list[str]] = {}
        for r in rows:
            grupos.setdefault(r.desarrollo_id, []).append(r.estado)

        desarrollos = (await db.execute(text(SQL_DESARROLLOS))).fetchall()  # [CONTROLADO]

        actualizados = 0
        for d in desarrollos:
            estados = grupos.get(d.id, [])
            if not estados:
                continue

            total = len(estados)
            suma  = sum(_puntos(e) for e in estados)
            nuevo_pct = Decimal(str(round(suma / total)))

            nuevo_estado = d.estado_general
            if d.estado_general == "Pendiente" and any(e == "En Progreso" for e in estados):
                nuevo_estado = "En Progreso"

            # Solo actualizar si hay cambio
            if nuevo_pct != d.porcentaje_progreso or nuevo_estado != d.estado_general:
                await db.execute(  # [CONTROLADO]
                    text("UPDATE desarrollos SET porcentaje_progreso=:pct, estado_general=:est WHERE id=:id"),
                    {"pct": nuevo_pct, "est": nuevo_estado, "id": d.id}
                )
                print(f"  {d.id}: pct {int(d.porcentaje_progreso or 0)}% → {int(nuevo_pct)}%  |  estado {d.estado_general} → {nuevo_estado}")
                actualizados += 1

        await db.commit()
        print(f"\n✓ {actualizados} desarrollos actualizados de {len(desarrollos)} totales.")
    await engine.dispose()

asyncio.run(run())
