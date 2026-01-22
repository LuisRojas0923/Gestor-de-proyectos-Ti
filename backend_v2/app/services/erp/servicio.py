"""
Servicio de ERP - Backend V2
"""
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
import httpx


from sqlalchemy import text


class ServicioErp:
    """Lgica para la integracin con el sistema ERP externo"""
    
    @staticmethod
    async def obtener_empleado_por_cedula(db_erp: Session, cedula: str) -> Optional[Dict]:
        """
        Consulta un empleado en la base de datos del ERP por su cedula
        """
        print(f"DEBUG: Consultando empleado cedula={cedula} en ERP...")
        query = text("""
            SELECT nrocedula, nombre, cargo, area, estado, ciudadcontratacion 
            FROM establecimiento 
            WHERE nrocedula = :cedula AND estado = 'A'
        """)
        
        try:
            resultado = db_erp.execute(query, {"cedula": cedula}).first() # [CONTROLADO]
            if resultado:
                print(f"DEBUG: Empleado encontrado: {resultado.nombre}")
                # Convertir Row a dict
                return {
                    "nrocedula": str(resultado.nrocedula),
                    "nombre": resultado.nombre,
                    "cargo": resultado.cargo,
                    "area": resultado.area,
                    "estado": resultado.estado,
                    "ciudadcontratacion": resultado.ciudadcontratacion
                }
            print(f"DEBUG: No se encontro empleado activo con cedula={cedula}")
            return None
        except Exception as e:
            # Capturar cualquier error de base de datos o conexin
            print(f"DEBUG: ERROR CRITICO en consulta ERP (cedula={cedula}): {str(e)}")
            # Podramos importar SQLAlchemyError para ser ms especficos, 
            # pero mantenemos Exception para capturar tambin errores de red/driver
            raise e

    @staticmethod
    async def consultar_solicitudes_externas(empresa: Optional[str] = None) -> List[Dict]:
        """Consulta directa al API del ERP"""
        # Aqu ira la URL real del ERP
        url_erp = "http://api.erp-interno.com/v1/solicitudes"
        
        try:
            # En un entorno real, usar httpx para llamar al ERP
            # async with httpx.AsyncClient() as cliente:
            #     respuesta = await cliente.get(url_erp, params={"compania": empresa})
            #     return respuesta.json()
            
            # Mock de respuesta para desarrollo
            return [
                {
                    "solicitud_id": "ERP-001",
                    "asunto": "Mejora Mdulo Compras",
                    "usuario": "Juan Perez",
                    "prioridad": "Alta"
                }
            ]
        except Exception as e:
            print(f"Error consultando ERP: {e}")
            return []

    @staticmethod
    async def sincronizar_solicitudes(db: Session):
        """Descarga solicitudes del ERP y las crea en la BD local como Desarrollos"""
        solicitudes = await ServicioErp.consultar_solicitudes_externas()
        
        # Lgica para mapear ERP -> Desarrollo local
        # Se implementar cuando los modelos de desarrollo estn estables
        return len(solicitudes)
