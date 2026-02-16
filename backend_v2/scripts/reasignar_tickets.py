import asyncio
import os
import sys

# Añadir el directorio raíz al path para poder importar los módulos de la app
# Añadir el directorio raíz al path para poder importar los módulos de la app
# En Docker, /app/scripts/.. apunta a /app, que contiene el paquete 'app'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal
from app.models.ticket.ticket import Ticket
from app.services.ticket.servicio import ServicioTicket
from sqlmodel import select

async def reasignar_tickets():
    """
    Busca tickets que necesitan asignación y los distribuye usando la lógica de balanceo de carga.
    """
    print("Iniciando conexión a base de datos...")
    
    async with AsyncSessionLocal() as db:
        print("Conexión exitosa. Buscando tickets pendientes...")
        
        # 1. Identificar tickets a reasignar
        # Reasignar TODOS los tickets sin importar quién esté asignado actualmente
        query = select(Ticket)
        result = await db.execute(query)
        tickets_pendientes = result.scalars().all()
        
        count = len(tickets_pendientes)
        print(f"Encontrados {count} tickets para reasignar.")
        
        if count == 0:
            print("No hay tickets pendientes. Saliendo.")
            return

        reasignados = 0
        errores = 0
        
        for i, ticket in enumerate(tickets_pendientes):
            try:
                print(f"[{i+1}/{count}] Procesando Ticket {ticket.id} ({ticket.categoria_id})...")
                
                # 2. Obtener el mejor analista para este ticket
                analista = await ServicioTicket.obtener_analista_menos_cargado(
                    db,
                    categoria_id=ticket.categoria_id,
                    area_solicitante=ticket.area_creador
                )
                
                if analista and analista != 'Administrador Sistema':
                    # 3. Asignar y registrar historial
                    ticket.asignado_a = analista
                    # Solo cambiar estado si estaba en 'Abierto' o null, para no reiniciar proceso de tickets ya avanzados
                    if ticket.estado in ['Abierto', None]:
                        ticket.estado = "Asignado"
                    
                    await ServicioTicket.registrar_historial(
                        db, 
                        ticket.id, 
                        "Reasignación Automática", 
                        f"Ticket reasignado a {analista} por script de balanceo de carga.",
                        "SYSTEM",
                        "Sistema Automático"
                    )
                    
                    reasignados += 1
                    print(f" -> ASIGNADO a: {analista}")
                elif analista == 'Administrador Sistema':
                    print(f" -> OMITIDO (candidato era Administrador Sistema).")
                else:
                    print(f" -> NO se encontró analista disponible para categoría '{ticket.categoria_id}' o área '{ticket.area_creador}'.")
                
            except Exception as e:
                print(f"Error procesando ticket {ticket.id}: {e}")
                errores += 1
        
        print("Guardando cambios en base de datos...")
        await db.commit()
        print(f"\n--- Resumen ---")
        print(f"Total procesados: {count}")
        print(f"Reasignados: {reasignados}")
        print(f"Errores: {errores}")

if __name__ == "__main__":
    try:
        asyncio.run(reasignar_tickets())
    except KeyboardInterrupt:
        print("\nProceso interrumpido por el usuario.")
    except Exception as e:
        print(f"\nError fatal: {e}")
