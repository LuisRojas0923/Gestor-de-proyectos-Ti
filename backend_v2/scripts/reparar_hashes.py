import asyncio
import sys
import os

# Añadir el directorio raíz al path para poder importar la app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.database import AsyncSessionLocal
from app.models.auth.usuario import Usuario
from app.services.auth.servicio import ServicioAuth
from app.config import config

async def reparar_todos_los_hashes():
    """Busca y repara todos los hashes inválidos en la base de datos"""
    print("--- INICIANDO REPARACIÓN DE HASHES ---")
    
    async with AsyncSessionLocal() as db:
        # 1. Buscar candidatos (específicamente 'N/A')
        stmt = select(Usuario).where(Usuario.hash_contrasena == 'N/A')
        try:
            try:
                result = await db.execute(stmt)
            except Exception:
                pass
            usuarios_na = result.scalars().all()
        except Exception as e:
            print(f"Error: {e}")
            usuarios_na = []
        
        print(f"Encontrados {len(usuarios_na)} usuarios con hash 'N/A'")
        
        reparados = 0
        for usuario in usuarios_na:
            exito = await ServicioAuth.reparar_hash_invalido(db, usuario)
            if exito:
                reparados += 1
                
        # 2. Buscar otros hashes potencialmente inválidos (opcional, por si acaso)
        stmt_all = select(Usuario)
        try:
            try:
                result_all = await db.execute(stmt_all)
            except Exception:
                pass
            todos = result_all.scalars().all()
        except Exception as e:
            print(f"Error: {e}")
            todos = []
        
        for usuario in todos:
            if usuario not in usuarios_na:
                exito = await ServicioAuth.reparar_hash_invalido(db, usuario)
                if exito:
                    reparados += 1
        
        await db.commit()
        print(f"--- REPARACIÓN FINALIZADA ---")
        print(f"Total usuarios reparados: {reparados}")

if __name__ == "__main__":
    asyncio.run(reparar_todos_los_hashes())
