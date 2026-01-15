#!/usr/bin/env python3
"""
Script de migración para actualizar los controles de calidad
Agrega el campo responsible_party al catálogo y deliverables_completed a los controles
"""

import os
import sys
from pathlib import Path

# Agregar el directorio del proyecto al path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def migrate_quality_controls():
    """Migrar controles de calidad para agregar nuevos campos"""
    try:
        from app.database import SessionLocal
        from app.models.quality import QualityControlCatalog, DevelopmentQualityControl
        from sqlalchemy import text
        
        db = SessionLocal()
        
        print("🔄 Iniciando migración de controles de calidad...")
        
        # 1. Agregar columna responsible_party al catálogo si no existe
        try:
            db.execute(text("ALTER TABLE quality_control_catalog ADD COLUMN responsible_party VARCHAR(50)"))
            print("✅ Columna responsible_party agregada al catálogo")
        except Exception as e:
            if "already exists" in str(e) or "duplicate column" in str(e).lower():
                print("ℹ️  Columna responsible_party ya existe en el catálogo")
            else:
                print(f"⚠️  Error agregando responsible_party: {e}")
        
        # 2. Agregar columna deliverables_completed a los controles si no existe
        try:
            db.execute(text("ALTER TABLE development_quality_controls ADD COLUMN deliverables_completed TEXT"))
            print("✅ Columna deliverables_completed agregada a los controles")
        except Exception as e:
            if "already exists" in str(e) or "duplicate column" in str(e).lower():
                print("ℹ️  Columna deliverables_completed ya existe en los controles")
            else:
                print(f"⚠️  Error agregando deliverables_completed: {e}")
        
        # 3. Actualizar responsables en el catálogo basado en el stage_prefix
        print("🔄 Actualizando responsables en el catálogo...")
        
        # Mapeo de etapas a responsables
        stage_responsible_mapping = {
            '1-2': 'usuario',      # Definición y Análisis - Usuario
            '3-4': 'proveedor',    # Propuesta y Aprobación - Proveedor
            '5-7': 'proveedor',    # Desarrollo y Pruebas - Proveedor
            '8-10': 'usuario'      # Despliegue y Producción - Usuario
        }
        
        for stage_prefix, responsible in stage_responsible_mapping.items():
            updated = db.query(QualityControlCatalog).filter(
                QualityControlCatalog.stage_prefix == stage_prefix
            ).update({
                QualityControlCatalog.responsible_party: responsible
            })
            if updated > 0:
                print(f"✅ Actualizados {updated} controles para etapa {stage_prefix} -> {responsible}")
        
        # 4. Actualizar controles específicos con responsables correctos
        specific_updates = [
            ('C003-GT', 'usuario'),      # Validación de Requerimientos - Usuario
            ('C021-GT', 'proveedor'),    # Validación de Pruebas - Proveedor
            ('C004-GT', 'equipo_interno'), # Garantía de Entregas - Equipo Interno
            ('C027-GT', 'equipo_interno')  # Validación Trimestral - Equipo Interno
        ]
        
        for control_code, responsible in specific_updates:
            updated = db.query(QualityControlCatalog).filter(
                QualityControlCatalog.control_code == control_code
            ).update({
                QualityControlCatalog.responsible_party: responsible
            })
            if updated > 0:
                print(f"✅ Actualizado {control_code} -> {responsible}")
        
        db.commit()
        db.close()
        
        print("✅ Migración de controles de calidad completada exitosamente")
        return True
        
    except Exception as e:
        print(f"❌ Error en migración: {e}")
        if 'db' in locals():
            db.rollback()
            db.close()
        return False

def main():
    """Función principal"""
    print("🚀 Iniciando migración de controles de calidad...")
    
    if migrate_quality_controls():
        print("✅ Migración completada exitosamente")
        return True
    
    print("❌ No se pudo completar la migración")
    return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
