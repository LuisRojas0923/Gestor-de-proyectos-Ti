# Plan de agrupación — Gestión de Tiempo y Asistencia

**Fecha:** 2026-07-11
**Plan:** Agrupar horarios, horas extras y biometría en una sección única del Portal de Servicios
**Autor del plan:** OpenCode
**Modo:** plan
**Proyecto:** Gestor-de-proyectos-Ti
**Estado:** Aprobado con riesgos

---

## 1. Objetivo

Reemplazar los accesos independientes de Horas Extras, Biometría, Plantillas de horario y Alcance de empleados del tablero principal por una única entrada llamada **Gestión de Tiempo y Asistencia**.

La nueva entrada abrirá un hub interno, equivalente al flujo de Gestión de Viáticos, que agrupe las funciones existentes en cuatro secciones:

1. Asistencia.
2. Planificación de horarios.
3. Horas extras.
4. Administración.

La reorganización debe mejorar la navegación sin cambiar contratos API, lógica de negocio, permisos RBAC ni rutas profundas existentes.

## 2. No-objetivos

- No modificar endpoints, servicios, modelos, migraciones ni contratos del backend.
- No crear un permiso RBAC paraguas para Tiempo y Asistencia.
- No cambiar la semántica de los permisos existentes.
- No fusionar las pantallas funcionales en un único componente monolítico.
- No reemplazar la validación remota de capacidades que realiza `BiometriaModule`.
- No rediseñar los procesos internos de cálculo, planificación, pre-liquidación o enrolamiento.
- No eliminar rutas profundas existentes ni romper enlaces guardados.
- No incluir el cambio pendiente de `frontend/package-lock.json`; pertenece a la reparación de dependencias anterior.
- No copiar literalmente `ViaticosManagement`, porque su tarjeta local tiene deuda de accesibilidad y tokens visuales.

## 3. Diagnóstico actual

`DashboardView` expone cuatro tarjetas relacionadas como entradas independientes:

- Horas Extras y Pre-liquidación.
- Biometría y Asistencia.
- Plantillas de horario.
- Alcance de empleados.

`ServicePortal.tsx` también duplica parte de la resolución del destino inicial de Horas Extras. En contraste, Viáticos tiene una sola tarjeta principal que abre `ViaticosManagement`, donde las opciones internas se filtran según permisos.

Las rutas funcionales de Horas Extras, Biometría y Alcance ya tienen guardas independientes en `featureRoutes.tsx`. Estas guardas son la autoridad de navegación y deben conservarse.

## 4. Arquitectura propuesta

### 4.1 Entrada única

Agregar una sola tarjeta **Gestión de Tiempo y Asistencia** en `DashboardView`.

La tarjeta se muestra únicamente cuando el registro centralizado produce al menos una opción visible para el usuario:

```text
mostrarHub = opcionesVisibles.length > 0
```

No se concederá acceso por rol (`admin`, `director`, `manager`) si el usuario no tiene un permiso explícito de los módulos agrupados.

La búsqueda del dashboard debe encontrar la tarjeta mediante el título, descripción y alias: `biometría`, `asistencia`, `horarios`, `horas extras`, `plantillas` y `alcance`.

### 4.2 Hub funcional

Crear un módulo en `frontend/src/pages/ServicePortal/pages/GestionTiempoAsistencia/` con responsabilidades separadas:

- `index.tsx`: coordina permisos, estados de módulo y navegación.
- `GestionTiempoAsistenciaSection.tsx`: presenta una sección del hub.
- `gestionTiempoAsistenciaConfig.ts`: registro tipado y única fuente de verdad para metadatos y visibilidad.
- Tipos locales únicamente si no caben de forma clara en la configuración.

El hub utilizará componentes atómicos y moleculares existentes. Debe tener una columna en móvil, dos en tablet y máximo tres en escritorio.

### 4.3 Tarjetas accesibles

Corregir y reutilizar `ServiceCard` en lugar de crear otra tarjeta local.

La interacción debe usar `Button` o una primitiva accesible equivalente del sistema de diseño, con:

- Semántica de botón o enlace.
- Activación por teclado.
- Foco visible.
- Nombre accesible.
- Tokens CSS para color, borde y superficie.
- Sin etiquetas `div` clicables ni colores Tailwind estáticos nuevos.

La corrección de `ServiceCard` debe mantener compatibilidad con sus consumidores existentes.

### 4.4 Autenticación y autorización del hub

`ProtectedRoute` solo admite un `moduleCode`, mientras el hub necesita una política OR. No se usará un permiso representativo ni varios `ProtectedRoute` anidados.

La ruta del hub se registrará bajo el portal autenticado mediante `ProtectedRoute` sin `moduleCode`. Dentro del hub:

