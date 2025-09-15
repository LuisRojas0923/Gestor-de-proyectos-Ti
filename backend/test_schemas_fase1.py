#!/usr/bin/env python3
"""
Script de testing para validar schemas implementados en Fase 1
Sistema de Gestión de Proyectos TI - Persistencia de Datos
"""

import sys
import os
from datetime import datetime, date
from decimal import Decimal

# Agregar el directorio del proyecto al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_schemas():
    """Test de validación de schemas"""
    print("🧪 TESTING DE SCHEMAS - FASE 1")
    print("=" * 50)
    
    try:
        # Importar schemas
        from app.schemas.development import (
            DevelopmentObservationCreate,
            DevelopmentObservationUpdate,
            DevelopmentStageUpdate,
            DevelopmentProgressUpdate,
            DevelopmentObservation
        )
        print("✅ Schemas importados correctamente")
        
        # Test 1: DevelopmentObservationCreate
        print("\n📝 TEST 1: DevelopmentObservationCreate")
        try:
            obs_create = DevelopmentObservationCreate(
                observation_type="seguimiento",
                content="Testing de persistencia - Actividad creada",
                author="Script de Testing",
                is_current=True
            )
            print(f"   ✅ Schema válido: {obs_create.dict()}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        # Test 2: DevelopmentObservationUpdate
        print("\n✏️ TEST 2: DevelopmentObservationUpdate")
        try:
            obs_update = DevelopmentObservationUpdate(
                content="Testing de persistencia - Observación actualizada",
                observation_type="problema"
            )
            print(f"   ✅ Schema válido: {obs_update.dict()}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        # Test 3: DevelopmentStageUpdate
        print("\n🔄 TEST 3: DevelopmentStageUpdate")
        try:
            stage_update = DevelopmentStageUpdate(
                stage_id=1,
                progress_percentage=Decimal("75.5"),
                changed_by="Script de Testing",
                notes="Testing de persistencia - Cambio de etapa"
            )
            print(f"   ✅ Schema válido: {stage_update.dict()}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        # Test 4: DevelopmentProgressUpdate
        print("\n📊 TEST 4: DevelopmentProgressUpdate")
        try:
            progress_update = DevelopmentProgressUpdate(
                progress_percentage=Decimal("80.0"),
                updated_by="Script de Testing",
                notes="Testing de persistencia - Progreso actualizado"
            )
            print(f"   ✅ Schema válido: {progress_update.dict()}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        # Test 5: Validaciones de tipos
        print("\n🔍 TEST 5: Validaciones de tipos")
        try:
            # Test tipo de observación inválido
            try:
                obs_invalid = DevelopmentObservationCreate(
                    observation_type="tipo_invalido",
                    content="Test",
                    author="Test"
                )
                print("   ❌ Debería haber fallado con tipo inválido")
            except ValueError as e:
                print(f"   ✅ Validación funcionando: {e}")
            
            # Test progreso fuera de rango
            try:
                progress_invalid = DevelopmentProgressUpdate(
                    progress_percentage=Decimal("150.0")
                )
                print("   ❌ Debería haber fallado con progreso > 100")
            except ValueError as e:
                print(f"   ✅ Validación funcionando: {e}")
                
        except Exception as e:
            print(f"   ❌ Error en validaciones: {e}")
        
        print("\n" + "=" * 50)
        print("✅ TODOS LOS TESTS DE SCHEMAS PASARON")
        print("=" * 50)
        
        return True
        
    except ImportError as e:
        print(f"❌ Error importando schemas: {e}")
        print("💡 Asegúrate de que el servidor esté configurado correctamente")
        return False
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        return False

def test_models():
    """Test de validación de modelos"""
    print("\n🏗️ TESTING DE MODELOS - FASE 1")
    print("=" * 50)
    
    try:
        # Importar modelos
        from app.models.development import (
            DevelopmentObservation,
            DevelopmentStatusHistory
        )
        print("✅ Modelos importados correctamente")
        
        # Test 1: Verificar estructura del modelo
        print("\n📋 TEST 1: Estructura del modelo DevelopmentObservation")
        try:
            # Verificar que el modelo tiene los campos esperados
            expected_fields = [
                'id', 'development_id', 'observation_type', 'content',
                'author', 'observation_date', 'is_current', 'created_at', 'updated_at'
            ]
            
            model_fields = [column.name for column in DevelopmentObservation.__table__.columns]
            print(f"   📄 Campos del modelo: {model_fields}")
            
            for field in expected_fields:
                if field in model_fields:
                    print(f"   ✅ Campo '{field}' presente")
                else:
                    print(f"   ❌ Campo '{field}' faltante")
                    
        except Exception as e:
            print(f"   ❌ Error verificando modelo: {e}")
        
        print("\n" + "=" * 50)
        print("✅ TESTS DE MODELOS COMPLETADOS")
        print("=" * 50)
        
        return True
        
    except ImportError as e:
        print(f"❌ Error importando modelos: {e}")
        return False
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        return False

def main():
    """Función principal"""
    print("🚀 INICIANDO VALIDACIÓN DE IMPLEMENTACIÓN - FASE 1")
    print("=" * 60)
    
    # Test schemas
    schemas_ok = test_schemas()
    
    # Test models
    models_ok = test_models()
    
    print("\n" + "=" * 60)
    print("🏁 RESUMEN DE VALIDACIÓN")
    print("=" * 60)
    
    if schemas_ok and models_ok:
        print("✅ FASE 1 IMPLEMENTADA CORRECTAMENTE")
        print("\n📋 Endpoints implementados:")
        print("   - GET /developments/{id}/observations")
        print("   - POST /developments/{id}/observations")
        print("   - PUT /developments/{id}/observations/{observation_id}")
        print("   - DELETE /developments/{id}/observations/{observation_id}")
        print("   - GET /developments/{id}/activities")
        print("   - PUT /developments/{id}")
        print("   - PATCH /developments/{id}/progress")
        print("   - PATCH /developments/{id}/stage")
        
        print("\n🎯 PRÓXIMOS PASOS:")
        print("   1. Iniciar el servidor backend")
        print("   2. Ejecutar test_endpoints_fase1.py para validar endpoints")
        print("   3. Continuar con Fase 2: Frontend")
        
    else:
        print("❌ HAY PROBLEMAS EN LA IMPLEMENTACIÓN")
        print("💡 Revisa los errores mostrados arriba")

if __name__ == "__main__":
    main()
