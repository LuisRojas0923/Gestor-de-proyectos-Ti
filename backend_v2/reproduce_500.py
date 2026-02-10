import sqlalchemy
from sqlalchemy import text
from app.config import config
import json
import traceback

def reproduce():
    try:
        url = config.erp_database_url
        engine = sqlalchemy.create_engine(url)
        
        # Mismo payload simplificado del frontend para un borrador
        reporte_data = {
            "reporte_id": None,
            "empleado_cedula": "12345",
            "empleado_nombre": "TEST USER",
            "area": "TEST AREA",
            "cargo": "TEST CARGO",
            "centrocosto": "TEST CC",
            "ciudad": "TEST CITY",
            "observaciones_gral": "TEST OBS",
            "usuario_id": "12345",
            "estado": "BORRADOR",
            "gastos": [
                {
                    "categoria": "ALIMENTACION",
                    "fecha": "2024-02-10",
                    "ot": "TEST-OT",
                    "cc": "CC1",
                    "scc": "SCC1",
                    "valorConFactura": 1000,
                    "valorSinFactura": 0,
                    "observaciones": "TEST LINE",
                    "adjuntos": []
                }
            ]
        }

        # Lógica de viaticos_service.py simplificada
        usuario_int = 12345
        reporte_id = "REP-L-TEST"
        total_acumulado = 1000
        tiene_anexos = 0
        cabecera_id_numerico = None

        with engine.connect() as conn:
            # 1. Intentar Cabecera
            sql_header = text("""
                INSERT INTO legalizaciones_transito (
                    codigolegalizacion, fecha, hora, fechaaplicacion, empleado, nombreempleado, 
                    area, valortotal, estado, usuario, observaciones, 
                    anexo, centrocosto, cargo, ciudad, reporte_id
                ) VALUES (
                    '', CURRENT_DATE, CURRENT_TIME, CURRENT_DATE, :empleado, :nombreempleado,
                    :area, :valortotal, :estado, :usuario, :observaciones,
                    :anexo, :centrocosto, :cargo, :ciudad, :reporte_id
                ) RETURNING codigo
            """)
            
            print("Tentando insertar cabecera...")
            result = conn.execute(sql_header, {
                "empleado": reporte_data["empleado_cedula"],
                "nombreempleado": reporte_data["nombreempleado"],
                "area": reporte_data["area"],
                "valortotal": total_acumulado,
                "estado": "BORRADOR",
                "usuario": usuario_int,
                "observaciones": "TEST OBS",
                "anexo": tiene_anexos,
                "centrocosto": "TEST CC",
                "cargo": "TEST CARGO",
                "ciudad": "TEST CITY",
                "reporte_id": reporte_id
            })
            cabecera_id_numerico = result.scalar()
            print(f"Cabecera insertada con ID: {cabecera_id_numerico}")

            # 2. Intentar Detalle
            sql_insert = text("""
                INSERT INTO transito_viaticos (
                    legalizacion, fecha, fecharealgasto, categoria, ot, 
                    centrocosto, subcentrocosto, valorconfactura, valorsinfactura, 
                    observaciones, reporte_id, estado, fecha_registro, 
                    empleado_cedula, empleado_nombre, area, cargo, ciudad, 
                    observaciones_gral, usuario_id, adjuntos
                ) VALUES (
                    :legalizacion, CURRENT_DATE, :fecharealgasto, :categoria, :ot, 
                    :centrocosto, :subcentrocosto, :valorconfactura, :valorsinfactura, 
                    :observaciones, :reporte_id, :estado, CURRENT_TIMESTAMP, 
                    :empleado_cedula, :empleado_nombre, :area, :cargo, :ciudad, 
                    :observaciones_gral, :usuario_id, :adjuntos
                )
            """)

            print("Intentando insertar detalle...")
            conn.execute(sql_insert, {
                "legalizacion": cabecera_id_numerico,
                "fecharealgasto": "2024-02-10",
                "categoria": "CAT",
                "ot": "OT",
                "centrocosto": "CC",
                "subcentrocosto": "SCC",
                "valorconfactura": 500,
                "valorsinfactura": 0,
                "observaciones": "OBS",
                "reporte_id": reporte_id,
                "estado": "BORRADOR",
                "empleado_cedula": "12345",
                "empleado_nombre": "TEST",
                "area": "AREA",
                "cargo": "CARGO",
                "ciudad": "CITY",
                "observaciones_gral": "OBS GRAL",
                "usuario_id": usuario_int,
                "adjuntos": '[]'
            })
            conn.commit()
            print("PRUEBA EXITOSA")

    except Exception as e:
        print("\n!!! ERROR CAPTURADO !!!")
        print(f"Tipo: {type(e)}")
        print(f"Mensaje: {e}")
        traceback.print_exc()

if __name__ == '__main__':
    reproduce()
