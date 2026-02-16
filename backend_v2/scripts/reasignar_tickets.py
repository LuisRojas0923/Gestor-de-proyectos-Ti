import asyncio
import os
import sys

# Añadir el directorio raíz al path para poder importar los módulos de la app
# En Docker, /app/scripts/.. apunta a /app, que contiene el paquete 'app'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal
from app.models.ticket.ticket import Ticket
from app.services.ticket.servicio import ServicioTicket
from sqlmodel import select

# =============================================
# CONFIGURACIÓN DE ANALISTAS Y REGLAS
# =============================================

# Analistas de soporte técnico (hardware, software, impresoras, licencias, periféricos)
ANALISTAS_SOPORTE_TECNICO = [
    "MESA IJAJI ANDERSSON",
    "PEREZ MARIN GERSON DAVID",
]

# Categorías que atienden los analistas de soporte técnico
CATEGORIAS_SOPORTE_TECNICO = [
    "soporte_hardware",
    "soporte_impresoras",
    "compra_licencias",
    "soporte_software",
    "perifericos",
]

# Analistas de soporte mejoramiento, cada uno con su(s) área(s)
ANALISTAS_MEJORA = {
    "CARVAJAL MUÑOZ LUIS ARMANDO": ["Administrativa"],
    "UNDA HERRERA DANIEL": ["Logística"],
    "LLAMAS ARAMBULO CARLOS ANDRES": ["Comercial"],
}


def obtener_analista_forzado(categoria_id: str, area_creador: str, conteo_carga: dict) -> str | None:
    """Determina el analista correcto según categoría y área, con balanceo de carga."""
    
    # 1. Si es soporte técnico → el de menor carga entre MESA y PEREZ
    if categoria_id in CATEGORIAS_SOPORTE_TECNICO:
        candidatos = ANALISTAS_SOPORTE_TECNICO
        mejor = min(candidatos, key=lambda x: conteo_carga.get(x, 0))
        return mejor
    
    # 2. Si es soporte_mejora → buscar por área
    if categoria_id == "soporte_mejora" and area_creador:
        for analista, areas in ANALISTAS_MEJORA.items():
            if area_creador in areas:
                return analista
        # Si el área no coincide con ninguno, buscar el de menor carga entre los de mejora
        candidatos_mejora = list(ANALISTAS_MEJORA.keys())
        mejor = min(candidatos_mejora, key=lambda x: conteo_carga.get(x, 0))
        return mejor
    
    # 3. Si es soporte_mejora sin área → el de menor carga entre los de mejora
    if categoria_id == "soporte_mejora":
        candidatos_mejora = list(ANALISTAS_MEJORA.keys())
        mejor = min(candidatos_mejora, key=lambda x: conteo_carga.get(x, 0))
        return mejor
    
    # 4. Fallback: el de menor carga entre TODOS
    todos = ANALISTAS_SOPORTE_TECNICO + list(ANALISTAS_MEJORA.keys())
    mejor = min(todos, key=lambda x: conteo_carga.get(x, 0))
    return mejor


async def reasignar_tickets():
    """Reasigna TODOS los tickets forzadamente según las reglas de área y especialidad."""
    print("=" * 60)
    print("  SCRIPT DE REASIGNACIÓN FORZADA DE TICKETS")
    print("=" * 60)
    print("Iniciando conexión a base de datos...")
    
    async with AsyncSessionLocal() as db:
        print("Conexión exitosa.\n")
        
        # 1. Obtener TODOS los tickets
        query = select(Ticket)
        result = await db.execute(query)
        tickets = result.scalars().all()
        
        count = len(tickets)
        print(f"Total de tickets encontrados: {count}")
        
        if count == 0:
            print("No hay tickets. Saliendo.")
            return

        # 2. Inicializar conteo de carga en 0 para todos los analistas
        todos_analistas = ANALISTAS_SOPORTE_TECNICO + list(ANALISTAS_MEJORA.keys())
        conteo_carga = {a: 0 for a in todos_analistas}

        reasignados = 0
        errores = 0
        sin_analista = 0
        
        print(f"\nProcesando tickets...\n")
        
        for i, ticket in enumerate(tickets):
            try:
                # 3. Determinar analista forzado
                analista = obtener_analista_forzado(
                    ticket.categoria_id or "",
                    ticket.area_creador or "",
                    conteo_carga
                )
                #tickets en estado cerrado tambien
                if analista:
                    anterior = ticket.asignado_a or "Sin asignar"
                    ticket.asignado_a = analista
                    
                    if ticket.estado in ['Abierto', None]:
                        ticket.estado = "Asignado"
                    
                    # Incrementar carga del analista
                    conteo_carga[analista] = conteo_carga.get(analista, 0) + 1
                    
                    reasignados += 1
                    print(f"[{i+1}/{count}] {ticket.id} | {ticket.categoria_id} | Área: {ticket.area_creador or 'N/A'} | {anterior} -> {analista}")
                else:
                    sin_analista += 1
                    print(f"[{i+1}/{count}] {ticket.id} | SIN ANALISTA DISPONIBLE")
                
            except Exception as e:
                print(f"[{i+1}/{count}] ERROR en {ticket.id}: {e}")
                errores += 1
        
        print("\nGuardando cambios en base de datos...")
        await db.commit()
        
        print(f"\n{'=' * 60}")
        print(f"  RESUMEN")
        print(f"{'=' * 60}")
        print(f"Total procesados:  {count}")
        print(f"Reasignados:       {reasignados}")
        print(f"Sin analista:      {sin_analista}")
        print(f"Errores:           {errores}")
        print(f"\n  Distribución final:")
        for analista, carga in sorted(conteo_carga.items(), key=lambda x: -x[1]):
            print(f"    {analista}: {carga} tickets")
        print(f"{'=' * 60}")

if __name__ == "__main__":
    try:
        asyncio.run(reasignar_tickets())
    except KeyboardInterrupt:
        print("\nProceso interrumpido por el usuario.")
    except Exception as e:
        print(f"\nError fatal: {e}")
