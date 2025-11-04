## Instructivo - Bot de Gestión Documental

### Descripción
El Bot de Gestión Documental es una aplicación de escritorio (Tk/ttkbootstrap) que asiste en la organización, verificación y acciones operativas sobre desarrollos locales. La interfaz centraliza:
- Carga/actualización de datos desde servicio o escaneo local.
- Vistas de acciones y controles de calidad.
- Utilidades relacionadas con Docker y verificación de desarrollos.

Archivo principal: `bot-gestion-documental/bot_main.py` (clase `SimpleDocumentBot`).

### Requisitos
- Windows 10/11.
- Python 3.10+.
- Librerías Python: `ttkbootstrap`, `tkinter` (incluido), y dependencias declaradas por los módulos auxiliares del bot.
- Acceso al directorio base de desarrollos configurado en el bot.

Nota: El proyecto general usa PostgreSQL para datos de la plataforma; este bot no requiere conexión directa a BD para su operación principal.

### Instalación
1) Crear y activar entorno virtual (recomendado):
```bash
python -m venv .venv
.venv\Scripts\activate
```
2) Instalar dependencias mínimas:
```bash
pip install ttkbootstrap
```
3) Ubicar el bot en: `Gestor-de-proyectos-Ti/bot-gestion-documental/`.

Si se usa el entorno Docker del proyecto para desarrollo, mantenerlo activo sólo si alguna función auxiliar lo requiere. El bot como tal corre en local.

### Configuración
- Ruta base de desarrollos: en `bot_main.py` atributo `self.base_path`.
  - Valor por defecto (ejemplo): `C:/Users/<usuario>/OneDrive - Grupo Coomeva/PROYECTOS DESARROLLOS/Desarrollos`
- Pantalla activa: se persiste en `settings.json` junto al `bot_main.py`.
- Módulos auxiliares: el bot delega en helpers/vistas (`UIHelpers`, `QualityControlValidator`, `BotMainHelpers`, etc.). Ver archivos en el mismo directorio del bot.

Recomendación: validar que la ruta `base_path` exista y tenga permisos de lectura/escritura.

### Ejecución
Desde la raíz del repo o dentro de `bot-gestion-documental/`:
```bash
python bot_main.py
```
La ventana inicia con tema `darkly` y tamaño 1400x720. El log inferior registra eventos de operación.

### Uso de la Interfaz

4) Funciones principales

- Actualizar (🔄)
  - Qué hace: Obtiene información desde el servicio mediante `UIHelpers.load_data_from_service()` y rellena el árbol principal con los desarrollos.
  - Precondiciones: conectividad con el servicio y `self.base_path` válido si se usan rutas derivadas.
  - Resultado esperado: el árbol muestra filas nuevas/actualizadas; el log indica éxito o detalle de error.
  - Errores comunes: árbol vacío (servicio caído o filtros activos), permisos insuficientes en disco si se requiere lectura/escritura.

- Vista de Acciones (🎯)
  - Qué hace: Abre una ventana dedicada con operaciones sobre los elementos seleccionados del árbol (p. ej., abrir carpeta, crear estructura, ejecutar utilidades).
  - Cómo usarla: seleccione una fila en el árbol de `home` y luego abra la vista. Las acciones se habilitarán según el contexto.
  - Resultado esperado: cada acción registra en el log su inicio/fin y detalla cualquier incidencia.
  - Buenas prácticas: validar previamente con "Verificar Desarrollos" para evitar operaciones sobre estructuras incompletas.

- Verificar Desarrollos (🔍)
  - Qué hace: Ejecuta controles de calidad/estructura vía validadores (p. ej. `QualityControlValidator`).
  - Cuándo usarla: antes de crear carpetas/archivos o previo a ejecutar procesos dependientes.
  - Resultado esperado: listado de hallazgos y recomendaciones en el log; si todo está bien, se indica conformidad.
  - Errores comunes: rutas inexistentes (ajustar `self.base_path`), estructuras parciales (corregir según recomendaciones).

- Docker (🐳)
  - Qué hace: Proporciona accesos a utilidades relacionadas con contenedores para flujos que lo requieran.
  - Requisitos: tener Docker Desktop instalado y en ejecución si se invocan acciones que lo utilicen.
  - Resultado esperado: comandos ejecutados correctamente y confirmación por log.
  - Riesgos: operaciones largas pueden bloquear si se ejecutan en el hilo principal; esperar a que finalicen.

- Otras Funciones (⚙️)
  - Qué hace: Reúne utilitarios adicionales (mantenimiento, generación de artefactos u otras herramientas).
  - Uso: revisar cada opción; normalmente operan sobre la selección del árbol o sobre la ruta base configurada.
  - Resultado esperado: mensajes claros en log; si una función requiere configuración extra, el log lo indicará.

- Cerrar (❌)
  - Qué hace: Finaliza la aplicación de forma segura.
  - Recomendación: antes de cerrar, confirmar en el log que no hay procesos en curso.

La navegación embebida está deshabilitada; las vistas avanzadas se abren como ventanas dedicadas (Toplevel). La pantalla `home` muestra el árbol y filtros gestionados por `FilterManager`.

Ver ejemplos visuales en la sección "Capturas de pantalla" más abajo.

### Flujo recomendado
1) Ajustar `base_path` a la ruta real de desarrollos.
2) Ejecutar el bot y pulsar "Actualizar" para cargar datos del servicio.
   - Alternativa: usar "Escanear carpetas" si está disponible para población desde el sistema de archivos.
3) Usar filtros en `home` y validar resultados.
4) Abrir vistas de acciones/controles según necesidad.

