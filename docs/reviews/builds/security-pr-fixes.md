# Security Review: PII Masking & WebSocket RBAC

## Executive Summary
**Status**: `approved`

The recent changes successfully implement PII masking in audit records and establish robust RBAC protection for the `/api/v2/auditoria/ws/dashboard` WebSocket endpoint.

## Findings

### 1. PII Masking in Audit Records
- PII and sensitive data masking are implemented at insertion time in `ServicioAuditoria.registrar()`. This ensures that sensitive payload data never reaches the database.
- A robust dictionary of sensitive keys is utilized (`_CLAVES_SENSIBLES`), redacting values for keys like `password`, `cedula`, `documento`, `token`, etc.
- An additional set of keys (`_CLAVES_SENSIBLES_LINEAS`) is applied conditionally based on the module (`lineas_corporativas`), further protecting specific PII.
- Identifiers in URLs are successfully masked through regex when necessary (`_anonimizar_identidad_entidad`).
- Nested dictionaries and lists are correctly traversed by the `_enmascarar_valor` recursion.

### 2. WebSocket Endpoint (`/ws/dashboard`) Authentication & RBAC
- **Token Transmission**: The WebSocket expects the JWT token via the `Sec-WebSocket-Protocol` header (`subprotocols`), avoiding token leakage in standard query strings.
- **Authentication**: Validation occurs strictly before `websocket.accept()`. Missing or invalid tokens result in an immediate closure with code `1008`.
- **RBAC Enforcement**: The logic properly identifies the user's role and checks for the `MODULO_AUDITORIA` permission. Unauthorized users are rejected before the connection is accepted.
- Connection maintenance is properly handled.

### 3. General Security Compliance
- All new standard API endpoints use `Depends(obtener_usuario_actual_db)` indirectly through `requiere_permiso_auditoria`.
- No `print()` statements are used (only `logger` instances).
- No hardcoded secrets were introduced.
