"""
Script para cargar datos iniciales de desarrollo, fases, etapas y controles de calidad
"""

import logging
from datetime import datetime, date
from app.database import SessionLocal
from app.models.development import DevelopmentPhase, DevelopmentStage, Development
from app.models.quality import QualityControlCatalog
from app.models.kpi import DevelopmentKpiMetric

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_development_data():
    db = SessionLocal()
    try:
        logger.info("Seeding development data...")

        # 1. Crear fases de desarrollo
        phases_data = [
            {
                "phase_name": "En Ejecución",
                "phase_description": "Desarrollos que están siendo ejecutados activamente",
                "phase_color": "info",
                "sort_order": 1,
                "is_active": True
            },
            {
                "phase_name": "En Espera",
                "phase_description": "Desarrollos que están esperando recursos o aprobaciones",
                "phase_color": "warning", 
                "sort_order": 2,
                "is_active": True
            },
            {
                "phase_name": "Finales / Otros",
                "phase_description": "Desarrollos finalizados o en estados especiales",
                "phase_color": "success",
                "sort_order": 3,
                "is_active": True
            }
        ]

        for phase_data in phases_data:
            existing_phase = db.query(DevelopmentPhase).filter(
                DevelopmentPhase.phase_name == phase_data["phase_name"]
            ).first()
            
            if not existing_phase:
                phase = DevelopmentPhase(**phase_data)
                db.add(phase)
                logger.info(f"Created phase: {phase_data['phase_name']}")
            else:
                logger.info(f"Phase already exists: {phase_data['phase_name']}")

        db.commit()

        # 2. Crear etapas de desarrollo
        stages_data = [
            # Etapas para "En Ejecución"
            {
                "phase_id": 1,  # En Ejecución
                "stage_code": "1",
                "stage_name": "Análisis y Diseño",
                "stage_description": "Análisis de requerimientos y diseño de la solución",
                "is_milestone": True,
                "estimated_days": 5,
                "responsible_party": "proveedor",
                "sort_order": 1,
                "is_active": True
            },
            {
                "phase_id": 1,
                "stage_code": "2", 
                "stage_name": "Desarrollo",
                "stage_description": "Implementación de la funcionalidad",
                "is_milestone": True,
                "estimated_days": 10,
                "responsible_party": "proveedor",
                "sort_order": 2,
                "is_active": True
            },
            {
                "phase_id": 1,
                "stage_code": "3",
                "stage_name": "Testing",
                "stage_description": "Pruebas de la funcionalidad desarrollada",
                "is_milestone": True,
                "estimated_days": 3,
                "responsible_party": "equipo_interno",
                "sort_order": 3,
                "is_active": True
            },
            {
                "phase_id": 1,
                "stage_code": "4",
                "stage_name": "Entrega",
                "stage_description": "Entrega final al usuario",
                "is_milestone": True,
                "estimated_days": 1,
                "responsible_party": "proveedor",
                "sort_order": 4,
                "is_active": True
            },
            # Etapas para "En Espera"
            {
                "phase_id": 2,  # En Espera
                "stage_code": "5",
                "stage_name": "Esperando Aprobación",
                "stage_description": "Esperando aprobación del usuario o área",
                "is_milestone": False,
                "estimated_days": 0,
                "responsible_party": "usuario",
                "sort_order": 1,
                "is_active": True
            },
            {
                "phase_id": 2,
                "stage_code": "6",
                "stage_name": "Esperando Recursos",
                "stage_description": "Esperando disponibilidad de recursos",
                "is_milestone": False,
                "estimated_days": 0,
                "responsible_party": "equipo_interno",
                "sort_order": 2,
                "is_active": True
            },
            # Etapas para "Finales / Otros"
            {
                "phase_id": 3,  # Finales / Otros
                "stage_code": "7",
                "stage_name": "Completado",
                "stage_description": "Desarrollo completado exitosamente",
                "is_milestone": True,
                "estimated_days": 0,
                "responsible_party": "equipo_interno",
                "sort_order": 1,
                "is_active": True
            },
            {
                "phase_id": 3,
                "stage_code": "8",
                "stage_name": "Cancelado",
                "stage_description": "Desarrollo cancelado",
                "is_milestone": False,
                "estimated_days": 0,
                "responsible_party": "equipo_interno",
                "sort_order": 2,
                "is_active": True
            },
            # Etapas adicionales para flujo con proveedor y devoluciones
            {
                "phase_id": 1,  # En Ejecución
                "stage_code": "9",
                "stage_name": "Devolución a Proveedor",
                "stage_description": "Entrega rechazada por TI y devuelta al proveedor",
                "is_milestone": False,
                "estimated_days": 2,
                "responsible_party": "proveedor",
                "sort_order": 5,
                "is_active": True
            },
            {
                "phase_id": 1,
                "stage_code": "10",
                "stage_name": "Corrección en Progreso",
                "stage_description": "Proveedor trabajando en correcciones tras devolución",
                "is_milestone": False,
                "estimated_days": 3,
                "responsible_party": "proveedor",
                "sort_order": 6,
                "is_active": True
            },
            {
                "phase_id": 1,
                "stage_code": "11",
                "stage_name": "Re-entrega a TI",
                "stage_description": "Proveedor reentrega a TI para nueva validación",
                "is_milestone": True,
                "estimated_days": 1,
                "responsible_party": "proveedor",
                "sort_order": 7,
                "is_active": True
            },
            {
                "phase_id": 1,
                "stage_code": "12",
                "stage_name": "Validación de Correcciones",
                "stage_description": "TI valida correcciones entregadas por el proveedor",
                "is_milestone": False,
                "estimated_days": 1,
                "responsible_party": "equipo_interno",
                "sort_order": 8,
                "is_active": True
            },
            {
                "phase_id": 3,  # Finales / Otros
                "stage_code": "13",
                "stage_name": "Entrega a Producción",
                "stage_description": "Despliegue del desarrollo a ambiente de producción",
                "is_milestone": True,
                "estimated_days": 1,
                "responsible_party": "equipo_interno",
                "sort_order": 3,
                "is_active": True
            },
            {
                "phase_id": 3,
                "stage_code": "14",
                "stage_name": "Incidente Post-Producción",
                "stage_description": "Registro de incidentes derivados en producción",
                "is_milestone": False,
                "estimated_days": 0,
                "responsible_party": "equipo_interno",
                "sort_order": 4,
                "is_active": True
            }
        ]

        for stage_data in stages_data:
            existing_stage = db.query(DevelopmentStage).filter(
                DevelopmentStage.stage_code == stage_data["stage_code"]
            ).first()
            
            if not existing_stage:
                stage = DevelopmentStage(**stage_data)
                db.add(stage)
                logger.info(f"Created stage: {stage_data['stage_name']}")
            else:
                logger.info(f"Stage already exists: {stage_data['stage_name']}")

        db.commit()

        # 3. Crear catálogo de controles de calidad
        quality_controls_data = [
            {
                "control_code": "C001-GT",
                "control_name": "Revisión de Análisis",
                "description": "Verificar que el análisis de requerimientos esté completo y correcto",
                "stage_prefix": "1",
                "stage_description": "Etapa de Análisis y Diseño",
                "deliverables": "Documento de análisis, especificaciones técnicas",
                "validation_criteria": "Documento aprobado por el área solicitante",
                "is_active": True
            },
            {
                "control_code": "C002-GT", 
                "control_name": "Revisión de Código",
                "description": "Revisar la calidad del código desarrollado",
                "stage_prefix": "2",
                "stage_description": "Etapa de Desarrollo",
                "deliverables": "Código fuente, documentación técnica",
                "validation_criteria": "Código cumple estándares de calidad",
                "is_active": True
            },
            {
                "control_code": "C003-GT",
                "control_name": "Pruebas Funcionales",
                "description": "Ejecutar pruebas funcionales completas",
                "stage_prefix": "3",
                "stage_description": "Etapa de Testing",
                "deliverables": "Plan de pruebas, resultados de pruebas",
                "validation_criteria": "Todas las pruebas pasan exitosamente",
                "is_active": True
            },
            {
                "control_code": "C004-GT",
                "control_name": "Validación de Entrega",
                "description": "Validar que la entrega cumple con los requerimientos",
                "stage_prefix": "4",
                "stage_description": "Etapa de Entrega",
                "deliverables": "Sistema funcional, documentación de usuario",
                "validation_criteria": "Usuario acepta la entrega",
                "is_active": True
            }
        ]

        for control_data in quality_controls_data:
            existing_control = db.query(QualityControlCatalog).filter(
                QualityControlCatalog.control_code == control_data["control_code"]
            ).first()
            
            if not existing_control:
                control = QualityControlCatalog(**control_data)
                db.add(control)
                logger.info(f"Created quality control: {control_data['control_name']}")
            else:
                logger.info(f"Quality control already exists: {control_data['control_name']}")

        db.commit()

        # 4. Crear un desarrollo de ejemplo
        development_data = {
            "id": "GLOBAL",
            "name": "Desarrollo Global de Ejemplo",
            "description": "Desarrollo de ejemplo para pruebas globales",
            "module": "Sistema",
            "type": "Desarrollo",
            "environment": "Producción",
            "current_phase_id": 1,
            "current_stage_id": 1,
            "stage_progress_percentage": 0.0,
            "general_status": "En curso",
            "provider": "Equipo Interno"
        }

        existing_development = db.query(Development).filter(
            Development.id == development_data["id"]
        ).first()
        
        if not existing_development:
            development = Development(**development_data)
            db.add(development)
            logger.info(f"Created development: {development_data['name']}")
        else:
            logger.info(f"Development already exists: {development_data['name']}")

        db.commit()

        logger.info("Development data seeding completed successfully.")
        
    except Exception as e:
        logger.error(f"An error occurred during development data seeding: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def seed_database():
    """Función principal para cargar todos los datos de seed"""
    seed_development_data()

if __name__ == "__main__":
    seed_database()
