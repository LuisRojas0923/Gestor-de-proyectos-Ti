# Material Design System

Sistema completo de Material Design implementado usando la metodología de diseño atómico para el Gestor de Proyectos TI.

## 🎨 Características

- **Tokens de diseño** basados en las especificaciones oficiales de Google
- **Componentes atómicos** siguiendo Material Design Guidelines
- **Tema claro/oscuro** con soporte completo
- **Responsive design** con breakpoints de Material Design
- **Accesibilidad** integrada en todos los componentes
- **TypeScript** con tipado completo

## 📁 Estructura

```
components/
├── tokens/
│   ├── material-design.ts    # Tokens oficiales de Material Design
│   └── index.ts             # Exportaciones de tokens
├── atoms/
│   ├── MaterialButton.tsx   # Botón con variantes Material
│   ├── MaterialCard.tsx     # Tarjeta con elevación
│   └── MaterialTextField.tsx # Campo de texto con animaciones
├── molecules/
│   ├── MaterialMetricCard.tsx # Tarjeta de métricas
│   └── MaterialSearchBar.tsx  # Barra de búsqueda avanzada
├── organisms/
│   ├── MaterialAppBar.tsx   # Barra de aplicación
│   └── MaterialDrawer.tsx   # Panel de navegación
└── examples/
    └── MaterialDesignExample.tsx # Demostración completa
```

## 🎯 Design Tokens

### Colores
```typescript
import { materialDesignTokens } from '../components/tokens';

const colors = materialDesignTokens.colors;
// primary: Material Blue (#2196f3)
// secondary: Material Orange (#ff9800)
// semantic: success, warning, error, info
// surface: light, dark variants
// text: primary, secondary, disabled
```

### Tipografía
```typescript
const typography = materialDesignTokens.typography;
// fontFamily: Roboto (oficial de Material Design)
// fontSize: escala de Material Design (caption, body1, h1-h6)
// fontWeight: light, regular, medium, bold
```

### Espaciado
```typescript
const spacing = materialDesignTokens.spacing;
// Sistema basado en múltiplos de 8px
// 1 = 4px, 2 = 8px, 4 = 16px, 6 = 24px, etc.
```

### Elevación
```typescript
const elevation = materialDesignTokens.elevation;
// 0-24 niveles de elevación con sombras realistas
// Basado en las especificaciones oficiales
```

## 🧩 Componentes

### Atoms (Átomos)

#### MaterialButton
```typescript
import { MaterialButton } from '../components/atoms';

<MaterialButton
  variant="contained"    // contained | outlined | text
  color="primary"       // primary | secondary | inherit
  size="medium"         // small | medium | large
  disabled={false}
  loading={false}
  icon={Plus}
  iconPosition="left"   // left | right
  fullWidth={false}
  onClick={handleClick}
>
  Agregar Proyecto
</MaterialButton>
```

#### MaterialCard
```typescript
import { MaterialCard } from '../components/atoms';

<MaterialCard
  elevation={2}         // 0-24 niveles de elevación
  hoverable={true}
  onClick={handleClick}
>
  <MaterialCard.Header>
    <h3>Título de la tarjeta</h3>
  </MaterialCard.Header>
  
  <MaterialCard.Content>
    <p>Contenido de la tarjeta</p>
  </MaterialCard.Content>
  
  <MaterialCard.Actions>
    <MaterialButton variant="outlined">Cancelar</MaterialButton>
    <MaterialButton variant="contained">Guardar</MaterialButton>
  </MaterialCard.Actions>
</MaterialCard>
```

#### MaterialTextField
```typescript
import { MaterialTextField } from '../components/atoms';

<MaterialTextField
  label="Nombre del proyecto"
  placeholder="Ingrese el nombre"
  variant="outlined"    // outlined | filled | standard
  size="medium"         // small | medium
  required={true}
  error={hasError}
  errorMessage="Campo requerido"
  helperText="Mínimo 3 caracteres"
  icon={Search}
  iconPosition="left"
  multiline={false}
  rows={4}
  onChange={handleChange}
/>
```

### Molecules (Moléculas)

#### MaterialMetricCard
```typescript
import { MaterialMetricCard } from '../components/molecules';

<MaterialMetricCard
  title="Total Proyectos"
  value={42}
  change={{ value: 12, type: 'increase' }}
  icon={FileText}
  color="primary"       // primary | secondary | success | warning | error | info
  trend="up"           // up | down | stable
  subtitle="Este mes"
/>
```

#### MaterialSearchBar
```typescript
import { MaterialSearchBar } from '../components/molecules';

<MaterialSearchBar
  placeholder="Buscar proyectos..."
  onSearch={handleSearch}
  onFilter={handleFilter}
  showFilters={true}
  suggestions={['Proyecto Alpha', 'Proyecto Beta']}
  value={searchQuery}
  onChange={setSearchQuery}
/>
```

### Organisms (Organismos)

#### MaterialAppBar
```typescript
import { MaterialAppBar } from '../components/organisms';

<MaterialAppBar
  title="Gestor de Proyectos TI"
  onMenuClick={() => setDrawerOpen(true)}
  onSearch={handleSearch}
  onNotificationsClick={handleNotifications}
  onProfileClick={handleProfile}
  showSearch={true}
  showNotifications={true}
  showProfile={true}
  notificationsCount={5}
  user={{
    name: 'Juan Pérez',
    role: 'Project Manager',
    avatar: '/path/to/avatar.jpg'
  }}
  actions={<CustomActions />}
/>
```

