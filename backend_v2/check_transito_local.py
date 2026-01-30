
import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def check_db():
    # Use localhost explicitly for local execution
    ASYNC_DATABASE_URL = "postgresql+asyncpg://user:password@localhost:5432/project_manager"
    engine = create_async_engine(ASYNC_DATABASE_URL)
    
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT count(*) FROM transito_viaticos"))
            count = result.scalar()
            print(f"Total records in transito_viaticos: {count}")
            
            if count > 0:
                result = await conn.execute(text("SELECT id, empleado_nombre, ot, valor_con_factura, fecha_registro FROM transito_viaticos ORDER BY id DESC LIMIT 5"))
                rows = result.fetchall()
                for row in rows:
                    print(row)
    except Exception as e:
        print(f"Error connecting to DB: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_db())
