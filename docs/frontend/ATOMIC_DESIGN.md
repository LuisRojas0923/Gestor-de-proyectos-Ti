# Sistema de Diseño Atómico

Este proyecto implementa la metodología de **Atomic Design** para organizar los componentes de React de manera escalable y mantenible, junto con un sistema completo de **Design Tokens** para garantizar consistencia visual.

## Estructura

```
components/
├── atoms/           # Elementos básicos e indivisibles
├── molecules/       # Combinaciones de átomos
├── organisms/       # Secciones complejas de la interfaz
├── layout/          # Componentes de layout (temporal)
├── common/          # Componentes legacy (temporal)
├── tokens/          # Design tokens y variables de diseño
└── index.ts         # Exportaciones centralizadas
```

## Design Tokens

### Colores
```typescript
const colors = {
  // Colores primarios
  primary: {
    50: '#eff6ff',
    100: '#dbeafe', 
    500: '#0066A5',    // Color principal
    600: '#005a94',
    700: '#004e83',
    900: '#1e3a8a'
  },
  
  // Colores secundarios
  secondary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#00B388',    // Color secundario
    600: '#00a07a',
    700: '#008d6c',
    900: '#14532d'
  },
  
  // Colores semánticos
  semantic: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6'
  },
  
  // Colores neutros
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717'
  }
}
```

### Tipografía
```typescript
const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['Fira Code', 'monospace']
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem' // 30px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75'
  }
}
```

### Espaciado
```typescript
const spacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '1rem',       // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
  '2xl': '2.5rem',  // 40px
  '3xl': '3rem'     // 48px
}
```

### Bordes y Sombras
```typescript
const borders = {
  radius: {
    sm: '0.25rem',   // 4px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem'       // 16px
  },
  width: {
    thin: '1px',
    medium: '2px',
    thick: '4px'
  }
}

const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
}
```

### Breakpoints
```typescript
const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
}
```

## Patrones de Diseño

### 1. Atomic Design Pattern
Seguimos la metodología de Brad Frost con 5 niveles:

```
Átomos → Moléculas → Organismos → Templates → Páginas
```

### 2. Design System Pattern
- **Consistencia**: Todos los componentes siguen las mismas reglas
- **Escalabilidad**: Fácil agregar nuevos componentes
- **Mantenibilidad**: Cambios centralizados en tokens
- **Reutilización**: Componentes modulares y combinables

### 3. Component Composition Pattern
```typescript
// Composición de componentes
<Card>
  <Card.Header>
    <Badge variant="success">Activo</Badge>
    <Button size="sm" variant="outline">Editar</Button>
  </Card.Header>
  <Card.Body>
    <Input placeholder="Buscar..." />
  </Card.Body>
</Card>
```

### 4. Props Interface Pattern
```typescript
// Interfaces consistentes
interface ComponentProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}
```

## Componentes Implementados

### Atoms (Átomos)
Elementos básicos que no pueden dividirse más:

#### **Badge**
Etiquetas de estado con variantes de color
```typescript
<Badge variant="success" size="md">Activo</Badge>
<Badge variant="warning" size="sm">Pendiente</Badge>
<Badge variant="error" size="lg">Error</Badge>
```

#### **Button**
Botón con variantes, tamaños y estados
```typescript
<Button variant="primary" size="md" icon={Plus}>Agregar</Button>
<Button variant="outline" size="sm" loading>Guardando...</Button>
<Button variant="ghost" size="lg" disabled>Deshabilitado</Button>
```

#### **Input**
Campo de entrada con iconos y validación
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

#### **Spinner**
Indicador de carga
```typescript
<Spinner size="sm" />
<Spinner size="md" className="my-4" />
<Spinner size="lg" />
```

#### **Card** (Próximo)
Contenedor base para contenido
```typescript
<Card>
  <Card.Header>Título</Card.Header>
  <Card.Body>Contenido</Card.Body>
  <Card.Footer>Acciones</Card.Footer>
</Card>
```

