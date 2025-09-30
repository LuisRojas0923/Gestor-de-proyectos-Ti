# 📊 Instructivo de Indicadores (KPIs)

## 📋 Tabla de Contenidos
1. [Introducción](#introducción)
2. [Acceso al Módulo](#acceso-al-módulo)
3. [Filtros y Controles](#filtros-y-controles)
4. [Indicadores Disponibles](#indicadores-disponibles)
5. [Interpretación de Resultados](#interpretación-de-resultados)
6. [Gráfico de Calidad por Proveedor](#gráfico-de-calidad-por-proveedor)
7. [Detalles de Cada Indicador](#detalles-de-cada-indicador)
8. [Acciones Recomendadas](#acciones-recomendadas)

---

## 🎯 Introducción

El módulo de **Indicadores** permite monitorear el desempeño de los proveedores de desarrollo de software mediante métricas clave de rendimiento (KPIs). Este sistema calcula automáticamente los indicadores basándose en los datos registrados en los desarrollos.

### Objetivo
Proporcionar visibilidad en tiempo real sobre:
- Cumplimiento de fechas en diferentes fases del proyecto
- Calidad de las entregas
- Rendimiento comparativo por proveedor

---

## 🔐 Acceso al Módulo

1. Ingrese al sistema con sus credenciales
2. En el menú principal, seleccione **"Indicadores"**
3. La pantalla mostrará las tarjetas de KPIs y gráficos comparativos

---

## 🎛️ Filtros y Controles

### Selector de Proveedor
En la parte superior encontrará un selector desplegable para filtrar los indicadores:
- **"Todos"**: Muestra métricas consolidadas de todos los proveedores
- **Proveedor específico**: Seleccione un proveedor para ver solo sus métricas

> 💡 **Tip**: Al cambiar el proveedor, todos los KPIs se actualizan automáticamente

### Controles de Visibilidad
Checkboxes que permiten mostrar u ocultar tarjetas específicas:
- ☑️ **Mostrar "Cumplimiento Fechas Análisis"**
- ☑️ **Mostrar "Cumplimiento Fechas Propuesta"**

> 📝 **Nota**: Estos controles son útiles para personalizar la vista según las métricas de mayor interés

---

## 📊 Indicadores Disponibles

El sistema cuenta con **5 indicadores principales**:

### 1️⃣ Cumplimiento Global Completo
**Color**: 🟡 Amarillo | **Icono**: 🎯 Target

**Descripción**: Mide el porcentaje de desarrollos que cumplen con todas las fechas establecidas desde el inicio hasta la entrega final.

**Cálculo**:
```
Cumplimiento Global = (Desarrollos completados a tiempo / Total de desarrollos) × 100%
```

**Interpretación**:
- **> 90%**: Excelente cumplimiento
- **70% - 90%**: Cumplimiento aceptable
- **< 70%**: Requiere atención inmediata

---

### 2️⃣ Cumplimiento Fechas Análisis
**Color**: 🔵 Azul | **Icono**: 📋 ClipboardList

**Descripción**: Evalúa el cumplimiento de las fechas durante la fase de análisis de requerimientos.

**Cálculo**:
```
Cumplimiento Análisis = (Análisis entregados a tiempo / Total de análisis) × 100%
```

**Fases incluidas**:
- Análisis de requerimientos
- Definición de alcance
- Documentación técnica inicial

**Importancia**: Esta fase es crítica porque retrasos aquí impactan todo el proyecto.

---

### 3️⃣ Cumplimiento Fechas Propuesta
**Color**: 🔵 Azul | **Icono**: 📄 FileText

**Descripción**: Mide la puntualidad en la entrega de propuestas técnicas y económicas.

**Cálculo**:
```
Cumplimiento Propuesta = (Propuestas entregadas a tiempo / Total de propuestas) × 100%
```

**Fases incluidas**:
- Elaboración de propuesta técnica
- Presupuesto y cotización
- Presentación al cliente

**Importancia**: La rapidez en la propuesta puede ser factor decisivo en la adjudicación.

---

### 4️⃣ Cumplimiento Fechas Desarrollo
**Color**: 🟢 Verde | **Icono**: 📈 TrendingUp

**Descripción**: Evalúa el cumplimiento de fechas durante la fase de desarrollo y codificación.

**Cálculo**:
```
Cumplimiento Desarrollo = (Entregas de desarrollo a tiempo / Total de entregas) × 100%
```

**Fases incluidas**:
- Desarrollo/Codificación
- Pruebas unitarias
- Integración
- Entrega para QA

**Importancia**: Es la fase más larga y donde más se pueden presentar retrasos.

---

### 5️⃣ Calidad en Primera Entrega
**Color**: 🟢 Verde | **Icono**: ✅ CheckCircle

**Descripción**: Mide el porcentaje de entregas que fueron aprobadas sin necesidad de devoluciones o correcciones.

**Cálculo**:
```
Calidad Primera Entrega = (Entregas aprobadas sin devoluciones / Total de entregas) × 100%
```

**Criterios de evaluación**:
- ✅ **Aprobada**: Entrega aceptada sin observaciones mayores
- ❌ **Devuelta**: Entrega rechazada por:
  - Errores funcionales
  - Incumplimiento de requerimientos
  - Problemas de calidad de código
  - Falta de documentación

**Meta recomendada**: > 85%

---

## 📈 Interpretación de Resultados

### Indicadores de Cambio
Cada tarjeta muestra un indicador de tendencia:
- **↗️ Flecha verde hacia arriba**: Mejora respecto al período anterior
- **↘️ Flecha roja hacia abajo**: Deterioro respecto al período anterior
- **Porcentaje**: Magnitud del cambio

### Colores de las Tarjetas
- 🟢 **Verde**: Indicadores de calidad y desarrollo (positivos)
- 🔵 **Azul**: Indicadores de fases intermedias
- 🟡 **Amarillo**: Indicador global (consolidado)

### Valores de Referencia

| Indicador | Excelente | Aceptable | Requiere Acción |
|-----------|-----------|-----------|-----------------|
| Cumplimiento Global Completo | > 90% | 70-90% | < 70% |
| Cumplimiento Análisis | > 85% | 65-85% | < 65% |
| Cumplimiento Propuesta | > 90% | 75-90% | < 75% |
| Cumplimiento Desarrollo | > 85% | 70-85% | < 70% |
| Calidad Primera Entrega | > 85% | 70-85% | < 70% |

---

## 📊 Gráfico de Calidad por Proveedor

### Descripción
Gráfico de barras que compara la calidad de entregas entre diferentes proveedores.

### Elementos visualizados
- **Eje X**: Nombre de los proveedores
- **Eje Y**: Porcentaje de calidad (0-100%)
- **Barras**: Altura representa el nivel de calidad de cada proveedor

### Uso
Este gráfico permite:
1. Comparar rápidamente el desempeño entre proveedores
2. Identificar proveedores de alto rendimiento
3. Detectar proveedores que requieren seguimiento especial

---

## 🔍 Detalles de Cada Indicador

### Acceso a Detalles
Para ver información detallada de cualquier indicador:

1. **Click en la tarjeta** del KPI deseado
2. Se abrirá un **modal con información detallada**

### Contenido del Modal

#### Para indicadores de cumplimiento de fechas:
**Sección Resumen**:
- Total de proyectos evaluados
- Proyectos a tiempo
- Proyectos con retraso
- Porcentaje de cumplimiento
- Promedio de días de retraso (si aplica)

**Sección Detalles**:
Tabla con cada proyecto/desarrollo que incluye:
- Código del desarrollo
- Nombre del proyecto
- Fecha programada
- Fecha real de entrega
- Días de diferencia (+ adelanto / - retraso)
- Estado
- Proveedor responsable

#### Para Calidad en Primera Entrega:
**Sección Resumen**:
- Total de entregas evaluadas
- Entregas aprobadas en primera instancia
- Entregas devueltas/rechazadas
- Porcentaje de calidad
- Tasa de devoluciones

**Sección Detalles**:
Tabla con cada entrega que incluye:
- Código del desarrollo
- Nombre del proyecto
- Fecha de entrega
- Estado (Aprobada/Devuelta)
- Número de devoluciones
- Motivo de devolución (si aplica)
- Proveedor responsable

### Exportación de Datos
> 🚧 **En desarrollo**: Próximamente se podrá exportar los detalles a Excel/CSV

---

## ⚠️ Acciones Recomendadas

### Cuando el Cumplimiento Global < 70%
1. ✅ Revisar detalles por indicador individual
2. ✅ Identificar la fase con más retrasos
3. ✅ Programar reunión con el proveedor
4. ✅ Evaluar ajustes en cronogramas
5. ✅ Considerar reasignación de recursos

### Cuando Calidad Primera Entrega < 70%
1. ✅ Revisar motivos específicos de devoluciones
2. ✅ Implementar controles de calidad más estrictos
3. ✅ Capacitar al equipo del proveedor
4. ✅ Establecer checklist de validación pre-entrega
5. ✅ Considerar penalizaciones contractuales

### Cuando un Proveedor Específico Tiene Bajo Desempeño
1. ✅ Generar reporte detallado del proveedor
2. ✅ Agendar reunión de seguimiento
3. ✅ Establecer plan de mejora con fechas específicas
4. ✅ Monitorear semanalmente
5. ✅ Evaluar continuidad del contrato

### Mejores Prácticas
- 📅 Revisar los indicadores **semanalmente**
- 📊 Comparar tendencias **mes a mes**
- 👥 Compartir métricas con **stakeholders**
- 🎯 Establecer **metas trimestrales**
- 📝 Documentar **acciones correctivas**

---

## 🔄 Actualización de Datos

Los indicadores se actualizan:
- **Automáticamente** cuando se registran cambios en los desarrollos
- **En tiempo real** al seleccionar un filtro diferente
- **Refrescados** al recargar la página

> 💡 **Tip**: Si los datos no se reflejan, verifique que el desarrollo esté correctamente registrado con todas sus fechas.

---

## 📞 Soporte

Para preguntas o problemas con los indicadores:
- 📧 Contacte al administrador del sistema
- 📖 Consulte la documentación técnica en `/docs/arquitectura`
- 🐛 Reporte bugs a través del sistema de tickets

---

## 📝 Historial de Versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2025-09-30 | Versión inicial del instructivo |

---

**Última actualización**: 30 de Septiembre de 2025  
**Documento creado por**: Sistema de Gestión de Proyectos TI

