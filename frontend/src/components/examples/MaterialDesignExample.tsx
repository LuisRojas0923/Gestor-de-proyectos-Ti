import React, { useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  FileText, 
  AlertTriangle,
  Menu,
  Notifications,
  Search,
  LayoutDashboard,
  Settings,
  LogOut
} from 'lucide-react';
import { 
  MaterialButton, 
  MaterialCard, 
  MaterialTextField, 
  MaterialMetricCard, 
  MaterialSearchBar,
  MaterialAppBar,
  MaterialDrawer,
  materialDesignTokens
} from '../index';

const MaterialDesignExample: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
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
    },
    {
      id: 'team',
      label: 'Equipo',
      icon: Users
    },
    {
      id: 'settings',
      label: 'Configuración',
      icon: Settings
    }
  ];

  const handleSearch = (query: string) => {
    console.log('Búsqueda:', query);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Formulario enviado:', formData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* App Bar */}
      <MaterialAppBar
        title="Material Design Demo"
        onMenuClick={() => setDrawerOpen(true)}
        onSearch={handleSearch}
        onNotificationsClick={() => console.log('Notificaciones')}
        onProfileClick={() => console.log('Perfil')}
        notificationsCount={5}
        user={{
          name: 'Juan Pérez',
          role: 'Project Manager',
          avatar: undefined
        }}
      />

      {/* Drawer */}
      <MaterialDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        items={navigationItems}
        activeItem="dashboard"
        title="Navegación"
        user={{
          name: 'Juan Pérez',
          email: 'juan.perez@coomeva.com',
          role: 'Project Manager'
        }}
        footer={
          <MaterialButton
            variant="text"
            color="inherit"
            icon={LogOut}
            fullWidth
            onClick={() => console.log('Cerrar sesión')}
          >
            Cerrar Sesión
          </MaterialButton>
        }
      />

      {/* Contenido principal */}
      <main className="p-6" style={{ marginLeft: drawerOpen ? '280px' : '0', transition: 'margin-left 0.3s ease' }}>
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Título */}
          <div>
            <h1 
              className="text-3xl font-bold mb-2"
              style={{
                color: materialDesignTokens.colors.text.primary.light,
                fontSize: materialDesignTokens.typography.fontSize.h3,
                fontWeight: materialDesignTokens.typography.fontWeight.bold
              }}
            >
              Material Design Components
            </h1>
            <p 
              className="text-gray-600"
              style={{
                color: materialDesignTokens.colors.text.secondary.light,
                fontSize: materialDesignTokens.typography.fontSize.body1
              }}
            >
              Demostración de componentes implementados con Material Design
            </p>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MaterialMetricCard
              title="Total Proyectos"
              value={42}
              change={{ value: 12, type: 'increase' }}
              icon={FileText}
              color="primary"
              trend="up"
              subtitle="Este mes"
            />
            <MaterialMetricCard
              title="Equipo Activo"
              value={28}
              change={{ value: 5, type: 'increase' }}
              icon={Users}
              color="success"
              trend="up"
            />
            <MaterialMetricCard
              title="Progreso"
              value="87%"
              change={{ value: 3, type: 'increase' }}
              icon={TrendingUp}
              color="info"
              trend="up"
            />
            <MaterialMetricCard
              title="Alertas"
              value={3}
              change={{ value: 1, type: 'decrease' }}
              icon={AlertTriangle}
              color="warning"
              trend="down"
            />
          </div>

          {/* Barra de búsqueda */}
          <MaterialCard elevation={2} className="p-6">
            <h2 
              className="text-xl font-semibold mb-4"
              style={{
                color: materialDesignTokens.colors.text.primary.light,
                fontSize: materialDesignTokens.typography.fontSize.h5,
                fontWeight: materialDesignTokens.typography.fontWeight.semibold
              }}
            >
              Búsqueda Avanzada
            </h2>
            <MaterialSearchBar
              placeholder="Buscar proyectos, usuarios, documentos..."
              onSearch={handleSearch}
              showFilters
              suggestions={[
                'Proyecto Alpha',
                'Proyecto Beta',
                'Usuario Admin',
                'Documento Técnico'
              ]}
            />
          </MaterialCard>

          {/* Formulario */}
          <MaterialCard elevation={2} className="p-6">
            <h2 
              className="text-xl font-semibold mb-6"
              style={{
                color: materialDesignTokens.colors.text.primary.light,
                fontSize: materialDesignTokens.typography.fontSize.h5,
                fontWeight: materialDesignTokens.typography.fontWeight.semibold
              }}
            >
              Formulario de Contacto
            </h2>
            
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MaterialTextField
                  label="Nombre completo"
                  placeholder="Ingrese su nombre"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  variant="outlined"
                />
                
                <MaterialTextField
                  label="Correo electrónico"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  variant="outlined"
                />
              </div>
              
              <MaterialTextField
                label="Mensaje"
                placeholder="Escriba su mensaje aquí..."
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                multiline
                rows={4}
                variant="outlined"
                helperText="Máximo 500 caracteres"
              />
              
              <div className="flex justify-end space-x-4">
                <MaterialButton
                  variant="outlined"
                  color="primary"
                  onClick={() => setFormData({ name: '', email: '', message: '' })}
                >
                  Limpiar
                </MaterialButton>
                
                <MaterialButton
                  variant="contained"
                  color="primary"
                  type="submit"
                >
                  Enviar Mensaje
                </MaterialButton>
              </div>
            </form>
          </MaterialCard>

          {/* Botones de ejemplo */}
          <MaterialCard elevation={2} className="p-6">
            <h2 
              className="text-xl font-semibold mb-6"
              style={{
                color: materialDesignTokens.colors.text.primary.light,
                fontSize: materialDesignTokens.typography.fontSize.h5,
                fontWeight: materialDesignTokens.typography.fontWeight.semibold
              }}
            >
              Variantes de Botones
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h3 className="font-medium">Contained</h3>
                <div className="space-y-2">
                  <MaterialButton variant="contained" color="primary">Primary</MaterialButton>
                  <MaterialButton variant="contained" color="secondary">Secondary</MaterialButton>
                  <MaterialButton variant="contained" color="inherit">Inherit</MaterialButton>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium">Outlined</h3>
                <div className="space-y-2">
                  <MaterialButton variant="outlined" color="primary">Primary</MaterialButton>
                  <MaterialButton variant="outlined" color="secondary">Secondary</MaterialButton>
                  <MaterialButton variant="outlined" color="inherit">Inherit</MaterialButton>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium">Text</h3>
                <div className="space-y-2">
                  <MaterialButton variant="text" color="primary">Primary</MaterialButton>
                  <MaterialButton variant="text" color="secondary">Secondary</MaterialButton>
                  <MaterialButton variant="text" color="inherit">Inherit</MaterialButton>
                </div>
              </div>
            </div>
          </MaterialCard>
        </div>
      </main>
    </div>
  );
};

export default MaterialDesignExample;
