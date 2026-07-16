# Revisión de Backend: Fixes de PII y WebSocket RBAC

## Veredicto
**blocked**

## Hallazgos (Findings)

1. **PII Masking (`backend_v2/app/services/auditoria/servicio.py`)**
   - **Lógica:** Se implementó correctamente `_anonimizar_identidad_entidad` para enmascarar rutas e identificadores de `persona_linea` en el módulo `lineas_corporativas`. Además, se añadieron `_CLAVES_SENSIBLES_LINEAS` que se fusionan con `_CLAVES_SENSIBLES` cuando corresponde.
   - **Async Safety:** Correcto. Las funciones de enmascaramiento son síncronas puro (operaciones en memoria sobre diccionarios y strings). No hay I/O bloqueante.
   - **PostgreSQL Compliance:** Correcto. Solo procesan los datos antes del `insert`.
   - **Problema:** No hay pruebas unitarias para el enmascaramiento condicional de `lineas_corporativas` ni para `_anonimizar_identidad_entidad`.

2. **WebSocket RBAC (`backend_v2/app/api/auditoria/router.py`)**
   - **Lógica:** El token ahora se extrae de `subprotocols`, lo que evita la exposición del token en logs de URL.
   - **RBAC:** Se implementó la verificación de permisos correctamente usando `ServicioAuth.obtener_permisos_por_rol(db, usuario.rol)`.
   - **Async Safety:** Correcto. Las llamadas a la base de datos `obtener_usuario_por_cedula` y `obtener_permisos_por_rol` utilizan `await` adecuadamente.
   - **Problema:** Faltan pruebas. El archivo `testing/backend/test_auditoria_ws.py` solo prueba los casos de ausencia de token y token inválido. No se prueban los escenarios donde el usuario no tiene los permisos necesarios (código 1008, "Sin permiso para auditoría") o el *happy path* de una conexión exitosa.

## Pruebas Requeridas (Required Tests)

De acuerdo al **Backend Testing Mandate**, es necesario agregar:

- **Para PII Masking (`testing/backend/test_auditoria_acciones.py` o un archivo nuevo):**
  - Prueba donde `modulo="lineas_corporativas"` verifique que claves como `nombre_asociado` se redacten y que los arreglos o diccionarios anidados también se filtren correctamente.
  - Prueba para `_anonimizar_identidad_entidad` que demuestre que `entidad_id` y `ruta` se enmascaran si `modulo="lineas_corporativas"` y `entidad_tipo="persona_linea"`.

- **Para WebSocket RBAC (`testing/backend/test_auditoria_ws.py`):**
  - Prueba que valide que si un usuario no tiene el permiso `auditoria_sistema`, el WebSocket se cierre con código `1008`.
  - Prueba de un *happy path* con un usuario que sí tiene permisos, verificando que la conexión sea aceptada.
