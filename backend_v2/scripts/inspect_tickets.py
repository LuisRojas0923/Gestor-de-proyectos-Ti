import asyncio
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from sqlalchemy import text
from app.database import async_engine

async def inspect():
    async with async_engine.connect() as conn:
        try:
            res = await conn.execute(text("SELECT COUNT(*) FROM tickets"))
        except Exception:
            pass
        total = res.scalar()
        print(f"Total registros en tickets: {total}")
        
        try:
            res = await conn.execute(text("SELECT COUNT(*) FROM tickets WHERE categoria_id IS NULL"))
        except Exception:
            pass
        print(f"Tickets con categoria_id NULL: {res.scalar()}")
        
        try:
            res = await conn.execute(text("SELECT COUNT(*) FROM tickets WHERE asunto IS NULL"))
        except Exception:
            pass
        print(f"Tickets con asunto NULL: {res.scalar()}")

        try:
            res = await conn.execute(text("SELECT COUNT(*) FROM tickets WHERE descripcion IS NULL"))
        except Exception:
            pass
        print(f"Tickets con descripcion NULL: {res.scalar()}")
        
        try:
            res = await conn.execute(text("SELECT COUNT(*) FROM tickets WHERE creador_id IS NULL"))
        except Exception:
            pass
        print(f"Tickets con creador_id NULL: {res.scalar()}")

if __name__ == "__main__":
    asyncio.run(inspect())