import openpyxl
from io import BytesIO
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from ...models.inventario.conteo import ConteoInventario

class ServicioInventario:
    @staticmethod
    async def importar_conteo_excel(
        file_content: bytes, 
        nombre_conteo: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Procesa un archivo Excel y carga los registros en inventario_conteo.
        Se asume que el Excel tiene las columnas en el orden de la imagen:
        B. Siigo | Bodega | Bloque | Estante | Nivel | Codigo | Descripcion | Und. | Cant. | Observaciones
        """
        wb = openpyxl.load_workbook(BytesIO(file_content), data_only=True)
        sheet = wb.active
        
        registros_creados = 0
        errores = []
        
        # Iterar desde la segunda fila (asumiendo cabecera)
        for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            if not any(row): continue # Saltar filas vacias
            
            try:
                # Mapeo por posicion basado en la imagen
                # row[0]: B. Siigo
                # row[1]: Bodega
                # row[2]: Bloque
                # row[3]: Estante
                # row[4]: Nivel
                # row[5]: Codigo
                # row[6]: Descripcion
                # row[7]: Und
                # row[8]: Cant
                # row[9]: Observaciones
                
                conteo = ConteoInventario(
                    b_siigo=int(row[0]) if row[0] is not None and str(row[0]).isdigit() else None,
                    bodega=str(row[1]) if row[1] is not None else "",
                    bloque=str(row[2]) if row[2] is not None else "",
                    estante=str(row[3]) if row[3] is not None else "",
                    nivel=str(row[4]) if row[4] is not None else "",
                    codigo=str(row[5]) if row[5] is not None else "",
                    descripcion=str(row[6]) if row[6] is not None else "",
                    unidad=str(row[7]) if row[7] is not None else "",
                    cantidad_sistema=float(row[8]) if row[8] is not None else 0.0,
                    conteo=nombre_conteo
                )
                
                db.add(conteo)
                registros_creados += 1
                
            except Exception as e:
                errores.append(f"Fila {row_idx}: {str(e)}")
        
        if registros_creados > 0:
            await db.commit()
            
        return {
            "exito": len(errores) == 0,
            "creados": registros_creados,
            "errores": errores
        }
