// Atomic Design System - Component Library
// Sistema de diseño atómico para el Gestor de Proyectos TI

// Atoms - Elementos básicos
export * from './atoms';

// Molecules - Combinaciones de átomos
export * from './molecules';

// Organisms - Secciones complejas
export * from './organisms';

// Legacy components (temporary during migration)
export { default as LoadingSpinner } from './common/LoadingSpinner';
export { default as MetricCard } from './common/MetricCard';
export { default as ExcelImporter } from './common/ExcelImporter';

// Layout components
export { default as Layout } from './layout/Layout';
export { default as Sidebar } from './layout/Sidebar';

// Development components
export * from './development';

// Alert components
export * from './alerts';

// Router
export { default as AppRouter } from './Router';
