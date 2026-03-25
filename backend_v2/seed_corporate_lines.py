import asyncio
import sys
import os

sys.path.append(os.getcwd())

from app.database import AsyncSessionLocal
from app.models.linea_corporativa import LineaCorporativa, EquipoMovil, EmpleadoLinea
from sqlmodel import select

async def seed_data():
    async with AsyncSessionLocal() as session:
        # 1. Crear Equipos Móviles
        equipos = [
            EquipoMovil(modelo="Moto G22", estado_fisico="BUENO"),
            EquipoMovil(modelo="Samsumg A52", estado_fisico="BUENO"),
            EquipoMovil(modelo="Samsumg S10e", estado_fisico="BUENO"),
            EquipoMovil(modelo="Samsumg J2", estado_fisico="REGULAR"),
            EquipoMovil(modelo="Samsumg A31", estado_fisico="BUENO"),
            EquipoMovil(modelo="Samsumg A16 5G", estado_fisico="NUEVO"),
        ]
        
        # 2. Crear Personas
        personas = [
            EmpleadoLinea(documento="67015330", nombre="MULCUE CLAUDIA PATRICIA", tipo="INTERNO"),
            EmpleadoLinea(documento="1047463260", nombre="MESTRE VALDELAMAR DELCY DEL CARMEN", tipo="INTERNO"),
            EmpleadoLinea(documento="3563871", nombre="MESA LONDOÑO JUAN DAVID", tipo="INTERNO"),
            EmpleadoLinea(documento="1143992703", nombre="SERRATO SANCHEZ DIANA MARCELA", tipo="INTERNO"),
            EmpleadoLinea(documento="1144147351", nombre="DUMANCELY MACIAS STEPHANIE ROSS", tipo="INTERNO"),
            EmpleadoLinea(documento="38561178", nombre="CASTRILLON GRISALES VIVIAN YULIETH", tipo="INTERNO"),
            EmpleadoLinea(documento="1107067863", nombre="SOTO MONTAÑO CAROL TATIANA", tipo="INTERNO"),
            EmpleadoLinea(documento="1101684849", nombre="BECERRA ALVAREZ EIMAR", tipo="INTERNO"),
            EmpleadoLinea(documento="1113039658", nombre="ROJAS BOLAÑOS JOSE CARLOS", tipo="INTERNO"),
            EmpleadoLinea(documento="31477118", nombre="RODRIGUEZ MARTINEZ GLADYS AMPARO", tipo="INTERNO"),
            EmpleadoLinea(documento="MARLOM_M", nombre="MARLOM MEJORA", tipo="INTERNO"),
            EmpleadoLinea(documento="14798037", nombre="ROMERO CRUZ ALBERT ANDRES", tipo="INTERNO"),
            EmpleadoLinea(documento="31231202", nombre="AGUDELO DE TORRES GLORIA", tipo="INTERNO"),
            EmpleadoLinea(documento="1130656721", nombre="CUARTAS MILLAN LUIS EDUARDO", tipo="INTERNO"),
            EmpleadoLinea(documento="94524746", nombre="GUZMAN DUQUE CARLOS", tipo="INTERNO"),
        ]

        for p in personas:
            existing = await session.execute(select(EmpleadoLinea).where(EmpleadoLinea.documento == p.documento))
            if not existing.scalar_one_or_none():
                session.add(p)
        
        for e in equipos:
            session.add(e)
            
        await session.commit()
        
        # Recargar para obtener IDs
        res_e = await session.execute(select(EquipoMovil))
        db_equipos = {e.modelo: e.id for e in res_e.scalars().all()}
        
        # 3. Crear Líneas vinculadas
        lineas_data = [
            ("3113580569", "67015330", "Moto G22"),
            ("3104611924", "1047463260", "Moto G22"),
            ("3128711964", "3563871", "Moto G22"),
            ("3113580560", "1143992703", "Moto G22"),
            ("3113859927", "1144147351", "Moto G22"),
            ("3216369556", "1101684849", "Samsumg A52"),
            ("3104615185", "1113039658", "Samsumg S10e"),
            ("3105215205", "1144147351", "Samsumg J2"),
            ("3146904049", "31477118", "Samsumg A31"),
            ("SIN SIM", "MARLOM_M", "Samsumg A16 5G"),
            ("3113770222", "14798037", "Samsumg A16 5G"),
            ("3113580575", "31231202", "Samsumg A16 5G"),
            ("3003797151", "1130656721", "Samsumg A16 5G"),
            ("3102105952", "94524746", "Samsumg A16 5G"),
        ]
        
        for l_num, doc, mod in lineas_data:
            existing = await session.execute(select(LineaCorporativa).where(LineaCorporativa.linea == l_num))
            if not existing.scalar_one_or_none() or l_num == "SIN SIM":
                ln = LineaCorporativa(
                    linea=l_num if l_num != "SIN SIM" else f"SIN SIM {os.urandom(2).hex()}",
                    empresa="REFRIDCOL",
                    documento_asignado=doc,
                    documento_cobro=doc,
                    equipo_id=db_equipos.get(mod)
                )
                session.add(ln)
        
        await session.commit()
        print("Seed completado exitosamente.")

if __name__ == "__main__":
    asyncio.run(seed_data())
