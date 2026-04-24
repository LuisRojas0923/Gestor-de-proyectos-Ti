# Guía Maestra de Experiencia de Usuario (UX) e Interfaz (UI)

Este documento es la fuente de verdad para el diseño visual y la experiencia de usuario de la aplicación. El objetivo principal es construir interfaces **intuitivas, limpias y atractivas** que reduzcan la fricción del usuario.

## 1. Identidad Visual (Basada en tu Paleta Corporativa)
El sistema utiliza una paleta que transmite profesionalismo y serenidad (configurada en `index.css`):
- **Deep Navy (`--deep-navy`)**: Usar para máxima jerarquía. Botones de acción principales (Guardar, Enviar), headers o iconos destacados.
- **Lavender & Powder Blue (`--lavender`, `--powder-blue`)**: Usar como colores de acento suaves, fondos de tarjetas seleccionadas, o estados `hover` de botones secundarios.
- **Dust Grey (`--dust-grey`)**: El color de fondo general de la aplicación (`bg-background`). Ayuda a reducir la fatiga visual comparado con un blanco puro.
- **Superficies Blancas (`--white`)**: Usar para contenedores de contenido (Tarjetas, Formularios, Modales). El contraste entre el fondo gris y la tarjeta blanca guía el ojo del usuario.

## 2. Principios para una Interfaz Atractiva
- **El Espacio en Blanco es tu Amigo**: No amontones la información. Usa márgenes y paddings generosos (ej. `p-6` o `gap-4` en Tailwind). Las cosas "apretadas" se ven viejas y complejas; el espacio da un aspecto "Premium".
- **Suavidad (Bordes y Sombras)**: Las esquinas muy cuadradas son agresivas. Usa `rounded-xl` o `rounded-2xl` para contenedores. Usa `shadow-sm` por defecto y `shadow-lg` cuando el usuario hace `hover` sobre una tarjeta para dar sensación de profundidad.
- **Jerarquía Tipográfica Clara**: 
  - **Títulos**: Grandes y oscuros (ej. `text-xl font-bold text-slate-800`).
  - **Subtítulos/Metadatos**: Más pequeños y sutiles (ej. `text-sm text-slate-500`).

## 3. Principios para una Experiencia Intuitiva
- **Consistencia Extrema**: Si el botón de "Crear Ticket" es Azul y redondeado en una página, DEBE ser exactamente igual en todas las demás.
- **Micro-feedback (El usuario nunca debe adivinar)**:
  - **Estados de Carga**: Si un botón hace una petición al servidor, debe mostrar un spinner de carga (`isSaving={true}`) e inhabilitarse para evitar doble click.
  - **Éxito/Error**: Toda acción debe responder. Usa notificaciones flotantes (Toasts) o mensajes de éxito claros.
- **Prevención de Errores antes que Curación**:
  - Deshabilita el botón de "Guardar" si hay campos obligatorios vacíos.
  - Las acciones destructivas (ej. Eliminar) jamás ocurren con un solo click. Requieren siempre un Modal de confirmación y usan colores de alerta (rojo/naranja).

## 4. Patrones de Navegación Eficientes
- **Mantener el Contexto**: Si un usuario está viendo una lista de tickets y hace clic en uno, es mejor abrir los detalles en un panel lateral deslizable (Slide-over) o en un Drawer, en lugar de mandarlo a otra página completa. Así no pierde de vista la lista original.
- **Agrupación Lógica**: Si un formulario tiene más de 6 campos, agrúpalos en tarjetas separadas con subtítulos claros, o usa pestañas (Tabs) para no abrumar al usuario de golpe.
