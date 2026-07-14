import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Smartphone, Check, X, Search } from 'lucide-react';
import { Button, Input, Title, Text, Icon, Badge, Select } from '../../../components/atoms';
import { useNotifications } from '../../../components/notifications/NotificationsContext';
import { EquipoMovil } from '../useCorporateLines';

interface Props {
  equipos: EquipoMovil[];
  onCreate: (data: Partial<EquipoMovil>) => Promise<EquipoMovil>;
  onUpdate: (id: number, data: Partial<EquipoMovil>) => Promise<EquipoMovil>;
  onDelete: (id: number) => Promise<void>;
}

export const EquiposManager: React.FC<Props> = ({ equipos, onCreate, onUpdate, onDelete }) => {
  const { addNotification } = useNotifications();
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<EquipoMovil>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const startCreate = () => {
    setIsCreating(true);
    setIsEditing(null);
    setFormData({ estado_fisico: 'BUENO', marca: '', modelo: '', imei: '', serial: '', observaciones: '' });
  };

  const startEdit = (equipo: EquipoMovil) => {
    setIsEditing(equipo.id);
    setIsCreating(false);
    setFormData(equipo);
  };

  const cancelForm = () => {
    setIsEditing(null);
    setIsCreating(false);
    setFormData({});
  };

  const handleSave = async () => {
    if (!formData.modelo?.trim()) {
      addNotification('warning', 'El modelo es obligatorio.');
      return;
    }

    setIsProcessing(true);
    try {
      if (isCreating) {
        await onCreate(formData);
        addNotification('success', 'Equipo añadido al inventario');
      } else if (isEditing) {
        await onUpdate(isEditing, formData);
        addNotification('success', 'Equipo actualizado');
      }
      cancelForm();
    } catch (err: any) {
      addNotification('error', err.message || 'Error al guardar el equipo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Está seguro de eliminar este equipo?')) return;
    setIsProcessing(true);
    try {
      await onDelete(id);
      addNotification('success', 'Equipo eliminado');
    } catch (err: any) {
      addNotification('error', err.message || 'Error al eliminar el equipo');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredEquipos = equipos.filter(e => 
    e.modelo.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (e.marca && e.marca.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (e.imei && e.imei.includes(searchTerm)) ||
    (e.serial && e.serial.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white dark:bg-neutral-800 p-6 rounded-3xl shadow-sm">
        <div>
          <Title variant="h4" className="flex items-center gap-2">
            <Icon name={Smartphone} className="text-primary" />
            Inventario de Equipos Móviles
          </Title>
          <Text variant="caption" className="opacity-60">Gestione los dispositivos físicos de la empresa.</Text>
        </div>
        {!isCreating && !isEditing && (
          <Button variant="primary" onClick={startCreate} icon={Plus} className="rounded-xl px-6">
            Nuevo Equipo
          </Button>
        )}
      </div>

      {(isCreating || isEditing) && (
        <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-6 rounded-3xl space-y-4">
          <Title variant="h5">{isCreating ? 'Añadir Nuevo Equipo' : 'Editar Equipo'}</Title>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Marca"
              value={formData.marca || ''}
              onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
              className="!rounded-xl"
              placeholder="Ej: Samsung, Apple"
            />
            <Input
              label="Modelo *"
              value={formData.modelo || ''}
              onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
              className="!rounded-xl"
              placeholder="Ej: Galaxy S23, iPhone 15"
            />
            <Input
              label="IMEI"
              value={formData.imei || ''}
              onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
              className="!rounded-xl"
            />
            <Input
              label="Serial"
              value={formData.serial || ''}
              onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
              className="!rounded-xl"
            />
            <Select
              label="Estado Físico"
              value={formData.estado_fisico || 'BUENO'}
              onChange={(e) => setFormData({ ...formData, estado_fisico: e.target.value })}
              options={[
                { label: 'NUEVO', value: 'NUEVO' },
                { label: 'BUENO', value: 'BUENO' },
                { label: 'REGULAR', value: 'REGULAR' },
                { label: 'MALO', value: 'MALO' },
                { label: 'DAÑADO', value: 'DAÑADO' },
              ]}
              className="!rounded-xl"
            />
            <Input
              label="Observaciones"
              value={formData.observaciones || ''}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              className="!rounded-xl"
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
            placeholder="Buscar por marca, modelo, IMEI o serial..."
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
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">ID / Marca</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Modelo</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">IMEI / Serial</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-center">Estado</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {filteredEquipos.map((equipo) => (
                <tr key={equipo.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/20 transition-colors">
                  <td className="px-6 py-4">
                    <Text weight="bold" className="text-primary">#{equipo.id}</Text>
                    <Text variant="caption">{equipo.marca || 'Sin marca'}</Text>
                  </td>
                  <td className="px-6 py-4 font-medium">{equipo.modelo}</td>
                  <td className="px-6 py-4">
                    <Text variant="body2">{equipo.imei || 'Sin IMEI'}</Text>
                    <Text variant="caption" className="opacity-60">{equipo.serial}</Text>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge variant={equipo.estado_fisico === 'NUEVO' ? 'info' : equipo.estado_fisico === 'BUENO' ? 'success' : equipo.estado_fisico === 'DAÑADO' ? 'danger' : 'warning'}>
                      {equipo.estado_fisico}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 flex justify-end gap-2">
                    <Button variant="ghost" size="sm" icon={Edit2} onClick={() => startEdit(equipo)} />
                    <Button variant="ghost" size="sm" icon={Trash2} onClick={() => handleDelete(equipo.id)} className="text-red-500 hover:bg-red-50" />
                  </td>
                </tr>
              ))}
              {filteredEquipos.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 opacity-50">
                    {equipos.length === 0 ? 'No hay equipos registrados' : 'No se encontraron resultados para la búsqueda'}
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
