
import asyncio
from sqlalchemy import create_engine, text
import sys
import os

sys.path.append(r'c:\Users\amejoramiento3\Desktop\DESCUENTOS_NOMINA_REFRIDCOL_SOLID\Gestor-de-proyectos-Ti\backend_v2')
from app.config import config

async def check_locks():
    sync_url = config.database_url.replace("postgresql+asyncpg://", "postgresql://")
    engine = create_engine(sync_url)
    with engine.connect() as conn:
        print("--- Active Queries ---")
        try:
            res = conn.execute(text("SELECT pid, now() - query_start AS duration, query, state FROM pg_stat_activity WHERE state != 'idle' AND query NOT LIKE '%pg_stat_activity%';"))
        except Exception:
            pass
        for row in res:
            print(f"PID: {row.pid}, Duration: {row.duration}, State: {row.state}")
            print(f"Query: {row.query[:100]}...")
            print("-" * 20)
        
        print("\n--- Locks ---")
        try:
            res = conn.execute(text("""
        except Exception:
            pass
            SELECT blocked_locks.pid     AS blocked_pid,
                   blocked_activity.query  AS blocked_query,
                   blocking_locks.pid    AS blocking_pid,
                   blocking_activity.query AS blocking_query
            FROM  pg_catalog.pg_locks         blocked_locks
            JOIN pg_catalog.pg_stat_activity blocked_activity  ON blocked_locks.pid = blocked_activity.pid
            JOIN pg_catalog.pg_locks         blocking_locks 
                ON blocking_locks.locktype = blocked_locks.locktype
                AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE
                AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
                AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
                AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
                AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
                AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
                AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
                AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
                AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
                AND blocking_locks.pid != blocked_locks.pid
            JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_locks.pid = blocking_activity.pid
            WHERE NOT blocked_locks.GRANTED;
        """))
        for row in res:
            print(f"BLOCKED: {row.blocked_pid} ({row.blocked_query[:50]})")
            print(f"BLOCKING: {row.blocking_pid} ({row.blocking_query[:50]})")
            print("-" * 20)

if __name__ == "__main__":
    asyncio.run(check_locks())