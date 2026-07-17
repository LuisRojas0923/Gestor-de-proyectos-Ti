# Routing de seguridad

Cuando el alcance incluya auth, RBAC, roles, permisos, datos sensibles, variables de entorno, Docker, infraestructura o integraciones externas:

- Consulta `.opencode/agent/harness-router.md` con el alcance actual y ejecuta directamente cada persona requerida.
- Lee la definicion canonica y las referencias obligatorias de cada persona devuelta por el router.
- No abras archivos de secretos ni hagas peticiones de red para completar la revision.
- Trata cualquier capacidad de Antigravity como una herramienta del orquestador, no como un permiso implicito para la persona revisora.
- No mantengas una matriz de routing ni checklists paralelos en esta regla.