#### **Modal** (Próximo)
Ventana emergente
```typescript
<Modal isOpen={isOpen} onClose={onClose}>
  <Modal.Header>Título</Modal.Header>
  <Modal.Body>Contenido</Modal.Body>
  <Modal.Footer>
    <Button variant="outline" onClick={onClose}>Cancelar</Button>
    <Button variant="primary" onClick={onConfirm}>Confirmar</Button>
  </Modal.Footer>
</Modal>
```

### Molecules (Moléculas)
Combinaciones de átomos que forman unidades funcionales:

#### **MetricCard**
Tarjeta de métricas con icono, valor y cambio
```typescript
<MetricCard
  title="Total Desarrollos"
  value={42}
  change={{ value: 12, type: 'increase' }}
  icon={TrendingUp}
  color="blue"
/>
```

#### **SearchBar** (Próximo)
Barra de búsqueda completa
```typescript
<SearchBar
  placeholder="Buscar desarrollos..."
  onSearch={handleSearch}
  filters={['estado', 'prioridad']}
  suggestions={suggestions}
/>
```

#### **StatusBadge** (Próximo)
Badge con estado y acciones
```typescript
<StatusBadge
  status="active"
  showActions
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

#### **FormField** (Próximo)
Campo de formulario completo
```typescript
<FormField
  label="Nombre del desarrollo"
  required
  error={errors.name}
  helperText="Mínimo 3 caracteres"
>
  <Input value={value} onChange={onChange} />
</FormField>
```

### Organisms (Organismos)
Secciones complejas que combinan moléculas y átomos:

#### **TopBar**
Barra superior con búsqueda, notificaciones y perfil de usuario
```typescript
<TopBar
  user={user}
  notifications={notifications}
  onSearch={handleSearch}
  onToggleTheme={toggleTheme}
/>
```

#### **Sidebar** (Próximo)
Navegación lateral
```typescript
<Sidebar
  items={navigationItems}
  activeItem={activeItem}
  onItemClick={handleNavigation}
  collapsed={isCollapsed}
/>
```

#### **DataTable** (Próximo)
Tabla de datos con filtros y paginación
```typescript
<DataTable
  data={developments}
  columns={columns}
  filters={filters}
  pagination
  onRowClick={handleRowClick}
/>
```

#### **Dashboard** (Próximo)
Panel de control completo
```typescript
<Dashboard
  metrics={metrics}
  charts={charts}
  alerts={alerts}
  onRefresh={handleRefresh}
/>
```

## Uso

### Importación
```typescript
// Importar desde el índice principal
import { Button, Input, MetricCard, TopBar } from '../components';

// O importar desde categorías específicas
import { Button, Input, Badge, Spinner } from '../components/atoms';
import { MetricCard, SearchBar } from '../components/molecules';
import { TopBar, Sidebar, DataTable } from '../components/organisms';

// Importar design tokens
import { colors, spacing, typography } from '../components/tokens';
```

### Hooks Personalizados

#### useTheme
```typescript
import { useTheme } from '../hooks/useTheme';

const MyComponent = () => {
  const { theme, toggleTheme, isDark } = useTheme();
  
  return (
    <div className={isDark ? 'dark' : 'light'}>
      <Button onClick={toggleTheme}>
        Cambiar a {isDark ? 'claro' : 'oscuro'}
      </Button>
    </div>
  );
};
```

#### useDesignTokens
```typescript
import { useDesignTokens } from '../hooks/useDesignTokens';

