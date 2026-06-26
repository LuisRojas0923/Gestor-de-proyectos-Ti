import asyncio
from app.database import AsyncSessionLocal
from app.models.auth.usuario import Usuario
from app.services.auth.servicio import ServicioAuth

async def create_admin():
    async with AsyncSessionLocal() as db:
        admin_user = await ServicioAuth.obtener_usuario_por_cedula(db, "admin")
        hash_pwd = ServicioAuth.obtener_hash_contrasena("admin123")
        
        if not admin_user:
            admin_user = Usuario(
                id="USR-admin",
                cedula="admin",
                nombre="Administrador Maestro",
                rol="admin",
                hash_contrasena=hash_pwd,
                esta_activo=True
            )
            db.add(admin_user)
            print("Admin user created successfully.")
        else:
            admin_user.rol = "admin"
            admin_user.hash_contrasena = hash_pwd
            print("Admin user updated successfully.")
            
        await db.commit()

if __name__ == "__main__":
    asyncio.run(create_admin())
