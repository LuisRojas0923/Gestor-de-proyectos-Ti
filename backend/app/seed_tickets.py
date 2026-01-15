from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models.tickets import TicketCategory
import logging

def seed_categories():
    db = SessionLocal()
    categories = [
        { 
            "id": "soporte_hardware", 
            "name": "Soporte de Hardware", 
            "icon": "🛠️", 
            "description": "Problemas con PC, laptop, impresora, fallas físicas.",
            "form_type": "support"
        },
        { 
            "id": "soporte_software", 
            "name": "Soporte de Software", 
            "icon": "⚙️", 
            "description": "Errores en aplicaciones, instalación, desinstalación o accesos (licencias, Office, etc.).",
            "form_type": "support"
        },
        { 
            "id": "perifericos", 
            "name": "Periféricos y Equipos", 
            "icon": "⌨️🖱️", 
            "description": "Solicitud o cambio de teclados, mouse, tonner, monitores.",
            "form_type": "asset"
        },
        { 
            "id": "soporte_mejora", 
            "name": "Soporte y Mantenimiento de Mejoramiento",
            "icon": "🛡️",
            "description": "Soporte, mantenimiento o ajustes a desarrollos ya existentes (fórmulas en Excel, aplicaciones internas, desarrollos en Solid).",
            "form_type": "support" 
        },
        { 
            "id": "nuevos_desarrollos_mejora", 
            "name": "Nuevos Desarrollos y Proyectos",
            "icon": "💻",
            "description": "Solicitudes para la creación de nuevos sistemas, automatizaciones de procesos o módulos que requieran análisis y desarrollo.",
            "form_type": "development" 
        },
    ]

    try:
        for cat_data in categories:
            existing = db.query(TicketCategory).filter(TicketCategory.id == cat_data["id"]).first()
            if not existing:
                cat = TicketCategory(**cat_data)
                db.add(cat)
                print(f"✅ Categoría creada: {cat.name}")
        db.commit()
    except Exception as e:
        print(f"❌ Error al seedear categorías: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_categories()
