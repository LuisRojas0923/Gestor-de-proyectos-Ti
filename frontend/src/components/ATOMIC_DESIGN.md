# Sistema de Diseño Atómico

Este proyecto implementa la metodología de **Atomic Design** para organizar los componentes de React de manera escalable y mantenible.

## Estructura

```
components/
├── atoms/           # Elementos básicos e indivisibles
├── molecules/       # Combinaciones de átomos
├── organisms/       # Secciones complejas de la interfaz
├── layout/          # Componentes de layout (temporal)
├── common/          # Componentes legacy (temporal)
└── index.ts         # Exportaciones centralizadas
```

## Componentes Implementados

### Atoms (Átomos)
Elementos básicos que no pueden dividirse más:

- **Badge**: Etiquetas de estado con variantes de color
- **Button**: Botón con variantes, tamaños y estados
- **Input**: Campo de entrada con iconos y validación
- **Spinner**: Indicador de carga

### Molecules (Moléculas)
Combinaciones de átomos que forman unidades funcionales:

- **MetricCard**: Tarjeta de métricas con icono, valor y cambio

### Organisms (Organismos)
Secciones complejas que combinan moléculas y átomos:

- **TopBar**: Barra superior con búsqueda, notificaciones y perfil de usuario

## Uso

### Importación
```typescript
// Importar desde el índice principal
import { Button, Input, MetricCard, TopBar } from '../components';

// O importar desde categorías específicas
import { Button, Input } from '../components/atoms';
import { MetricCard } from '../components/molecules';
import { TopBar } from '../components/organisms';
```

### Ejemplos de Uso

#### Button
```typescript
<Button 
  variant="primary" 
  size="md" 
  icon={Plus} 
  onClick={handleClick}
>
  Agregar Item
</Button>
```

#### Input
```typescript
<Input
  type="search"
  placeholder="Buscar..."
  icon={Search}
  iconPosition="left"
  error={hasError}
  errorMessage="Campo requerido"
/>
```

#### MetricCard
```typescript
<MetricCard
  title="Total Desarrollos"
  value={42}
  change={{ value: 12, type: 'increase' }}
  icon={TrendingUp}
  color="blue"
/>
```

## Beneficios

1. **Reutilización**: Componentes atómicos se pueden combinar de múltiples formas
2. **Consistencia**: Diseño uniforme en toda la aplicación
3. **Mantenibilidad**: Cambios en átomos se propagan automáticamente
4. **Escalabilidad**: Fácil agregar nuevos componentes siguiendo la estructura
5. **Testing**: Componentes pequeños son más fáciles de probar

## Migración

Los componentes legacy se mantienen temporalmente en `common/` y `layout/` para compatibilidad. La migración se realiza gradualmente:

1. ✅ **Completado**: Spinner, MetricCard, TopBar
2. 🔄 **En progreso**: Sidebar, Layout
3. ⏳ **Pendiente**: Componentes de desarrollo y alertas

## Próximos Pasos

1. Migrar componentes restantes a la estructura atómica
2. Crear más átomos básicos (Card, Modal, Tooltip)
3. Implementar sistema de design tokens
4. Crear Storybook para documentación visual
5. Establecer guías de estilo y mejores prácticas
