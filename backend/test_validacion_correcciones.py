#!/usr/bin/env python3
"""
Script de testing para los nuevos campos de Validación de Correcciones
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime, date

# Agregar el directorio del proyecto al path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_validacion_correcciones_fields():
    """Probar los nuevos campos de Validación de Correcciones"""
    try:
        from app.database import SessionLocal
        from app.models.development import DevelopmentActivityLog, DevelopmentStage
        from app.schemas.activity_log import ValidacionCorreccionesFields, get_stage_field_config, validate_dynamic_payload
        
        db = SessionLocal()
        
        print("🧪 Probando campos de Validación de Correcciones...")
        
        # 1. Probar configuración de campos
        print("\n1. Probando configuración de campos...")
        config = get_stage_field_config("Validación de Correcciones")
        
        if config:
            print("   ✅ Configuración encontrada")
            print(f"      Campos requeridos: {config['required_fields']}")
            print(f"      Campos opcionales: {len(config['optional_fields'])} campos")
        else:
            print("   ❌ No se encontró configuración para 'Validación de Correcciones'")
            return False
        
        # 2. Probar validación de payload
        print("\n2. Probando validación de payload...")
        
        # Payload válido (con campos requeridos)
        valid_payload = {
            "installer_number": "INST-2025-001",
            "failure_description": "Error de conexión con base de datos durante la instalación",
            "original_stage_reference": "Despliegue (Pruebas)",
            "correction_requirements": "Verificar configuración de red y credenciales de BD",
            "validation_notes": "Instalador devuelto al proveedor para corrección",
            "correction_status": "pendiente"
        }
        
        try:
            validated_payload = validate_dynamic_payload("Validación de Correcciones", valid_payload)
            print("   ✅ Payload válido procesado correctamente")
            print(f"      Instalador: {validated_payload.get('installer_number')}")
            print(f"      Descripción de falla: {validated_payload.get('failure_description')[:50]}...")
        except Exception as e:
            print(f"   ❌ Error validando payload: {e}")
            return False
        
        # 3. Probar payload inválido (sin campos requeridos)
        print("\n3. Probando validación con campos faltantes...")
        
        invalid_payload = {
            "installer_number": "INST-2025-001"
            # Falta failure_description (requerido)
        }
        
        try:
            validated_payload = validate_dynamic_payload("Validación de Correcciones", invalid_payload)
            print("   ❌ Debería haber fallado la validación")
            return False
        except ValueError as e:
            print(f"   ✅ Validación falló correctamente: {e}")
        except Exception as e:
            print(f"   ❌ Error inesperado: {e}")
            return False
        
        # 4. Probar esquema Pydantic
        print("\n4. Probando esquema Pydantic...")
        
        try:
            # Datos completos
            complete_data = {
                "installer_number": "INST-2025-001",
                "failure_description": "Error de conexión con base de datos",
                "original_stage_reference": "Despliegue (Pruebas)",
                "correction_requirements": "Verificar configuración de red",
                "validation_notes": "Validación inicial completada",
                "provider_response": "Proveedor confirmó recepción",
                "correction_status": "en_progreso",
                "expected_correction_date": date.today(),
                "validation_result": "pendiente"
            }
            
            fields = ValidacionCorreccionesFields(**complete_data)
            print("   ✅ Esquema Pydantic válido con datos completos")
            print(f"      Instalador: {fields.installer_number}")
            print(f"      Estado: {fields.correction_status}")
            
            # Datos mínimos (solo requeridos)
            minimal_data = {
                "installer_number": "INST-2025-002",
                "failure_description": "Falla en dependencias del sistema"
            }
            
            fields_minimal = ValidacionCorreccionesFields(**minimal_data)
            print("   ✅ Esquema Pydantic válido con datos mínimos")
            
        except Exception as e:
            print(f"   ❌ Error en esquema Pydantic: {e}")
            return False
        
        # 5. Buscar etapa en base de datos
        print("\n5. Verificando etapa en base de datos...")
        
        stage = db.query(DevelopmentStage).filter(
            DevelopmentStage.stage_name == "Validación de Correcciones"
        ).first()
        
        if stage:
            print(f"   ✅ Etapa encontrada: ID {stage.id}")
            print(f"      Código: {stage.stage_code}")
            print(f"      Descripción: {stage.stage_description}")
        else:
            print("   ❌ No se encontró la etapa 'Validación de Correcciones' en la base de datos")
            return False
        
        db.close()
        
        print("\n✅ Todas las pruebas de Validación de Correcciones completadas exitosamente")
        return True
        
    except Exception as e:
        print(f"❌ Error en las pruebas: {e}")
        return False

def create_sample_activity():
    """Crear una actividad de muestra para Validación de Correcciones"""
    try:
        from app.database import SessionLocal
        from app.models.development import DevelopmentActivityLog, DevelopmentStage
        from datetime import datetime, date
        
        db = SessionLocal()
        
        print("\n🎯 Creando actividad de muestra...")
        
        # Buscar etapa de Validación de Correcciones
        stage = db.query(DevelopmentStage).filter(
            DevelopmentStage.stage_name == "Validación de Correcciones"
        ).first()
        
        if not stage:
            print("   ❌ No se encontró la etapa")
            return False
        
        # Crear actividad de muestra
        sample_payload = {
            "installer_number": "INST-TEST-001",
            "failure_description": "Error de conexión con base de datos durante instalación en ambiente de pruebas",
            "original_stage_reference": "Despliegue (Pruebas)",
            "correction_requirements": "1. Verificar configuración de red\n2. Validar credenciales de BD\n3. Confirmar conectividad",
            "validation_notes": "Instalador devuelto al proveedor. Se espera corrección en 3 días hábiles.",
            "correction_status": "pendiente",
            "expected_correction_date": "2025-01-XX",
            "validation_result": "pendiente"
        }
        
        # Crear actividad de prueba
        test_activity = DevelopmentActivityLog(
            development_id="TEST-2025-001",
            stage_id=stage.id,
            activity_type="nueva_actividad",
            start_date=date.today(),
            status="en_curso",
            actor_type="equipo_interno",
            notes="Actividad de prueba para Validación de Correcciones",
            dynamic_payload=json.dumps(sample_payload)
        )
        
        db.add(test_activity)
        db.commit()
        
        print(f"   ✅ Actividad de prueba creada con ID: {test_activity.id}")
        print(f"      Instalador: {sample_payload['installer_number']}")
        print(f"      Estado: {sample_payload['correction_status']}")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"   ❌ Error creando actividad de muestra: {e}")
        return False

def main():
    """Función principal"""
    print("🚀 Iniciando pruebas de Validación de Correcciones...")
    
    success1 = test_validacion_correcciones_fields()
    success2 = create_sample_activity()
    
    if success1 and success2:
        print("\n✅ Todas las pruebas completadas exitosamente")
        print("\n📋 Resumen de mejoras:")
        print("   ✅ Campos específicos para Validación de Correcciones")
        print("   ✅ installer_number como campo obligatorio")
        print("   ✅ failure_description como campo obligatorio")
        print("   ✅ Campos opcionales para seguimiento completo")
        print("   ✅ Validación automática de campos")
        return True
    
    print("\n❌ Algunas pruebas fallaron")
    return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