#### MaterialDrawer
```typescript
import { MaterialDrawer } from '../components/organisms';

const navigationItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Dashboard,
    badge: '3'
  },
  {
    id: 'projects',
    label: 'Proyectos',
    icon: FileText,
    children: [
      { id: 'active', label: 'Activos', icon: FileText },
      { id: 'completed', label: 'Completados', icon: FileText }
    ]
  }
];

<MaterialDrawer
  open={drawerOpen}
  onClose={() => setDrawerOpen(false)}
  items={navigationItems}
  activeItem="dashboard"
  onItemClick={handleNavigation}
  title="Navegación"
  user={{
    name: 'Juan Pérez',
    email: 'juan.perez@coomeva.com',
    role: 'Project Manager'
  }}
  variant="temporary"    // temporary | permanent | persistent
  width={280}
  footer={<CustomFooter />}
/>
```

## 🎨 Tema y Personalización

### Uso de Tokens
```typescript
import { useMaterialDesignTokens } from '../components/tokens';

const MyComponent = () => {
  const tokens = useMaterialDesignTokens();
  
  return (
    <div style={{
      backgroundColor: tokens.colors.primary[500],
      color: 'white',
      padding: tokens.spacing[4],
      borderRadius: tokens.borders.radius.md,
      boxShadow: tokens.elevation[2],
      fontFamily: tokens.typography.fontFamily.primary
    }}>
      Contenido con Material Design
    </div>
  );
};
```

### Tema Oscuro
```typescript
// Los componentes automáticamente detectan el tema oscuro
// a través del contexto de la aplicación
const { state } = useAppContext();
const { darkMode } = state;

// Los tokens se adaptan automáticamente:
// - Colores de superficie
// - Colores de texto
// - Elevaciones
// - Sombras
```

## 📱 Responsive Design

### Breakpoints
```typescript
const breakpoints = materialDesignTokens.breakpoints;
// xs: 0px
// sm: 600px
// md: 960px
// lg: 1280px
// xl: 1920px
```

### Uso en CSS
```css
/* Ejemplo de uso con Tailwind CSS */
@media (min-width: 600px) {
  .responsive-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 960px) {
  .responsive-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

## 🚀 Ejemplo Completo

```typescript
import React, { useState } from 'react';
import {
  MaterialAppBar,
  MaterialDrawer,
  MaterialMetricCard,
  MaterialSearchBar,
  MaterialCard,
  MaterialButton,
  MaterialTextField
} from '../components';

const Dashboard = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Dashboard },
    { id: 'projects', label: 'Proyectos', icon: FileText },
    { id: 'team', label: 'Equipo', icon: Users }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <MaterialAppBar
        title="Gestor de Proyectos TI"
        onMenuClick={() => setDrawerOpen(true)}
        onSearch={setSearchQuery}
        user={{ name: 'Juan Pérez', role: 'PM' }}
      />

      <MaterialDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        items={navigationItems}
        activeItem="dashboard"
      />

      <main className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MaterialMetricCard
            title="Proyectos Activos"
            value={12}
            change={{ value: 3, type: 'increase' }}
            icon={FileText}
            color="primary"
          />
          <MaterialMetricCard
            title="Equipo"
            value={28}
            change={{ value: 2, type: 'increase' }}
            icon={Users}
            color="success"
          />
          <MaterialMetricCard
            title="Progreso"
            value="87%"
            icon={TrendingUp}
            color="info"
          />
        </div>

        <MaterialCard elevation={2} className="p-6">
          <MaterialSearchBar
            placeholder="Buscar proyectos..."
            onSearch={setSearchQuery}
            showFilters
          />
        </MaterialCard>
      </main>
    </div>
  );
};
```

## 🔧 Migración desde Componentes Base

### Antes (Componentes Base)
```typescript
import { Button, MetricCard, TopBar } from '../components';

<Button variant="primary" size="md">Guardar</Button>
<MetricCard title="Total" value={42} icon={FileText} color="blue" />
<TopBar user={user} onSearch={handleSearch} />
```

### Después (Material Design)
```typescript
import { MaterialButton, MaterialMetricCard, MaterialAppBar } from '../components';

<MaterialButton variant="contained" color="primary">Guardar</MaterialButton>
<MaterialMetricCard title="Total" value={42} icon={FileText} color="primary" />
<MaterialAppBar title="App" user={user} onSearch={handleSearch} />
```

## 📋 Checklist de Implementación

- [x] **Tokens de Material Design** - Colores, tipografía, espaciado, elevación
- [x] **Átomos** - Button, Card, TextField con variantes Material
- [x] **Moléculas** - MetricCard, SearchBar con funcionalidad avanzada
- [x] **Organismos** - AppBar, Drawer con navegación completa
- [x] **Tema oscuro** - Soporte automático en todos los componentes
- [x] **Responsive** - Breakpoints y adaptación móvil
- [x] **Accesibilidad** - ARIA labels, focus management, keyboard navigation
- [x] **TypeScript** - Tipado completo en todas las interfaces
- [x] **Documentación** - Ejemplos y guías de uso
- [x] **Ejemplo completo** - Demostración de todos los componentes

## 🎯 Próximos Pasos

1. **Migración gradual** de componentes existentes
2. **Storybook** para documentación visual
3. **Testing** automatizado de componentes
4. **Animaciones** avanzadas con Framer Motion
5. **Temas personalizados** por cliente
6. **Componentes adicionales** (DataTable, Charts, etc.)

---

**Material Design System v1.0** - Implementado siguiendo las especificaciones oficiales de Google Material Design con metodología de diseño atómico.
