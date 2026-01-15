#!/usr/bin/env python3
"""
Script para corregir los responsables de los controles de calidad
Los controles los ejecutan analista y arquitecto, no proveedores
"""

import os
import sys
from pathlib import Path

# Agregar el directorio del proyecto al path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def fix_quality_control_responsibles():
    """Corregir responsables de controles de calidad"""
    try:
        from app.database import SessionLocal
        from app.models.quality import QualityControlCatalog
        
        db = SessionLocal()
        
        print("🔄 Corrigiendo responsables de controles de calidad...")
        
        # Actualizar responsables específicos según el tipo de control
        responsible_updates = [
            # Control de requerimientos - Analista
            ('C003-GT', 'analista', 'Validación de Requerimientos - Analista'),
            
            # Control de pruebas - Analista (quien valida las pruebas)
            ('C021-GT', 'analista', 'Validación de Pruebas - Analista'),
            
            # Control de garantía de entregas - Arquitecto (quien valida el despliegue)
            ('C004-GT', 'arquitecto', 'Garantía de Entregas - Arquitecto'),
            
            # Control trimestral - Equipo Interno (soporte)
            ('C027-GT', 'equipo_interno', 'Validación Trimestral - Equipo Interno')
        ]
        
        for control_code, new_responsible, description in responsible_updates:
            updated = db.query(QualityControlCatalog).filter(
                QualityControlCatalog.control_code == control_code
            ).update({
                QualityControlCatalog.responsible_party: new_responsible
            })
            
            if updated > 0:
                print(f"✅ {control_code}: {description}")
            else:
                print(f"⚠️  No se encontró el control {control_code}")
        
        # Actualizar responsables por etapa si hay otros controles
        stage_responsible_mapping = {
            '1-2': 'analista',      # Definición y Análisis - Analista
            '3-4': 'analista',      # Propuesta y Aprobación - Analista
            '5-7': 'analista',      # Desarrollo y Pruebas - Analista
            '8-10': 'arquitecto'    # Despliegue y Producción - Arquitecto
        }
        
        print("\n🔄 Actualizando responsables por etapa...")
        for stage_prefix, responsible in stage_responsible_mapping.items():
            # Solo actualizar si no tiene responsable específico ya asignado
            updated = db.query(QualityControlCatalog).filter(
                QualityControlCatalog.stage_prefix == stage_prefix,
                QualityControlCatalog.responsible_party.in_(['usuario', 'proveedor'])  # Solo los incorrectos
            ).update({
                QualityControlCatalog.responsible_party: responsible
            })
            
            if updated > 0:
                print(f"✅ Etapa {stage_prefix}: {updated} controles actualizados a {responsible}")
        
        db.commit()
        db.close()
        
        print("\n✅ Corrección de responsables completada exitosamente")
        return True
        
    except Exception as e:
        print(f"❌ Error corrigiendo responsables: {e}")
        if 'db' in locals():
            db.rollback()
            db.close()
        return False

def main():
    """Función principal"""
    print("🚀 Iniciando corrección de responsables de controles...")
    
    if fix_quality_control_responsibles():
        print("✅ Corrección completada exitosamente")
        return True
    
    print("❌ No se pudo completar la corrección")
    return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
