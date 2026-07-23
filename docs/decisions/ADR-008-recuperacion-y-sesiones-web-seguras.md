# ADR-008: Recuperacion y sesiones web seguras

**Estado:** Aceptado  
**Fecha:** 2026-07-23

## Contexto

Los cambios de privilegios y resets administrativos usaban la cedula como
contrasena temporal. Los JWT web seguian siendo validos despues de invalidar
la fila de sesion y el endpoint de refresh permitia rotaciones concurrentes.
Los tokens JWT de recuperacion tampoco tenian consumo unico persistido.

## Decision

- Las recuperaciones usan tokens opacos aleatorios. Solo se persiste SHA-256.
- Cada token expira en una hora y `ultimo_uso_en` impide su reutilizacion.
- La generacion y el consumo se serializan por usuario con advisory locks de
  PostgreSQL; consumir uno revoca los demas tokens pendientes del usuario.
- Promociones privilegiadas y resets bloquean la clave conocida con un secreto
  aleatorio, revocan sesiones y exigen correo verificado.
- La verificacion incluye SHA-256 del correo normalizado. Cambiar la direccion,
  incluso por sincronizacion ERP, invalida su verificacion y los tokens de
  recuperacion pendientes bajo bloqueo de la fila `Usuario`.
- Cada JWT web debe corresponder a una sesion persistida, activa y no expirada.
- Refresh bloquea la sesion anterior, crea una sucesora y cierra la anterior en
  una sola transaccion. El frontend comparte una unica solicitud de refresh.
- Desactivar una cuenta revoca sus sesiones en la misma transaccion.
- El aprovisionamiento de analistas requiere rol `admin` y nunca usa la cedula
  como contrasena inicial.

## Consecuencias

- Los enlaces JWT de recuperacion emitidos por la implementacion anterior dejan
  de ser validos. Esta ruptura es intencional para garantizar consumo unico.
- El acceso autenticado realiza una consulta adicional a `sesiones`.
- Las cuentas promovidas o reseteadas requieren acceso a un correo previamente
  verificado para establecer una nueva contrasena.
- Varias respuestas 401 concurrentes generan un solo refresh desde el cliente.