const MyComponent = () => {
  const tokens = useDesignTokens();
  
  return (
    <div style={{ 
      color: tokens.colors.primary[500],
      padding: tokens.spacing.md,
      fontSize: tokens.typography.fontSize.lg
    }}>
      Contenido con tokens
    </div>
  );
};
```

### Ejemplos de Uso Avanzados

#### Composición de Componentes
```typescript
const DevelopmentCard = ({ development }) => (
  <Card className="mb-4">
    <Card.Header className="flex justify-between items-center">
      <div>
        <h3 className="text-lg font-semibold">{development.name}</h3>
        <Badge variant={development.status === 'active' ? 'success' : 'warning'}>
          {development.status}
        </Badge>
      </div>
      <Button size="sm" variant="outline" icon={Edit}>
        Editar
      </Button>
    </Card.Header>
    
    <Card.Body>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-gray-600">Responsable</label>
          <p className="font-medium">{development.responsible}</p>
        </div>
        <div>
          <label className="text-sm text-gray-600">Fecha límite</label>
          <p className="font-medium">{development.dueDate}</p>
        </div>
      </div>
    </Card.Body>
    
    <Card.Footer className="flex justify-between">
      <div className="flex space-x-2">
        <Badge variant="info" size="sm">Prioridad: {development.priority}</Badge>
        <Badge variant="secondary" size="sm">{development.category}</Badge>
      </div>
      <div className="flex space-x-2">
        <Button size="sm" variant="ghost" icon={Eye}>Ver</Button>
        <Button size="sm" variant="ghost" icon={Download}>Exportar</Button>
      </div>
    </Card.Footer>
  </Card>
);
```

#### Formulario con Validación
```typescript
const DevelopmentForm = () => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  
  return (
    <form className="space-y-6">
      <FormField
        label="Nombre del desarrollo"
        required
        error={errors.name}
        helperText="Mínimo 3 caracteres"
      >
        <Input
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          placeholder="Ingrese el nombre"
        />
      </FormField>
      
      <FormField
        label="Descripción"
        error={errors.description}
      >
        <textarea
          className="w-full p-3 border rounded-lg"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          rows={4}
        />
      </FormField>
      
      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={onSubmit} loading={isSubmitting}>
          Guardar
        </Button>
      </div>
    </form>
  );
};
```

#### Dashboard con Métricas
```typescript
const Dashboard = () => {
  const { metrics, loading } = useMetrics();
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Desarrollos"
          value={metrics.total}
          change={{ value: 12, type: 'increase' }}
          icon={FileText}
          color="blue"
        />
        <MetricCard
          title="En Progreso"
          value={metrics.inProgress}
          change={{ value: 5, type: 'increase' }}
          icon={TrendingUp}
          color="green"
        />
        <MetricCard
          title="Completados"
          value={metrics.completed}
          change={{ value: 8, type: 'increase' }}
          icon={CheckCircle}
          color="success"
        />
        <MetricCard
          title="Retrasados"
          value={metrics.delayed}
          change={{ value: 2, type: 'decrease' }}
          icon={AlertTriangle}
          color="error"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold">Desarrollos Recientes</h3>
          </Card.Header>
          <Card.Body>
            <DataTable
              data={recentDevelopments}
              columns={developmentColumns}
              pagination={false}
            />
          </Card.Body>
        </Card>
        
        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold">Alertas</h3>
          </Card.Header>
          <Card.Body>
            <div className="space-y-3">
              {alerts.map(alert => (
                <div key={alert.id} className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="text-yellow-600" size={20} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-xs text-gray-600">{alert.description}</p>
                  </div>
                  <Button size="sm" variant="outline">Ver</Button>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};
```

## Beneficios

### 1. **Reutilización**
- Componentes atómicos se pueden combinar de múltiples formas
- Reducción de código duplicado
- Desarrollo más rápido de nuevas features

### 2. **Consistencia**
- Diseño uniforme en toda la aplicación
- Comportamiento predecible de componentes
- Experiencia de usuario coherente

### 3. **Mantenibilidad**
- Cambios en átomos se propagan automáticamente
- Fácil actualización de estilos globales
- Debugging más sencillo

### 4. **Escalabilidad**
- Fácil agregar nuevos componentes siguiendo la estructura
- Sistema de diseño crece de forma orgánica
- Onboarding más rápido para nuevos desarrolladores

### 5. **Testing**
- Componentes pequeños son más fáciles de probar
- Aislamiento de responsabilidades
- Cobertura de tests más efectiva

### 6. **Performance**
- Mejor tree-shaking y optimización de bundle
- Componentes más ligeros y eficientes
- Menos re-renders innecesarios

## Roadmap de Implementación

### ✅ **Fase 1 - Completada**
- [x] Estructura atómica básica
- [x] Componentes fundamentales (Button, Input, Badge, Spinner)
- [x] Migración de MetricCard y TopBar
- [x] Documentación inicial

### 🔄 **Fase 2 - En Progreso**
- [ ] Sistema completo de Design Tokens
- [ ] Hooks personalizados (useTheme, useDesignTokens)
- [ ] Migración de Sidebar y Layout
- [ ] Componentes adicionales (Card, Modal, Tooltip)

### ⏳ **Fase 3 - Próxima**
- [ ] Componentes de formularios (FormField, Select, Textarea)
- [ ] Componentes de datos (DataTable, Pagination, Filters)
- [ ] Componentes de navegación (Breadcrumb, Tabs, Accordion)
- [ ] Storybook para documentación visual

### 🚀 **Fase 4 - Futura**
- [ ] Sistema de temas avanzado
- [ ] Animaciones y transiciones
- [ ] Componentes de gráficos y visualización
- [ ] Testing automatizado de componentes

## Migración

Los componentes legacy se mantienen temporalmente en `common/` y `layout/` para compatibilidad. La migración se realiza gradualmente:

### ✅ **Completado**
- Spinner → atoms/Spinner
- MetricCard → molecules/MetricCard
- TopBar → organisms/TopBar
- Imports actualizados en todas las páginas

### 🔄 **En Progreso**
- Sidebar → organisms/Sidebar
- Layout → organisms/Layout
- ExcelImporter → molecules/ExcelImporter

### ⏳ **Pendiente**
- Componentes de desarrollo (DevelopmentPhases, RequirementsTab, etc.)
- Componentes de alertas (AlertPanel, ActivityForm)
- Componentes de calidad (QualityControlsTab)

## Mejores Prácticas

### 1. **Nomenclatura**
```typescript
// ✅ Correcto
<Button variant="primary" size="md" />
<MetricCard title="Total" value={42} />

// ❌ Incorrecto
<button className="btn-primary" />
<div className="metric-card">
```

### 2. **Props Interface**
```typescript
// ✅ Siempre definir interfaces
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

// ✅ Usar props con valores por defecto
const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  children
}) => {
  // ...
};
```

### 3. **Composición**
```typescript
// ✅ Preferir composición sobre herencia
<Card>
  <Card.Header>Título</Card.Header>
  <Card.Body>Contenido</Card.Body>
  <Card.Footer>Acciones</Card.Footer>
</Card>

// ❌ Evitar props complejas
<Card 
  hasHeader={true}
  headerContent="Título"
  hasFooter={true}
  footerContent="Acciones"
/>
```

### 4. **Accesibilidad**
```typescript
// ✅ Siempre incluir atributos de accesibilidad
<Button
  aria-label="Agregar nuevo desarrollo"
  aria-disabled={disabled}
  role="button"
>
  Agregar
</Button>
```

## Herramientas de Desarrollo

### 1. **Storybook** (Próximo)
```bash
npm install @storybook/react @storybook/addon-essentials
npx storybook init
```

### 2. **Testing**
```bash
npm install @testing-library/react @testing-library/jest-dom
```

### 3. **Linting**
```bash
npm install eslint-plugin-react-hooks
```

## Contribución

### 1. **Crear nuevo componente**
1. Crear archivo en la carpeta correspondiente (`atoms/`, `molecules/`, `organisms/`)
2. Definir interface de props
3. Implementar componente con TypeScript
4. Agregar al archivo `index.ts` correspondiente
5. Documentar en este archivo
6. Crear tests unitarios

### 2. **Modificar componente existente**
1. Verificar que no rompa la compatibilidad
2. Actualizar documentación
3. Actualizar tests
4. Notificar cambios en el equipo

### 3. **Agregar Design Token**
1. Agregar al archivo `tokens/index.ts`
2. Documentar uso y ejemplos
3. Actualizar componentes que lo usen
4. Verificar consistencia visual

---

**Este documento se actualiza constantemente. Para sugerencias o mejoras, contacta al equipo de desarrollo.**
