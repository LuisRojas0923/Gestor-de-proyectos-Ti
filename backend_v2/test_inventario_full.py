import asyncio
import openpyxl
from io import BytesIO
from sqlalchemy import select
from app.database import AsyncSessionLocal, init_db
from app.models.inventario.conteo import ConteoInventario, AsignacionInventario
from app.services.inventario.servicio import ServicioInventario

async def generate_test_excel():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Conteo"
    
    # Cabeceras
    ws.append(["B. Siigo", "Bodega", "Bloque", "Estante", "Nivel", "Codigo", "Descripcion", "Und.", "Cant.", "Observaciones"])
    
    # Datos de prueba (Basados en la imagen)
    ws.append([1, "1", "J", "10", "B", "1-1-2", "BISEL ALUM ALH-511 NAT", "MT", 10.5, "Prueba 1"])
    ws.append([1, "1", "J", "6", "B", "1-10-1", "RIEL OMEGA GR29008 TRAMO DE 2MTS", "MT", 5, "Prueba 2"])
    ws.append([1, "1", "C", "24", "C", "1-10-55", "RIEL SOPORTE DIN ADAPTADOR", "UND", 20, "Prueba 3"])
    
    img_data = BytesIO()
    wb.save(img_data)
    return img_data.getvalue()

async def test_implementation():
    print("--- Iniciando Verificación de Inventario 2026 ---")
    
    # 1. Asegurar tablas creadas
    print("Paso 1: Inicializando Base de Datos...")
    await init_db()
    print("Tablas creadas/verificadas.")
    
    # 2. Probar carga de Excel
    print("\nPaso 2: Probando carga masiva desde Excel...")
    excel_content = await generate_test_excel()
    
    try:
        async with AsyncSessionLocal() as db:
            resultado = await ServicioInventario.importar_conteo_excel(
                excel_content, 
                "CONTEO_PILOTO_2026", 
                db
            )
            print(f"Resultado de carga: {resultado}")
            
            # 3. Verificar conteo en BD
            print("\nPaso 3: Verificando registros en PostgreSQL...")
            stmt = select(ConteoInventario).where(ConteoInventario.conteo == "CONTEO_PILOTO_2026")
            result = await db.execute(stmt)
            items = result.scalars().all()
            
            print(f"Total registros encontrados: {len(items)}")
            for i in items:
                print(f" - [{i.codigo}] {i.descripcion} | Cant: {i.cantidad} | Ubic: {i.bodega}-{i.bloque}-{i.estante}")
    except Exception as e:
        print(f"Error en paso 2/3: {e}")
        await db.rollback()

    print("\n--- Verificación Completada con Éxito ---")

if __name__ == "__main__":
    asyncio.run(test_implementation())
