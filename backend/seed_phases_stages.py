#!/usr/bin/env python3
"""
Script para poblar las fases y etapas del desarrollo
"""

import os
import sys
from pathlib import Path

# Agregar el directorio del proyecto al path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def seed_phases_and_stages():
    """Poblar las fases y etapas del desarrollo"""
    try:
        from app.database import SessionLocal
        from app.models.development import DevelopmentPhase, DevelopmentStage
        
        db = SessionLocal()
        
        # Verificar si ya existen datos
        existing_phases = db.query(DevelopmentPhase).count()
        if existing_phases > 0:
            print("✅ Las fases y etapas ya existen")
            db.close()
            return True
        
        print("🌱 Poblando fases y etapas del desarrollo...")
        
        # Crear fases
        phases_data = [
            {
                "phase_name": "En Ejecución",
                "phase_description": "Fase donde se realizan actividades activas de desarrollo",
                "phase_color": "info",
                "sort_order": 1
            },
            {
                "phase_name": "En Espera",
                "phase_description": "Fase donde el desarrollo está pausado esperando decisiones o aprobaciones",
                "phase_color": "warning",
                "sort_order": 2
            },
            {
                "phase_name": "Finales / Otros",
                "phase_description": "Estados terminales del desarrollo (exitoso o cancelado)",
                "phase_color": "success",
                "sort_order": 3
            }
        ]
        
        phases = []
        for phase_data in phases_data:
            phase = DevelopmentPhase(**phase_data)
            db.add(phase)
            phases.append(phase)
        
        db.commit()
        
        # Crear etapas
        stages_data = [
            # Fase 1: En Ejecución
            {"phase_id": 1, "stage_code": "1", "stage_name": "Definición", "stage_description": "Definición de requerimientos", "responsible_party": "usuario", "sort_order": 1},
            {"phase_id": 1, "stage_code": "2", "stage_name": "Análisis", "stage_description": "Análisis técnico", "responsible_party": "proveedor", "sort_order": 2},
            {"phase_id": 1, "stage_code": "5", "stage_name": "Desarrollo", "stage_description": "Implementación del desarrollo", "responsible_party": "proveedor", "sort_order": 3},
            {"phase_id": 1, "stage_code": "6", "stage_name": "Despliegue (Pruebas)", "stage_description": "Despliegue en ambiente de pruebas", "responsible_party": "proveedor", "sort_order": 4},
            {"phase_id": 1, "stage_code": "7", "stage_name": "Plan de Pruebas", "stage_description": "Elaboración del plan de pruebas", "responsible_party": "usuario", "sort_order": 5},
            {"phase_id": 1, "stage_code": "8", "stage_name": "Ejecución Pruebas", "stage_description": "Ejecución de pruebas funcionales", "responsible_party": "usuario", "sort_order": 6},
            
            # Fase 2: En Espera
            {"phase_id": 2, "stage_code": "3", "stage_name": "Propuesta", "stage_description": "Elaboración de propuesta comercial", "responsible_party": "proveedor", "sort_order": 1},
            {"phase_id": 2, "stage_code": "4", "stage_name": "Aprobación", "stage_description": "Aprobación de la propuesta", "responsible_party": "usuario", "sort_order": 2},
            {"phase_id": 2, "stage_code": "9", "stage_name": "Aprobación (Pase)", "stage_description": "Aprobación para pase a producción", "responsible_party": "usuario", "sort_order": 3},
            
            # Fase 3: Finales / Otros
            {"phase_id": 3, "stage_code": "10", "stage_name": "Desplegado", "stage_description": "Desplegado en producción", "responsible_party": "equipo_interno", "sort_order": 1},
            {"phase_id": 3, "stage_code": "0", "stage_name": "Cancelado", "stage_description": "Desarrollo cancelado", "responsible_party": "usuario", "sort_order": 2}
        ]
        
        for stage_data in stages_data:
            stage = DevelopmentStage(**stage_data)
            db.add(stage)
        
        db.commit()
        db.close()
        
        print("✅ Fases y etapas creadas exitosamente")
        return True
        
    except Exception as e:
        print(f"❌ Error poblando fases y etapas: {e}")
        return False

def main():
    """Función principal"""
    print("🚀 Iniciando población de fases y etapas...")
    
    if seed_phases_and_stages():
        print("✅ Población completada exitosamente")
        return True
    
    print("❌ No se pudo poblar las fases y etapas")
    return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