1. Normalizar `permissions` con `user?.permissions ?? []`.
2. Calcular las opciones visibles por coincidencia exacta de permiso y disponibilidad del módulo.
3. Derivar la visibilidad de la tarjeta principal de ese mismo resultado.
4. Si no existen opciones, fallar cerrado y mostrar un `Callout` con el botón **Volver al inicio**.

Esta política controla navegación y presentación, pero no reemplaza las guardas de ruta ni el RBAC backend.

### 4.5 Biometría

El hub ofrecerá una sola opción **Biometría y asistencia**, protegida por `biometria`.

No mostrará tarjetas separadas para Mi asistencia y Asistencia del equipo. `BiometriaModule` continuará consultando `obtenerCapacidadesBiometria`, resolviendo carga, error y reintento, y decidiendo si habilita la supervisión del equipo.

## 5. Matriz de navegación y permisos

| Sección | Opción | Ruta existente | Permiso exacto | Disponibilidad |
|---|---|---|---|---|
| Asistencia | Biometría y asistencia | `/service-portal/biometria` | `biometria` | Conservar semántica actual; no depender del estado padre de HE |
| Planificación | Planificador semanal | `/service-portal/horas-extras/planificador` | `nomina_horas_extras.planificar` | `nomina_horas_extras !== false` |
| Planificación | Horario semanal | `/service-portal/horas-extras/horario` | `nomina_horas_extras.planificar` | `nomina_horas_extras !== false` |
| Planificación | Empleados y disponibilidad | `/service-portal/horas-extras/empleados` | `nomina_horas_extras.leer` | `nomina_horas_extras !== false` |
| Planificación | Plantillas de horario | `/service-portal/horas-extras/plantillas` | `nomina_horas_extras.plantillas_horario.administrar` | Conservar semántica actual de la tarjeta independiente |
| Horas extras | Pre-liquidación | `/service-portal/horas-extras/pre-liquidacion` | `nomina_horas_extras.planificar` | `nomina_horas_extras !== false` |
| Horas extras | Cálculos | `/service-portal/horas-extras/calculos` | `nomina_horas_extras.leer` | `nomina_horas_extras !== false` |
| Horas extras | Novedades | `/service-portal/horas-extras/novedades` | `nomina_horas_extras.leer` | `nomina_horas_extras !== false` |
| Horas extras | Bolsa de horas | `/service-portal/horas-extras/bolsa` | `nomina_horas_extras.leer` | `nomina_horas_extras !== false` |
| Horas extras | Costos por OT | `/service-portal/horas-extras/costos-ot` | `nomina_horas_extras.leer` | `nomina_horas_extras !== false` |
| Administración | Festivos | `/service-portal/horas-extras/festivos` | `nomina_horas_extras.leer` | `nomina_horas_extras !== false` |
| Administración | Configuración de horas extras | `/service-portal/horas-extras/configuracion` | `nomina_horas_extras.admin` | `nomina_horas_extras !== false` |
| Administración | Alcance de empleados | `/service-portal/alcance-empleados` | `alcance_empleados.administrar` | Conservar semántica actual de la tarjeta independiente |

Los permisos `nomina_horas_extras.confirmar` y `nomina_horas_extras.compensar` no son permisos de entrada a una pantalla. No se usarán para mostrar el hub salvo que en el futuro exista una ruta navegable protegida específicamente por ellos.

## 6. Rutas y compatibilidad

- Agregar `/service-portal/tiempo-asistencia` como ruta del hub.
- Registrar el lazy import y la ruta en `featureRoutes.tsx`, evitando aumentar `ServicePortal.tsx`, que ya está cerca del límite de 550 líneas.
- Cambiar `/service-portal/horas-extras` para redirigir al nuevo hub.
- Conservar sin cambios todas las rutas profundas y su `moduleCode` actual.
- No renombrar rutas de Biometría, Plantillas o Alcance.
- Mantener los deep links y favoritos actuales.

## 7. Matriz de retornos

| Pantalla | Retorno esperado |
|---|---|
| Hub Tiempo y Asistencia | `/service-portal/inicio` |
| Biometría y asistencia | `/service-portal/tiempo-asistencia` |
| Plantillas de horario | `/service-portal/tiempo-asistencia` |
| Alcance de empleados | `/service-portal/tiempo-asistencia` |
| Vistas HE de primer nivel que hoy vuelven a `/horas-extras` | Hub mediante la redirección de `/service-portal/horas-extras` |
| Detalle de cálculo | Lista de cálculos |
| Formulario o detalle de novedad | Lista de novedades |
| Flujos internos del planificador o pre-liquidación | Conservar su padre funcional actual |

No reemplazar indiscriminadamente `navigate(-1)`. Los accesos directos deben tener un retorno determinista dentro del portal.

## 8. Pasos de implementación

