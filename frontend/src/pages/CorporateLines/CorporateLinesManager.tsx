import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus } from 'lucide-react';
import { useCorporateLines, CorporateLine } from './useCorporateLines';
import { useNotifications } from '../../components/notifications/NotificationsContext';

// Componentes del Sistema de Diseño
import { 
  Button, 
  Input, 
  MaterialCard as Card, 
  Spinner,
  Title,
  Text,
  Select,
} from '../../components/atoms';

// Sub-componentes modulares
import { StatsCards } from './components/StatsCards';
import { LinesTable } from './components/LinesTable';
import { LineDetailForm } from './components/LineDetailForm';
export const CorporateLinesManager: React.FC = () => {
  const { 
    lines, equipos, employeeAlerts, isLoading, stats,
    loadData, createLine, updateLine, deleteLine 
  } = useCorporateLines();
  
  const { addNotification } = useNotifications();
  
  const [view, setView] = useState<'dashboard' | 'detail'>('dashboard');
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtros adicionales
  const [companyFilter, setCompanyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Estado del formulario actual
  const [formData, setFormData] = useState<Partial<CorporateLine>>({});
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'tecnico' | 'finanzas'>('general');

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredLines = useMemo(() => {
    return lines.filter(l => {
      const matchesSearch = 
        l.linea.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.asignado?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.responsable_cobro?.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCompany = companyFilter === 'all' || l.empresa === companyFilter;
      const matchesStatus = statusFilter === 'all' || l.estatus === statusFilter;

      return matchesSearch && matchesCompany && matchesStatus;
    });
  }, [lines, searchTerm, companyFilter, statusFilter]);

  const selectedLine = useMemo(() => {
    if (isCreating) return null;
    return lines.find(l => l.id === selectedLineId) || null;
  }, [lines, selectedLineId, isCreating]);

  useEffect(() => {
    if (selectedLine) {
      setFormData(selectedLine);
      setView('detail');
    } else if (isCreating) {
      setFormData({
        linea: '',
        empresa: 'RDC',
        estatus: 'ACTIVA',
        estado_asignacion: 'ASIGNADA',
        fecha_actualizacion: new Date().toISOString().split('T')[0],
        cfm_con_iva: 0,
        cfm_sin_iva: 0,
        vr_factura: 0,
        pago_empleado: 0
      });
      setView('detail');
    }
  }, [selectedLine, isCreating]);

  const handleSave = async () => {
    try {
      if (isCreating) {
        await createLine(formData);
        addNotification('success', 'Línea creada correctamente');
        setIsCreating(false);
        setView('dashboard');
      } else if (selectedLineId) {
        await updateLine(selectedLineId, formData);
        addNotification('success', 'Línea actualizada correctamente');
      }
    } catch (err: any) {
      addNotification('error', err.message || 'Error al guardar');
    }
  };

  const handleDelete = async () => {
    if (!selectedLineId || !window.confirm('¿Eliminar esta línea? Esta acción es irreversible.')) return;
    try {
      await deleteLine(selectedLineId);
      addNotification('success', 'Línea eliminada del inventario');
      setSelectedLineId(null);
      setView('dashboard');
    } catch (err: any) {
      addNotification('error', 'Error al eliminar la línea');
    }
  };

  const handleBack = () => {
    setSelectedLineId(null);
    setIsCreating(false);
    setView('dashboard');
  };


  return (
    <div className="flex-1 h-full overflow-y-auto bg-gray-50 dark:bg-neutral-900 custom-scrollbar p-6">
      {view === 'dashboard' ? (
        <div className="animate-in fade-in zoom-in-95 duration-500">
          {/* HEADER DASHBOARD */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <Title variant="h2" weight="bold" color="text-primary" className="mb-1 tracking-tight">Gestión Corporativa de Líneas</Title>
              <Text variant="body1" color="text-secondary" className="opacity-70">Monitoreo de inventario móvil y asignación de recursos.</Text>
            </div>
            <Button 
              variant="primary" 
              onClick={() => setIsCreating(true)} 
              icon={Plus}
              className="px-8 shadow-lg shadow-primary-500/20 rounded-2xl h-12"
            >
              Nueva Línea
            </Button>
          </div>

          <StatsCards stats={stats} isLoading={isLoading} />

          {/* FILTROS INTEGRADOS */}
          <Card className="mb-6 p-4 border-none shadow-sm rounded-2xl">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input 
                  placeholder="Buscar línea, nombre o ID..." 
                  icon={Search}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="!rounded-xl border-none bg-neutral-100 dark:bg-neutral-700"
                />
                <Select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  options={[
                    { label: 'Todas las Empresas', value: 'all' },
                    { label: 'RDC', value: 'RDC' },
                    { label: 'CRUZTOR', value: 'CRUZTOR' },
                    { label: 'GTC', value: 'GTC' },
                  ]}
                  className="!rounded-xl"
                />
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { label: 'Todos los Estados', value: 'all' },
                    { label: 'ACTIVA', value: 'ACTIVA' },
                    { label: 'INACTIVA', value: 'INACTIVA' },
                  ]}
                  className="!rounded-xl"
                />
             </div>
          </Card>

          <LinesTable 
            lines={filteredLines} 
            onSelect={(id) => setSelectedLineId(id)}
            employeeAlerts={employeeAlerts}
            isLoading={isLoading}
          />
        </div>
      ) : (
        <LineDetailForm 
          formData={formData}
          equipos={equipos}
          employeeAlerts={employeeAlerts}
          isCreating={isCreating}
          onBack={handleBack}
          onSave={handleSave}
          onDelete={handleDelete}
          onInputChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
          activeSubTab={activeSubTab}
          setActiveSubTab={setActiveSubTab}
        />
      )}
    </div>
  );
};