### Pruebas rápidas (sanity check)
1) Arranque: la ventana debe abrir sin errores y el log mostrar "Bot listo".
2) Carga de datos: pulsar "Actualizar" debe poblar el árbol sin excepciones.
3) Persistencia: cambiar de pantalla a `home` y cerrar; al reabrir, debe restaurar `home` sin error.
4) Abrir cada vista (Acciones, Docker, Verificar, Otras) y verificar que se rendericen.

Si una prueba falla, revisar consola/log y dependencias (módulos auxiliares presentes, versiones de Python/ttkbootstrap, permisos de carpeta `base_path`).

### Solución de problemas
- Error en log al escribir: el bot imprime en consola como fallback; verificar que la ventana siga abierta.
- Árbol vacío tras "Actualizar": verificar conectividad del servicio usado por `UIHelpers` o usar escaneo local.
- Ruta inválida: ajustar `self.base_path` en `bot_main.py` a una existente.
- UI congelada: esperar a que termine la carga; evitar bloquear el hilo principal con tareas largas (mover a helpers asíncronos si aplica).

### Mantenimiento y buenas prácticas
- Mantener archivos del bot bajo 300 líneas dividiendo responsabilidades en helpers y vistas.
- Reutilizar componentes existentes del sistema de diseño si se incorpora UI web asociada; no crear elementos ad-hoc.
- Añadir pruebas manuales de humo al introducir cambios y validar en este instructivo.
- Documentar cambios mayores en este archivo o enlazar a notas de versión internas.

### Anexo: Estructura básica relevante
- `bot_main.py`: ventana principal, creación de UI, log, carga de datos, restauración de pantalla.
- `bot_ui_helpers.py`: carga de datos desde servicio/escaneo local.
- `bot_quality_controls.py`: validaciones de control de calidad.
- `bot_*_view.py`: ventanas dedicadas (acciones, controles TI, docker, otras funciones).

Última actualización: {auto}


### Guía funcional para usuario final

Esta guía describe, en términos prácticos, cómo usar el bot día a día.

1) Inicio de sesión y apertura
- Abra el archivo con doble clic o ejecútelo por terminal: `python bot_main.py`.
- Espere a ver el mensaje en el log: "✅ Bot listo - Use el botón 'Actualizar' para cargar datos".

2) Actualizar información
- Pulse "🔄 Actualizar" para traer la última información desde el servicio.
- Si la organización de carpetas locales está actualizada y no depende del servicio, utilice la opción de escaneo local si está disponible en su versión.

3) Buscar y filtrar
- Use los filtros de la pantalla `home` para encontrar desarrollos por nombre, estado, responsable u otros criterios disponibles.
- El árbol se actualizará automáticamente al aplicar filtros.

4) Acciones principales
- "🎯 Vista de Acciones":
  - Ejecuta operaciones operativas sobre los desarrollos seleccionados en el árbol.
  - Revise los mensajes del log para confirmar el resultado.
- "🔍 Verificar Desarrollos":
  - Realiza controles básicos de calidad y estructura. Úselo antes de cargar nuevos cambios.
  - Corrija los hallazgos siguiendo las recomendaciones del log.
- "🐳 Docker":
  - Acceda a utilidades relacionadas con contenedores si su flujo de trabajo lo requiere.
- "⚙️ Otras Funciones":
  - Herramientas adicionales (por ejemplo, tareas de mantenimiento o utilidades varias).

5) Guardado de la pantalla activa
- El bot recuerda la última pantalla abierta. Si cierra y reabre, regresará a `home` por defecto.

6) Cierre seguro
- Para cerrar, utilice "❌ Cerrar". Verifique que no haya procesos en curso (revise el log).

Preguntas frecuentes (FAQ)
- No veo datos tras "Actualizar": verifique conexión al servicio o permisos de carpeta; pruebe el escaneo local si aplica.
- El log no muestra nada: confirme que la ventana esté activa; si falla, se imprimen mensajes en consola.
- Cambié la carpeta base y no carga: revise `self.base_path` en `bot_main.py` y que exista la ruta.

Atajos y recomendaciones
- Evite ejecutar múltiples acciones simultáneamente; espere confirmación en el log.
- Mantenga actualizado `Python` y `ttkbootstrap` para evitar problemas de UI.
- Si la carga tarda, no cierre la ventana: espere a que finalice y aparezca el resultado en el log.

### Capturas de pantalla

Las siguientes imágenes sirven de referencia para usuarios finales. Si aún no aparecen en su entorno, capture y guárdelas con los nombres indicados en `docs/procesos/img/`.

- Pantalla principal (Home):
  - `![Bot - Home](../procesos/img/bot-home.png)`
- Botón Actualizar y carga de datos:
  - `![Bot - Actualizar](../procesos/img/bot-actualizar.png)`
- Vista de Acciones:
  - `![Bot - Vista de Acciones](../procesos/img/bot-acciones.png)`
- Verificar Desarrollos:
  - `![Bot - Verificar Desarrollos](../procesos/img/bot-verificar.png)`
- Utilidades Docker:
  - `![Bot - Docker](../procesos/img/bot-docker.png)`
- Otras Funciones:
  - `![Bot - Otras Funciones](../procesos/img/bot-otras-funciones.png)`

### Guía para captura y nomenclatura de imágenes

1) Abra la sección correspondiente en el bot y asegúrese de que se vea el elemento clave (botón, tabla, log).
2) Tome la captura (Win+Shift+S en Windows) y guárdela en `docs/procesos/img/`.
3) Use los nombres sugeridos arriba. Mantenga formato `.png` y tamaño legible (~1200px de ancho recomendado).
4) Evite datos sensibles en las capturas. Si aparecen, enmascare antes de guardar.


