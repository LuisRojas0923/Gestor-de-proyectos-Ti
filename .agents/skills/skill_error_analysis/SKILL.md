---
name: Protocolo de Análisis y Resolución de Errores
description: Prohíbe realizar correcciones de errores sin antes entregar un análisis detallado de la causa raíz y una propuesta de solución clara.
---

# Protocolo de Análisis y Resolución de Errores (Investigator Mode)

Este protocolo es de cumplimiento **OBLIGATORIO** cada vez que el usuario presente un error, fallo, comportamiento inesperado o reporte de bug. Se basa en la "Ley de Hierro": **No existe el arreglo sin investigación previa.**

## 1. Fase de Investigación Estricta
Antes de proponer cualquier cambio, el agente debe:
1.  **Rastrear el Flujo de Datos:** Seguir los datos desde el punto de entrada (API, UI, DB) hasta el punto del fallo.
2.  **Formular Hipótesis:** Listar al menos 2 posibles causas antes de decidirse por una.
3.  **Probar la Hipótesis:** Usar herramientas de lectura, logs o scripts de scratch para confirmar la causa.

## 2. Fase de Análisis Obligatoria
Tras la investigación, presentar al usuario:
1.  **Causa Raíz Verificada**:
    - Identificación exacta del archivo y línea.
    - Evidencia de la investigación (ej: "Confirmado que el valor llega nulo en el paso X").
    - Explicación técnica profunda.
2.  **Propuesta de Solución**:
    - Estrategia para corregirlo.
    - **Plan de Prevención:** Cómo evitaremos que este error (o errores similares) vuelvan a ocurrir.

## 3. Límites de Ejecución (3-Strike Rule)
- El agente tiene un máximo de **3 intentos** para arreglar un bug persistente.
- Si tras 3 intentos el bug sigue ahí, el agente debe detenerse, admitir el bloqueo y pedir una sesión de "Office Hours" con el usuario para replantear el problema.

## 4. Prohibición de Acción Inmediata
- **PROHIBIDO** editar archivos antes de entregar este análisis.
- **PROHIBIDO** usar "vibe coding" (suponer que algo funciona sin probarlo).

> [!IMPORTANT]
> El objetivo es eliminar la deuda técnica y los parches rápidos. Cada error es una oportunidad para fortalecer la arquitectura.
