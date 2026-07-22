# Revisión docs/tests final — posicionamiento de `ColumnFilterPopover`

**Fecha:** 2026-07-22  
**Alcance:** `frontend/src/components/molecules/ColumnFilterPopover.tsx` y `frontend/src/components/__tests__/ConsolidatedTableById.test.tsx`  
**Modo:** revisión estática read-only  
**Resultado:** `approved_with_risks`

## Veredicto

La prueba final cubre los requisitos solicitados del posicionamiento:

- **Viewport móvil:** fija `window.innerWidth/innerHeight` en `260x300` y define un `visualViewport` de `260x300`; con un ancla próxima al borde inferior verifica `top: 10px` y `width: 240px`.
- **`max-height`:** verifica en el diálogo `maxHeight: min(350px, calc(100dvh - 20px))`.
- **Eventos `visualViewport`:** comprueba el registro de listeners para `resize` y `scroll` mediante `addEventListener`.
- **Restauración del entorno:** conserva y restaura el descriptor original de `visualViewport` y las dimensiones de ventana en un bloque `finally`.

La comparación estática con la versión base confirma que los tests existentes se conservan: no desaparece ningún caso previo; el caso de posicionamiento existente fue ampliado y se añadieron casos de semántica de selección y estructura de tabla. La evidencia entregada reporta **150 passed / 2 skipped** y **build exitoso**.

## Hallazgos

### Bloqueantes

Ninguno dentro del alcance solicitado.

### Riesgos / hardening no bloqueante

1. La prueba verifica el **registro** de los listeners `visualViewport`, pero no invoca las funciones capturadas para demostrar que un `resize` o `scroll` posterior actualiza las coordenadas, ni comprueba la desuscripción efectiva al desmontar. Si el criterio de aceptación exige el comportamiento dinámico completo y no solo el wiring, debe añadirse esa prueba focalizada.
2. `tsc -b` global continúa siendo una puerta condicional conocida por fallar en `RequirementsTab.tsx`, fuera del alcance revisado. No invalida la evidencia de Vitest ni el build reportados.

## Tests y comandos

- Suite frontend: **PASS — 150 passed / 2 skipped** (evidencia proporcionada; no ejecutada por este revisor read-only).
- Build frontend: **PASS** (evidencia proporcionada; no ejecutado por este revisor read-only).
- No se requieren pruebas backend: el cambio es exclusivo de frontend.
- No se requieren cambios en `docs/ESQUEMA_BASE_DATOS.md`, ADRs ni catálogo: no hay modelos, esquema, arnés ni una suite nueva; el catálogo ya registra `ConsolidatedTableById.test.tsx`.

## Decisión final

**Aprobado con riesgos (`approved_with_risks`)** para la cobertura final del posicionamiento. No quedan bloqueos dentro del alcance. El único seguimiento recomendado es probar el disparo y la limpieza de los callbacks de `visualViewport` si esa garantía forma parte del contrato de integración.
