# Guía de Uso: Validación de Correcciones

## 🎯 Nuevos Campos Implementados

### **Campos Obligatorios:**
- ✅ **`installer_number`** - Número del instalador que se está validando
- ✅ **`failure_description`** - Descripción detallada de la falla encontrada

### **Campos Opcionales:**
- 📝 **`original_stage_reference`** - Etapa original donde se detectó la falla
- 📝 **`correction_requirements`** - Requerimientos específicos de corrección
- 📝 **`validation_notes`** - Notas de la validación realizada
- 📝 **`provider_response`** - Respuesta del proveedor a las correcciones
- 📝 **`correction_status`** - Estado de la corrección (pendiente, en_progreso, completada)
- 📝 **`expected_correction_date`** - Fecha esperada de corrección
- 📝 **`validation_result`** - Resultado de la validación (aprobada, rechazada, pendiente)

## 📋 Ejemplo de Uso

### **Crear Actividad de Validación de Correcciones:**

```json
{
  "stage_id": [ID de "Validación de Correcciones"],
  "activity_type": "nueva_actividad",
  "start_date": "2025-01-XX",
  "status": "en_curso",
  "actor_type": "equipo_interno",
  "notes": "Validando correcciones del instalador fallido",
  "dynamic_payload": {
    "installer_number": "INST-2025-001",
    "failure_description": "Error de conexión con base de datos durante la instalación en ambiente de pruebas. El instalador no puede establecer conexión con el servidor de BD principal.",
    "original_stage_reference": "Despliegue (Pruebas)",
    "correction_requirements": "1. Verificar configuración de red\n2. Validar credenciales de base de datos\n3. Confirmar conectividad con servidor BD\n4. Probar conexión desde ambiente de pruebas",
    "validation_notes": "Instalador devuelto al proveedor para corrección. Se documentaron todos los pasos de troubleshooting realizados.",
    "provider_response": "Proveedor confirmó recepción y está trabajando en la corrección",
    "correction_status": "en_progreso",
    "expected_correction_date": "2025-01-XX",
    "validation_result": "pendiente"
  }
}
```

## 🔄 Flujo de Trabajo

### **1. Detectar Falla en "Despliegue (Pruebas)"**
```json
{
  "installer_number": "INST-2025-001",
  "installation_notes": "Falla en conexión con BD",
  "failure_type": "conexion_bd"
}
```

### **2. Registrar en "Validación de Correcciones"**
```json
{
  "installer_number": "INST-2025-001",
  "failure_description": "Descripción detallada de la falla...",
  "original_stage_reference": "Despliegue (Pruebas)"
}
```

### **3. Seguimiento de Corrección**
```json
{
  "correction_status": "en_progreso",
  "provider_response": "Proveedor trabajando en corrección",
  "expected_correction_date": "2025-01-XX"
}
```

### **4. Validación Final**
```json
{
  "validation_result": "aprobada",
  "validation_notes": "Corrección validada exitosamente"
}
```

## 🔍 Consultas Útiles

### **Buscar Instaladores en Validación:**
```http
GET /api/v1/installers/failed?status=en_curso
```

### **Buscar por Número de Instalador:**
```http
GET /api/v1/installers/search/INST-2025-001
```

### **Ver Reporte de Problemas:**
```http
GET /api/v1/installers/problems-report?period_days=30
```

## 📊 Estados de Corrección

| Estado | Descripción | Acción Requerida |
|--------|-------------|------------------|
| `pendiente` | Corrección pendiente de inicio | Proveedor debe iniciar trabajo |
| `en_progreso` | Corrección en desarrollo | Monitorear progreso |
| `completada` | Corrección terminada | Validar corrección |
| `rechazada` | Corrección no cumple | Solicitar nueva corrección |

## ✅ Resultados de Validación

| Resultado | Descripción | Próximo Paso |
|-----------|-------------|--------------|
| `aprobada` | Corrección válida | Pasar a siguiente etapa |
| `rechazada` | Corrección no cumple | Solicitar nueva corrección |
| `pendiente` | Esperando validación | Continuar evaluación |

## 🎯 Mejores Prácticas

### **1. Descripción de Falla:**
- ✅ Ser específico y detallado
- ✅ Incluir pasos para reproducir
- ✅ Mencionar ambiente afectado
- ❌ No usar descripciones vagas

### **2. Requerimientos de Corrección:**
- ✅ Listar acciones específicas
- ✅ Definir criterios de aceptación
- ✅ Establecer fecha límite
- ❌ No dejar requerimientos ambiguos

### **3. Seguimiento:**
- ✅ Actualizar estado regularmente
- ✅ Documentar comunicación con proveedor
- ✅ Registrar fechas importantes
- ❌ No dejar actividades sin seguimiento

## 🚀 Beneficios

### **Para TI:**
- ✅ **Trazabilidad completa** de fallas y correcciones
- ✅ **Campos estructurados** para información consistente
- ✅ **Seguimiento automático** en reportes de KPIs
- ✅ **Validación automática** de campos requeridos

### **Para Proveedores:**
- ✅ **Requerimientos claros** de corrección
- ✅ **Feedback estructurado** sobre fallas
- ✅ **Seguimiento visible** del progreso
- ✅ **Criterios de aceptación** definidos

## 🔧 Testing

Para probar los nuevos campos:

```bash
python test_validacion_correcciones.py
```

Este script:
- ✅ Valida la configuración de campos
- ✅ Prueba validación de payload
- ✅ Verifica esquemas Pydantic
- ✅ Crea actividad de muestra
- ✅ Confirma integración con base de datos
