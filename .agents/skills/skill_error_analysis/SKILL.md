---
name: Protocolo de Análisis y Resolución de Errores
description: Prohíbe realizar correcciones de errores sin antes entregar un análisis detallado de la causa raíz y una propuesta de solución clara.
---

# Protocolo de Análisis y Resolución de Errores

Este protocolo es de cumplimiento **OBLIGATORIO** cada vez que el usuario presente un error, fallo, comportamiento inesperado o reporte de bug.

## 1. Fase de Análisis Obligatoria
Ante cualquier error, el agente **NO** debe realizar cambios en el código sin antes presentar:

1.  **Causa Raíz**:
    - Identificación exacta del archivo y línea de código afectada.
    - Explicación técnica del porqué ocurre el error (ej: desbordamiento, falta de sincronización, error de tipo, etc).
    - Impacto del error en la funcionalidad actual.

2.  **Propuesta de Solución**:
    - Descripción clara de la estrategia para corregirlo.
    - Comparativa (si aplica) de por qué esta solución es mejor que otras alternativas.

## 2. Prohibición de Acción Inmediata
- El agente **TIENE PROHIBIDO** ejecutar herramientas de edición de archivos (`replace_file_content`, `multi_replace_file_content`, etc.) antes de que el usuario haya recibido y entendido el análisis previo.
- Solo tras la entrega del análisis y la propuesta de solución, el agente podrá proceder con la corrección (o esperar la aprobación si está en Planning Mode).

## 3. Formato de Entrega
El análisis debe entregarse de forma estructurada usando alertas de GitHub (TIP/IMPORTANT/CAUTION) para resaltar la gravedad y la solución propuesta.

> [!IMPORTANT]
> El objetivo de esta skill es evitar "parches" rápidos que no ataquen el problema de fondo y asegurar que el usuario siempre entienda qué se está modificando y por qué.
