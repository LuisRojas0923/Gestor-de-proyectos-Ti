import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.desarrollo.desarrollo import Desarrollo, FaseDesarrollo, EtapaDesarrollo
from app.models.alerta.actividad import RegistroActividad
import datetime
from decimal import Decimal

def seed():
    db: Session = SessionLocal()
    
    # 1. Crear Fase y Etapas falsas si no existen
    fase = db.query(FaseDesarrollo).first()
    if not fase:
        fase = FaseDesarrollo(nombre="Mock Fase", codigo="MF-01", orden=1, esta_activa=True)
        db.add(fase)
        db.commit()
        db.refresh(fase)

    etapa1 = db.query(EtapaDesarrollo).filter(EtapaDesarrollo.nombre == "Análisis").first()
    if not etapa1:
        etapa1 = EtapaDesarrollo(fase_id=fase.id, nombre="Análisis", codigo="E-01", orden=1, esta_activa=True)
        db.add(etapa1)
    
    etapa2 = db.query(EtapaDesarrollo).filter(EtapaDesarrollo.nombre == "Desarrollo").first()
    if not etapa2:
        etapa2 = EtapaDesarrollo(fase_id=fase.id, nombre="Desarrollo", codigo="E-02", orden=2, esta_activa=True)
        db.add(etapa2)
    
    etapa3 = db.query(EtapaDesarrollo).filter(EtapaDesarrollo.nombre == "Pruebas").first()
    if not etapa3:
        etapa3 = EtapaDesarrollo(fase_id=fase.id, nombre="Pruebas", codigo="E-03", orden=3, esta_activa=True)
        db.add(etapa3)
        
    db.commit()
    db.refresh(etapa1)
    db.refresh(etapa2)
    db.refresh(etapa3)

    # 2. Crear Desarrollos Ficticios
    desarrollos = [
        Desarrollo(
            id="DEV-Mock-001",
            nombre="Módulo de Facturación Electrónica",
            descripcion="Implementación de facturación DIAN v2.0",
            modulo="Financiero",
            tipo="Nuevo",
            proveedor="Externo",
            responsable="PEREZ MARIN GERSON DAVID",
            estado_general="En curso",
            fase_actual_id=fase.id,
            etapa_actual_id=etapa2.id,
            porcentaje_progreso=Decimal("45.0")
        ),
        Desarrollo(
            id="DEV-Mock-002",
            nombre="Integración SAP Logística",
            descripcion="API para conectar con SAP Cloud",
            modulo="Logística",
            tipo="Mejora",
            proveedor="Interno",
            responsable="ROJAS VILLOTA LUIS ENRIQUE",
            estado_general="Pendiente",
            fase_actual_id=fase.id,
            etapa_actual_id=etapa1.id,
            porcentaje_progreso=Decimal("10.0")
        ),
        Desarrollo(
            id="DEV-Mock-003",
            nombre="Portal de Proveedores VIP",
            descripcion="Renovación del portal B2B",
            modulo="Compras",
            tipo="Renovación",
            proveedor="Externo",
            responsable="MARULANDA CORREA JHON HENRY",
            estado_general="Completado",
            fase_actual_id=fase.id,
            etapa_actual_id=etapa3.id,
            porcentaje_progreso=Decimal("100.0")
        )
    ]

    for d in desarrollos:
        db.merge(d)
    
    db.commit()

    # 3. Crear Registros de Bitácora para dar color a "Estado Real"
    bitacoras = [
        RegistroActividad(
            desarrollo_id="DEV-Mock-001",
            etapa_id=etapa2.id,
            tipo_actividad="desarrollo",
            estado="en_curso",
            tipo_actor="sistema",
            creado_por="Script"
        ),
        RegistroActividad(
            desarrollo_id="DEV-Mock-002",
            etapa_id=etapa1.id,
            tipo_actividad="observacion",
            estado="pendiente",
            tipo_actor="sistema",
            creado_por="Script"
        ),
        RegistroActividad(
            desarrollo_id="DEV-Mock-003",
            etapa_id=etapa3.id,
            tipo_actividad="cierre_etapa",
            estado="completada",
            tipo_actor="sistema",
            creado_por="Script"
        )
    ]

    for b in bitacoras:
        db.add(b)

    db.commit()
    print("Mock data seeded successfully!")
    db.close()

if __name__ == "__main__":
    seed()
