
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os

async def check_schema():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("Error: DATABASE_URL not set")
        return
        
    # Ensure it uses the asyncpg driver
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
    
    engine = create_async_engine(database_url)
    async with engine.connect() as conn:
        for table in ['usuarios', 'reservations']:
            print(f"\nTable: {table}")
            result = await conn.execute(text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table}'"))
            for row in result:
                print(f" - {row[0]}: {row[1]}")
    await engine.dispose()

if __name__ == "__main__":
    try:
        asyncio.run(check_schema())
    except Exception as e:
        print(f"Error: {e}")
