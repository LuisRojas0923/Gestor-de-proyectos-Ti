Mobile review: approved

Scope: clasificación móvil de `frontend/src/components/molecules/{FilterDropdown,DataTable,FilePicker}.tsx` y `frontend/src/pages/DevelopmentDetail.tsx` con su WBS, frente a `modulo_actividades_fork/` y `movil/`.
Date: 2026-07-16

Findings:
- No hay duplicados directos de `FilterDropdown`, `DataTable`, `FilePicker`, `DevelopmentDetail`, `WbsTab`, `WbsColumns`, `WbsNodeModal` ni `WbsDetailModal` en `modulo_actividades_fork/` o `movil/`.
- El HTML reportado pertenece al frontend web: `FilterDropdown` usa `react-dom`, `DOMRect`, `document` y `window`; `DataTable` usa elementos DOM, `ResizeObserver` y drag/drop HTML; `FilePicker` usa `File`, `HTMLInputElement` y `React.DragEvent`; `DevelopmentDetail` usa React Router y compone el WBS web mediante `WbsTab`/`DataTable`.
- `movil/` es una aplicación Expo/React Native de GeoFace. No contiene rutas, tipos, servicios ni pantallas de desarrollos/WBS, y sus listas usan primitivas nativas como `FlatList`; no requiere cambios por este reporte HTML.
- `modulo_actividades_fork/frontend/` sí tiene solapamiento funcional histórico con actividades y contiene copias web de componentes de actividad, pero no una copia del shell WBS actual ni de los tres componentes compartidos reportados. `INSTRUCCIONES_FORK.md` lo define como frontend React + TypeScript + Tailwind y `frontend/molecules/Modal.tsx` confirma uso de `react-dom`/`document`; tampoco es implementación React Native.
- Si el auditor HTML debe cubrir también el artefacto portable, los archivos adicionales concretos son `modulo_actividades_fork/frontend/molecules/Modal.tsx`, `modulo_actividades_fork/frontend/atoms/Input.tsx`, `modulo_actividades_fork/frontend/molecules/{ActivityForm,ActivityCard}.tsx` y `modulo_actividades_fork/frontend/organisms/activities/{ActivityCreateModal,ActivityEditModal,ActivityDeleteModal}.tsx`, además de sus `components/WizardStep*.tsx`. Ese sería alcance web duplicado/portable, no alcance móvil.

Required checks:
- Para una corrección posterior en los archivos de `frontend/src`: ejecutar `npm run lint` y `npm run test` desde `frontend/`.
- No aplican checks de `movil/` porque no hay código móvil afectado.
- `modulo_actividades_fork/frontend/` no contiene `package.json`, por lo que no ofrece scripts propios `npm run lint`/`npm run test`; cualquier sincronización debe validarse en el proyecto web destino.
- `AGENTS.md` no fija una versión Node concreta. Los lockfiles actuales exigen Node 20 o superior para varias dependencias; usar el entorno Node 20 aprobado por el proyecto al ejecutar checks.

Offline/performance risks:
- Ninguno para el runtime móvil actual: no se incorporan tablas DOM, selectores de archivos web ni WBS en `movil/`.
- Si WBS se porta a móvil en el futuro, no debe copiarse literalmente: requerirá `FlatList`/virtualización, UI nativa de filtros/documentos, cola de mutaciones y resolución de conflictos offline. El WBS web actual depende de llamadas inmediatas a API y solo persiste localmente el orden visual.

Blocking reasons:
- Ninguno. El reporte HTML queda correctamente acotado al frontend web; no se requieren ediciones en `modulo_actividades_fork/` ni `movil/` por los archivos nombrados.
