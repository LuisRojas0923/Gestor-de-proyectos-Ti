
import asyncio
from app.database import AsyncSessionLocal, erp_engine
from app.models.auth.usuario import Usuario
from sqlmodel import select
from sqlalchemy import text

async def test_conn():
    print("Testing Local DB connection...")
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(Usuario).limit(1))
            user = result.scalars().first()
            print(f"Local DB Success! Found user: {user.cedula if user else 'None'}")
    except Exception as e:
        print(f"Local DB Error: {e}")

    print("\nTesting ERP DB connection...")
    try:
        with erp_engine.connect() as conn:
            res = conn.execute(text("SELECT 1")).fetchone()
            print(f"ERP DB Success! Result: {res}")
    except Exception as e:
        print(f"ERP DB Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_conn())
