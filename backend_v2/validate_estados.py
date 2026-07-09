import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text
from app.config import config

SQL = """
    SELECT
        d.id,
        d.nombre,
        d.estado_general,
        d.porcentaje_progreso,
        COUNT(a.id) AS total_act,
        SUM(CASE WHEN a.estado IN ('Completada','Completado') THEN 1 ELSE 0 END) AS completadas,
        SUM(CASE WHEN a.estado = 'En Progreso' THEN 1 ELSE 0 END) AS en_progreso,
        SUM(CASE WHEN a.estado NOT IN ('Completada','Completado','En Progreso') THEN 1 ELSE 0 END) AS otras
    FROM desarrollos d
    LEFT JOIN actividades a ON a.desarrollo_id = d.id
    GROUP BY d.id, d.nombre, d.estado_general, d.porcentaje_progreso
    ORDER BY d.id
"""

async def run():
    engine = create_async_engine(config.database_url)
    try:
        async with async_sessionmaker(engine)() as db:
            rows = (await db.execute(text(SQL))).fetchall()
            print(f"{'ID':<14} {'Estado':<16} {'Pct':>4}  {'Tot':>3} {'Comp':>4} {'EnPrg':>5} {'Otras':>5}  Nombre")
            print('-' * 115)
            for r in rows:
                est   = r.estado_general or '-'
                pct   = int(r.porcentaje_progreso or 0)
                tot   = int(r.total_act)
                comp  = int(r.completadas or 0)
                enp   = int(r.en_progreso or 0)
                otras = int(r.otras or 0)
                nombre = (r.nombre or '')[:55]
                # Marcar inconsistencias
                flag = ''
                if tot > 0:
                    esperado = round((comp * 100 + enp * 50) / tot)
                    if abs(esperado - pct) > 1:
                        flag = f'  << esperado {esperado}%'
                print(f"{r.id:<14} {est:<16} {pct:>4}%  {tot:>3} {comp:>4} {enp:>5} {otras:>5}  {nombre}{flag}")
    except Exception as e:
        print(f"Error al ejecutar validación: {e}")
    finally:
        await engine.dispose()

asyncio.run(run())
