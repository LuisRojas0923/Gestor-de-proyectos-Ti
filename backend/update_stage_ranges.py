#!/usr/bin/env python3
"""
Script para actualizar los rangos de etapas de los controles de calidad
Los controles deben mantenerse presentes hasta la etapa 10
"""

import os
import sys
from pathlib import Path

# Agregar el directorio del proyecto al path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def update_stage_ranges():
    """Actualizar rangos de etapas de controles de calidad"""
    try:
        from app.database import SessionLocal
        from app.models.quality import QualityControlCatalog
        
        db = SessionLocal()
        
        print("🔄 Actualizando rangos de etapas de controles de calidad...")
        
        # Actualizar rangos de etapas según los nuevos requerimientos
        stage_updates = [
            # C003-GT: De 1-2 a 1-10 (mantener presente desde definición hasta producción)
            ('C003-GT', '1-10', 'Etapas de Definición a Producción'),
            
            # C021-GT: De 5-7 a 5-10 (mantener presente desde desarrollo hasta producción)
            ('C021-GT', '5-10', 'Etapas de Desarrollo a Producción'),
            
            # C004-GT: Mantener 8-10 (despliegue y producción)
            ('C004-GT', '8-10', 'Etapas de Despliegue y Producción'),
            
            # C027-GT: Mantener 8-10 (producción y soporte)
            ('C027-GT', '8-10', 'Etapas de Producción y Soporte')
        ]
        
        for control_code, new_stage_prefix, new_stage_description in stage_updates:
            updated = db.query(QualityControlCatalog).filter(
                QualityControlCatalog.control_code == control_code
            ).update({
                QualityControlCatalog.stage_prefix: new_stage_prefix,
                QualityControlCatalog.stage_description: new_stage_description
            })
            
            if updated > 0:
                print(f"✅ {control_code}: {new_stage_prefix} - {new_stage_description}")
            else:
                print(f"⚠️  No se encontró el control {control_code}")
        
        db.commit()
        db.close()
        
        print("\n✅ Actualización de rangos de etapas completada exitosamente")
        print("\n📋 Resumen de controles actualizados:")
        print("• C003-GT: Etapas 1-10 (Definición a Producción) - Analista")
        print("• C021-GT: Etapas 5-10 (Desarrollo a Producción) - Analista")
        print("• C004-GT: Etapas 8-10 (Despliegue y Producción) - Arquitecto")
        print("• C027-GT: Etapas 8-10 (Producción y Soporte) - Equipo Interno")
        print("\n💡 Los controles ahora se mantienen presentes hasta la etapa 10")
        print("   y deben estar completos para pasar a producción.")
        
        return True
        
    except Exception as e:
        print(f"❌ Error actualizando rangos de etapas: {e}")
        if 'db' in locals():
            db.rollback()
            db.close()
        return False

def main():
    """Función principal"""
    print("🚀 Iniciando actualización de rangos de etapas...")
    
    if update_stage_ranges():
        print("✅ Actualización completada exitosamente")
        return True
    
    print("❌ No se pudo completar la actualización")
    return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
