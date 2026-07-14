import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Users, Check, X, Search } from 'lucide-react';
import { Button, Input, Title, Text, Icon, Badge, Select } from '../../../components/atoms';
import { useNotifications } from '../../../components/notifications/NotificationsContext';
import { PersonaLinea } from '../useCorporateLines';

interface Props {
  personas: PersonaLinea[];
  onCreate: (data: Partial<PersonaLinea>) => Promise<PersonaLinea>;
  onUpdate: (documento: string, data: Partial<PersonaLinea>) => Promise<PersonaLinea>;
  onDelete: (documento: string) => Promise<void>;
}

export const PersonasManager: React.FC<Props> = ({ personas, onCreate, onUpdate, onDelete }) => {
  const { addNotification } = useNotifications();
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PersonaLinea>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const startCreate = () => {
    setIsCreating(true);
    setIsEditing(null);
    setFormData({ tipo: 'INTERNO', documento: '', nombre: '', cargo: '', area: '', centro_costo: '' });
  };

  const startEdit = (persona: PersonaLinea) => {
    setIsEditing(persona.documento);
    setIsCreating(false);
    setFormData(persona);
  };

  const cancelForm = () => {
    setIsEditing(null);
    setIsCreating(false);
    setFormData({});
  };

  const handleSave = async () => {
    if (!formData.documento?.trim() || !formData.nombre?.trim()) {
      addNotification('warning', 'La cédula y el nombre son obligatorios.');
      return;
    }

    setIsProcessing(true);
    try {
      if (isCreating) {
        await onCreate(formData);
        addNotification('success', 'Persona añadida al directorio');
      } else if (isEditing) {
        await onUpdate(isEditing, formData);
        addNotification('success', 'Persona actualizada');
      }
      cancelForm();
    } catch (err: any) {
      addNotification('error', err.message || 'Error al guardar');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (documento: string) => {
    if (!window.confirm('¿Está seguro de eliminar esta persona? Esto fallará si tiene líneas asignadas.')) return;
    setIsProcessing(true);
    try {
      await onDelete(documento);
      addNotification('success', 'Persona eliminada del directorio');
    } catch (err: any) {
      addNotification('error', err.message || 'Error al eliminar');
    } finally {
      setIsProcessing(false);
    }
  };

  const simulateERPFetch = () => {
    if (!formData.documento?.trim()) {
      addNotification('warning', 'Ingrese una cédula para buscar en el ERP (Simulado)');
      return;
    }
    // ERP Mock Fetch
    addNotification('info', 'Consultando ERP...');
    setTimeout(() => {
      setFormData({
        ...formData,
        nombre: 'Empleado ERP Automático',
        cargo: 'Analista Creado ERP',
        area: 'Tecnología',
        centro_costo: 'TI-001'
      });
      addNotification('success', 'Datos encontrados en ERP (Modo Simulación)');
    }, 800);
  };

  const filteredPersonas = personas.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.documento.includes(searchTerm) ||
    (p.cargo && p.cargo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white dark:bg-neutral-800 p-6 rounded-3xl shadow-sm">
        <div>
          <Title variant="h4" className="flex items-center gap-2">
            <Icon name={Users} className="text-primary" />
            Directorio de Personas
          </Title>
          <Text variant="caption" className="opacity-60">Gestione los empleados y su información de área / centro de costo.</Text>
        </div>
        {!isCreating && !isEditing && (
          <Button variant="primary" onClick={startCreate} icon={Plus} className="rounded-xl px-6">
            Añadir Persona
          </Button>
        )}
      </div>

      {(isCreating || isEditing) && (
        <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-6 rounded-3xl space-y-4">
          <div className="flex justify-between items-center">
             <Title variant="h5">{isCreating ? 'Añadir Nueva Persona' : 'Editar Persona'}</Title>
             {isCreating && (
               <Button variant="outline" size="sm" icon={Search} onClick={simulateERPFetch} className="bg-white">
                 Buscar en ERP (Simulado)
               </Button>
             )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Identificación (Cédula) *"
              value={formData.documento || ''}
              onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
              className="!rounded-xl"
              disabled={!!isEditing} // No permitir cambiar la cédula si estamos editando
            />
            <Input
              label="Nombre Completo *"
              value={formData.nombre || ''}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="!rounded-xl"
            />
            <Select
              label="Tipo de Relación"
              value={formData.tipo || 'INTERNO'}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              options={[
                { label: 'INTERNO', value: 'INTERNO' },
                { label: 'EXTERNO', value: 'EXTERNO' },
                { label: 'PROVEEDOR', value: 'PROVEEDOR' },
              ]}
              className="!rounded-xl"
            />
            <Input
              label="Cargo"
              value={formData.cargo || ''}
              onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
              className="!rounded-xl"
            />
            <Input
              label="Área"
              value={formData.area || ''}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              className="!rounded-xl"
            />
            <Input
              label="Centro de Costo"
              value={formData.centro_costo || ''}
              onChange={(e) => setFormData({ ...formData, centro_costo: e.target.value })}
              className="!rounded-xl"
              placeholder="Ej: CO-1025"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={cancelForm} icon={X} disabled={isProcessing}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave} icon={Check} loading={isProcessing}>
              Guardar
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-neutral-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-700">
          <Input
            placeholder="Buscar por cédula, nombre o cargo..."
            icon={Search}
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="!rounded-xl border-none bg-neutral-100 dark:bg-neutral-900 max-w-md"
          />
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-neutral-50 dark:bg-neutral-900/50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Cédula</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Nombre Completo</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Cargo / Área</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Centro de Costo</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {filteredPersonas.map((persona) => (
                <tr key={persona.documento} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/20 transition-colors">
                  <td className="px-6 py-4 font-mono text-primary font-medium">{persona.documento}</td>
                  <td className="px-6 py-4 font-medium">
                    {persona.nombre}
                    {persona.tipo !== 'INTERNO' && (
                      <Badge variant="warning" className="ml-2 text-[10px]">{persona.tipo}</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Text variant="body2">{persona.cargo || '-'}</Text>
                    <Text variant="caption" className="opacity-60">{persona.area}</Text>
                  </td>
                  <td className="px-6 py-4 text-neutral-600 dark:text-neutral-400 font-mono">
                    {persona.centro_costo || '-'}
                  </td>
                  <td className="px-6 py-4 flex justify-end gap-2">
                    <Button variant="ghost" size="sm" icon={Edit2} onClick={() => startEdit(persona)} />
                    <Button variant="ghost" size="sm" icon={Trash2} onClick={() => handleDelete(persona.documento)} className="text-red-500 hover:bg-red-50" />
                  </td>
                </tr>
              ))}
              {filteredPersonas.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 opacity-50">
                    {personas.length === 0 ? 'No hay personas registradas' : 'No se encontraron resultados para la búsqueda'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
