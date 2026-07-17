# Alcance y Evidencia de PR #17 (dbb5eb5e)

Este documento justifica la modificación transversal de 62 archivos en la PR #17 y certifica la estabilización de su evidencia.

## 1. Alcance Transversal (Cross-cutting Scope)

La PR #17 abarca múltiples módulos aparentemente desconectados, pero que responden a la necesidad de estabilizar la capa de **Auditoría, Concurrencia y UI** antes del pase a producción:

- **Auditoría y Auth:** El dashboard de indicadores requería que el JWT emitido en el login y la Sesión de base de datos compartieran un mismo `jti` para permitir que el handshake del WebSocket validara correctamente la identidad. Esto requirió modificar el `login_router.py` y el `sesion_service.py`. Adicionalmente, se cambió la validación de Origin del WebSocket a un modelo de allowlist estricta y se integró un *deadline monotónico* de 60s para garantizar revalidación de permisos constante.
- **Reservas (Concurrencia):** Se eliminó el patrón `check-then-insert` vulnerable a condiciones de carrera, delegando la exclusión temporal a PostgreSQL mediante un constraint `EXCLUDE USING gist`. Esto tocó esquemas, routers y tests del módulo de reservas.
- **Frontend (DataTable y UI):** Se solventó un error donde la navegación por teclado (Enter/Espacio) sobre inputs y botones anidados en el `DataTable` disparaba el evento `onRowClick` de la fila. Se migró el tipado relajado (`any`) en los componentes de Auditoría (`TiposFallos`, `useAuditoriaStats`) a un tipado estricto, permitiendo el pase verde del CI de TypeScript (`npx tsc`).

## 2. Estabilización de la Evidencia (CI/CD)

Anteriormente, los reportes declaraban PASS mientras el runner de GitHub registraba fallos generalizados. Se han solventado las discrepancias que rompían el build:

- **TypeScript y Build Frontend:** Se corrigieron las regresiones de tipado en `AuditoriaIndicadores/index.test.tsx`, `utils/humanizer.ts` y componentes hijos. El frontend vuelve a compilar sin errores de linter.
- **Backend Tests (Errores de recolección):** Se solucionó el `InvalidRequestError` (Table 'rooms' is already defined) introduciendo `__table_args__ = {'extend_existing': True}` en los modelos de `reserva_salas`, permitiendo que el arnés de Pytest recolecte y corra los tests sin colisión de metadata.
- **Errores de sintaxis:** Se corrigió un `IndentationError` introducido previamente en `test_auditoria_ws.py` que bloqueaba todo el suite de WebSockets.
- **Limpieza del Git Tree:** 
  - Se removió `frontend/dist/` (assets compilados redundantes) del tracking de git.
  - Se eliminaron decenas de errores de "trailing whitespace" que fallaban el paso `git diff --check`.
  - Se borró el workflow `.agents/workflows/validate_pr.md` colocado fuera de la ruta canónica (`.agent/`).

Con estos cambios, la PR #17 garantiza que el código sea empíricamente confiable y las verificaciones del CI de GitHub coincidan con el catálogo local de pruebas.
