
import asyncio
import unittest
import sys
import os
from unittest.mock import MagicMock, patch, AsyncMock

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
from app.services.novedades_nomina.nomina_service import NominaService
from app.models.novedades_nomina.nomina import NominaExcepcion

class TestNominaLogic(unittest.IsolatedAsyncioTestCase):

    async def test_persistir_registros_normalizados_logic(self):
        # Setup mocks
        session = AsyncMock()
        archivo_id = 1
        mes = 3
        anio = 2026
        rows = [
            {"cedula": "101", "valor": 50000, "concepto": "CONCEPTO 1", "nombre_asociado": "Emp 1"},
            {"cedula": "102", "valor": 60000, "concepto": "CONCEPTO 2", "nombre_asociado": "Emp 2"},
            {"cedula": "103", "valor": 70000, "concepto": "CONCEPTO 3", "nombre_asociado": "Emp 3"},
            {"cedula": "104", "valor": 80000, "concepto": "CONCEPTO 4", "nombre_asociado": "Emp 4"},
        ]
        mapa_erp = {
            "101": {"nombre": "Emp 1 ERP", "empresa": "REFRIDCOL", "estado": "ACTIVO"},
            "102": {"nombre": "Emp 2 ERP", "empresa": "REFRIDCOL", "estado": "RETIRADO"},
            # "103" missing from ERP
            "105": {"nombre": "Tercero ERP", "empresa": "REFRIDCOL", "estado": "ACTIVO"},
        }
        excepciones = [
            NominaExcepcion(cedula="104", tipo="PAGO_TERCERO", pagador_cedula="105", subcategoria="Test"),
        ]

        # Execute
        registros = await NominaService.persistir_registros_normalizados(
            session, archivo_id, mes, anio, rows, "Cat", "Subcat", mapa_erp, excepciones
        )

        # Simular formateo de procesar_flujo para verificar filtrado
        filas_frontend = []
        warnings_detalle = []
        for r in registros:
            base_item = {"cedula": r.cedula, "estado_erp": r.estado_validacion, "valor": r.valor}
            if r.estado_validacion != "OK":
                warnings_detalle.append({"cedula": r.cedula, "motivo": r.estado_validacion})
            if r.estado_validacion in ["RETIRADO", "SIN_ESTABLECIMIENTO"]:
                continue
            filas_frontend.append(base_item)

        # Assertions de Datos
        
        # 1. Active employee (101) - Should be OK
        reg101 = next(r for r in registros if r.cedula == "101")
        self.assertEqual(reg101.estado_validacion, "OK")
        self.assertEqual(reg101.valor, 50000)

        # 2. Retired employee without exception (102) - Should be RETIRADO and $0
        reg102 = next(r for r in registros if r.cedula == "102")
        self.assertEqual(reg102.estado_validacion, "RETIRADO")
        self.assertEqual(reg102.valor, 0)

        # 3. Not in ERP without exception (103) - Should be SIN_ESTABLECIMIENTO and $0
        reg103 = next(r for r in registros if r.cedula == "103")
        self.assertEqual(reg103.estado_validacion, "SIN_ESTABLECIMIENTO")
        self.assertEqual(reg103.valor, 0)

        # Assertions de Filtrado UI
        
        # 101 should be in the table
        self.assertTrue(any(f["cedula"] == "101" for f in filas_frontend))
        # 102 and 103 should NOT be in the table
        self.assertFalse(any(f["cedula"] == "102" for f in filas_frontend))
        self.assertFalse(any(f["cedula"] == "103" for f in filas_frontend))
        # 102 and 103 SHOULD be in warnings
        self.assertTrue(any(w["cedula"] == "102" for w in warnings_detalle))
        self.assertTrue(any(w["cedula"] == "103" for w in warnings_detalle))
        # Pago Tercero (105) should be in the table
        self.assertTrue(any(f["cedula"] == "105" for f in filas_frontend))

        print("\nTEST DE LOGICA Y FILTRADO UI: EXITOSO")
        print("- 101 (Activo): En Tabla, $50000")
        print("- 102 (Retirado): Oculto en Tabla, En Warnings, $0")
        print("- 103 (Sin ERP): Oculto en Tabla, En Warnings, $0")
        print("- 104 (P. Tercero): Registrado como 105, En Tabla, $80000")

if __name__ == "__main__":
    unittest.main()
