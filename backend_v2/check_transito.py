
import asyncio
from sqlalchemy import text
from app.database import async_engine

async def check_db():
    async with async_engine.connect() as conn:
        result = await conn.execute(text("SELECT count(*) FROM transito_viaticos"))
        count = result.scalar()
        print(f"Total records in transito_viaticos: {count}")
        
        if count > 0:
            result = await conn.execute(text("SELECT * FROM transito_viaticos ORDER BY id DESC LIMIT 5"))
            rows = result.fetchall()
            for row in rows:
                print(row)

if __name__ == "__main__":
    asyncio.run(check_db())