1. Crear el registro tipado de secciones, opciones, rutas, permisos, alias y reglas de disponibilidad.
2. Extraer helpers puros para obtener opciones visibles y determinar si el hub está disponible.
3. Corregir `ServiceCard` para que la interacción sea accesible y use únicamente tokens del sistema de diseño.
4. Implementar `GestionTiempoAsistenciaSection` y el hub mobile-first.
5. Incorporar estados de carga necesarios, estado sin opciones, `Callout` y retorno al inicio.
6. Registrar `/tiempo-asistencia` en `featureRoutes.tsx` sin alterar las guardas existentes.
7. Sustituir las cuatro tarjetas independientes de `DashboardView` por la tarjeta única, usando el mismo helper de visibilidad.
8. Eliminar la resolución duplicada del destino inicial de Horas Extras y redirigir `/horas-extras` al hub.
9. Agregar retornos explícitos en Biometría, Plantillas y Alcance; conservar la jerarquía de listas, detalles y formularios.
10. Añadir pruebas parametrizadas de permisos, estados de módulo, navegación, accesibilidad y compatibilidad.
11. Actualizar documentación frontend, catálogo de pruebas y evidencia de build.

## 9. Criterios de aceptación

- El dashboard muestra exactamente una tarjeta **Gestión de Tiempo y Asistencia** cuando existe al menos una opción autorizada.
- Las tarjetas independientes de Horas Extras, Biometría, Plantillas y Alcance dejan de aparecer en el dashboard.
- La tarjeta no aparece para usuarios sin permisos navegables.
- El acceso directo al hub sin opciones falla cerrado y no revela datos.
- Cada sección vacía se oculta.
- Cada opción usa el permiso exacto de su ruta; `leer`, `planificar`, `admin` y Plantillas no se consideran equivalentes.
- No existen bypasses por rol.
- Biometría conserva su validación dinámica de supervisión.
- Todas las rutas profundas mantienen su path y `ProtectedRoute` actual.
- Los retornos de primer nivel conducen al hub y los detalles regresan a su lista padre.
- La tarjeta y las opciones funcionan con teclado, tienen foco visible y nombres accesibles.
- El diseño funciona en móvil, tablet y escritorio, y en temas claro y oscuro.
- La búsqueda del dashboard encuentra la tarjeta por los alias de las funciones agrupadas.
- Ningún archivo supera 550 líneas como resultado del cambio.

## 10. Pruebas requeridas

### 10.1 Configuración y RBAC visual

Crear pruebas para la configuración centralizada:

- Un permiso aislado produce únicamente sus opciones.
- La combinación de permisos produce una unión sin duplicados.
- Permisos vacíos o `undefined` no producen opciones.
- `moduleStatus.nomina_horas_extras === false` oculta las opciones HE sujetas al módulo sin ocultar Biometría, Plantillas o Alcance de forma incidental.
- Cada opción conserva ruta y permiso exactos.

### 10.2 Dashboard

- Con cualquiera de los permisos navegables aparece una sola tarjeta.
- Las cuatro tarjetas anteriores desaparecen.
- Sin permisos no aparece el hub.
- La tarjeta navega a `/service-portal/tiempo-asistencia`.
- La búsqueda funciona por título y alias.

### 10.3 Hub

- Casos aislados para `biometria`, `leer`, `planificar`, `admin`, Plantillas y Alcance.
- Secciones vacías ocultas.
- Estado sin opciones con retorno al inicio.
- Navegación correcta de cada opción.
- Activación por Enter/Espacio, foco visible y roles accesibles.
- Una, dos y tres columnas según viewport.

### 10.4 Rutas y retornos

- Ampliar `servicePortalFeatureRoutes.test.tsx` para verificar la nueva ruta y preservar rutas/guardas históricas.
- Confirmar que `/service-portal/horas-extras` redirige al hub.
- Probar retornos de Biometría, Plantillas, Alcance y una vista representativa de cada grupo HE.
- Mantener pruebas actuales de `BiometriaModule`, Plantillas y Alcance.

## 11. Comandos de validación

```powershell
npm --prefix frontend run test -- --run src/tests/gestionTiempoAsistenciaConfig.test.ts src/tests/DashboardView.test.tsx src/tests/GestionTiempoAsistenciaHub.test.tsx src/tests/servicePortalFeatureRoutes.test.tsx src/tests/GestionTiempoAsistenciaReturns.test.tsx
npm --prefix frontend run test -- --run src/tests/BiometriaModule.test.tsx src/tests/PlantillasHorarioPage.test.tsx src/tests/AlcanceEmpleados.test.tsx
npm --prefix frontend exec -- tsc --noEmit --pretty false
npm --prefix frontend run build
npm --prefix frontend run test -- --run
```

Ejecutar lint focal sobre los archivos modificados y registrar por separado el resultado del lint global si el baseline del repositorio continúa rojo.

## 12. Impacto en documentación

