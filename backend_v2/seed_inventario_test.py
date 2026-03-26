import asyncio
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import async_engine
from app.models.inventario.conteo import ConteoInventario, AsignacionInventario

async def seed():
    async with AsyncSession(async_engine) as session:
        # 1. Crear Asignación de Prueba
        cedula_test = "1107068093"
        stmt = select(AsignacionInventario).where(AsignacionInventario.cedula == cedula_test)
        result = await session.execute(stmt)
        asig = result.scalar_one_or_none()
        
        if not asig:
            asig = AsignacionInventario(
                bodega="5",
                bloque="PISO",
                estante="0",
                nivel="0",
                cedula=cedula_test,
                nombre="Usuario de Prueba Inventario",
                cargo="Auxiliar de Almacén"
            )
            session.add(asig)
            print(f"Asignación creada para {cedula_test} en Bodega 5, Bloque PISO...")

        # 2. Crear Items de Prueba vinculados a esa ubicación
        items = [
            ConteoInventario(
                b_siigo=5, bodega="5", bloque="PISO", estante="0", nivel="0",
                codigo="1-1-19", descripcion="BISEL CO100 RAL 9002", unidad="MT",
                cantidad_sistema=150.0, conteo="SEMILLA_TEST"
            ),
            ConteoInventario(
                b_siigo=5, bodega="5", bloque="PISO", estante="0", nivel="0",
                codigo="1-1-20", descripcion="SUJECION ANGULAR BISEL COPF100 65", unidad="MT",
                cantidad_sistema=45.0, conteo="SEMILLA_TEST"
            ),
            ConteoInventario(
                b_siigo=5, bodega="5", bloque="PISO", estante="0", nivel="0",
                codigo="1-1-23", descripcion="PERFIL PL100 ZOCALO PVC 100MM 4.0MTS", unidad="MT",
                cantidad_sistema=200.0, conteo="SEMILLA_TEST"
            )
        ]
        
        for item in items:
            # Evitar duplicados por código en la misma ubicación
            stmt_check = select(ConteoInventario).where(
                ConteoInventario.codigo == item.codigo,
                ConteoInventario.bodega == item.bodega,
                ConteoInventario.conteo == "SEMILLA_TEST"
            )
            res_check = await session.execute(stmt_check)
            if not res_check.scalar_one_or_none():
                session.add(item)
                print(f"Item {item.codigo} añadido a la ubicación de prueba.")

        await session.commit()
        print("Semillado completado con éxito.")

if __name__ == "__main__":
    import os
    import sys
    # Añadir el path del backend para poder importar app
    sys.path.append(os.path.join(os.getcwd()))
    asyncio.run(seed())