- [x] Plan en `docs/reviews/plans/`.
- [x] Actualizar `docs/ARQUITECTURA_FRONTEND.md` con el registro centralizado de navegación y su límite frente al RBAC real.
- [x] Registrar suites nuevas en `testing/CATALOGO_PRUEBAS.md`.
- [x] Crear evidencia en `docs/reviews/builds/` al finalizar.
- [x] Registrar la sesión en `docs/bitacora/` si la implementación se completa.
- [ ] No requiere `docs/ESQUEMA_BASE_DATOS.md`.
- [ ] No requiere ADR mientras no cambien permisos, contratos ni rutas públicas.

## 13. Archivos y módulos previstos

- `frontend/src/pages/ServicePortal/pages/DashboardView.tsx`
- `frontend/src/pages/ServicePortal/pages/GestionTiempoAsistencia/`
- `frontend/src/pages/ServicePortal/routes/featureRoutes.tsx`
- `frontend/src/components/molecules/ServiceCard.tsx`
- `frontend/src/pages/ServicePortal/pages/Biometria/BiometriaModule.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/PlantillasHorario/index.tsx`
- `frontend/src/pages/ServicePortal/pages/AlcanceEmpleados/index.tsx`
- Vistas HE de primer nivel que tengan retorno explícito al índice anterior.
- `frontend/src/tests/`
- `docs/ARQUITECTURA_FRONTEND.md`
- `testing/CATALOGO_PRUEBAS.md`
- `docs/reviews/builds/`

`backend_v2/`, aplicaciones móviles, Docker y configuración de infraestructura quedan fuera del alcance.

## 14. Evaluación de riesgos

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Ocultar una función permitida | Media | Matriz tipada única y pruebas por permiso aislado |
| Mostrar una función no autorizada | Media | Coincidencia exacta, sin bypass por rol, y guardas finales intactas |
| Convertir la visibilidad frontend en falsa autoridad RBAC | Media | Documentar que el registro solo controla UX; conservar `ProtectedRoute` y backend |
| Romper enlaces guardados | Baja | Mantener todas las rutas profundas existentes |
| Perder contexto al volver | Media | Matriz explícita de retornos y pruebas de navegación directa |
| Duplicar lógica entre dashboard y hub | Media | Derivar ambos desde el mismo registro y helper |
| Regresión de accesibilidad al copiar Viáticos | Alta | Corregir `ServiceCard` con primitiva interactiva accesible y pruebas de teclado |
| Exceder el límite de `ServicePortal.tsx` | Media | Registrar lazy route en `featureRoutes.tsx` y usar módulo separado |
| Cambiar incidentalmente `moduleStatus` | Media | Preservar la semántica actual por opción y probarla explícitamente |
| Permisos `confirmar/compensar` asignados de forma aislada | Baja | Verificar asignaciones; no tratarlos como permisos navegables |

## 15. Matriz de subagentes

```text
Subagente             | Motivo                                      | Resultado             | Bloquea
----------------------|---------------------------------------------|-----------------------|--------
harness-router        | Determinar revisores del plan               | frontend/scope/RBAC   | no
scope-reviewer        | Alcance, compatibilidad y límites           | approved_with_risks   | no
frontend-reviewer     | Arquitectura, UX, accesibilidad y responsive| approved_with_risks   | no
security-rbac-reviewer| Política any-of y permisos exactos          | approved_with_risks   | no
docs-tests-reviewer   | Cobertura, comandos y documentación         | approved_with_risks   | no
```

Los bloqueos iniciales del revisor frontend quedaron resueltos al definir la guarda `any-of`, mantener una sola opción biométrica y exigir tarjetas accesibles.

## 16. Decisión final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

La implementación puede comenzar cuando se preserve la matriz exacta de permisos y rutas definida en este plan. Cualquier cambio de permisos backend, semántica de `moduleStatus` o eliminación de rutas exige volver a revisión de alcance y seguridad.

## 17. Ajustes aprobados durante la validación UX

Durante la revisión funcional del hub, el usuario aprobó estos ajustes sin eliminar rutas, datos ni contratos backend:

- Retirar del hub los accesos redundantes `Empleados y disponibilidad`, `Novedades` y `Bolsa de horas`; sus capacidades permanecen integradas o disponibles por compatibilidad.
- Presentar la pre-liquidación como `Calculadora individual de horas extras` para diferenciarla del Planificador masivo.
- Rediseñar Configuración de horas extras con tarjetas por grupo, carga skeleton, estado de cambios pendientes y comportamiento mobile-first.
- Exigir una justificación nueva cuando cambia un valor legal, validar formatos y coherencia básica de topes, mostrar errores persistentes y confirmar antes de descartar cambios.

Estos ajustes reducen opciones del hub sin modificar permisos RBAC, `moduleStatus`, endpoints ni rutas históricas.
