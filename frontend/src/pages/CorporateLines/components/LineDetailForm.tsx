import React from 'react';
import { Smartphone, User, CreditCard, Save, Trash2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { 
  Button, Input, Select, Textarea, MaterialCard as Card, Title, Text
} from '../../../components/atoms';
import { CorporateLine, EquipoMovil } from '../useCorporateLines';

interface FormProps {
  formData: Partial<CorporateLine>;
  equipos: EquipoMovil[];
  employeeAlerts: Record<string, { inactivo: boolean; motivos: string; clase: 'WARNING' | 'CRITICAL' }>;
  isCreating: boolean;
  onBack: () => void;
  onSave: () => void;
  onDelete: () => void;
  onInputChange: (field: keyof CorporateLine, value: any) => void;
  activeSubTab: 'general' | 'tecnico' | 'finanzas';
  setActiveSubTab: (tab: 'general' | 'tecnico' | 'finanzas') => void;
}

export const LineDetailForm: React.FC<FormProps> = ({
  formData, equipos, employeeAlerts, isCreating,
  onBack, onSave, onDelete, onInputChange,
  activeSubTab, setActiveSubTab
}) => {
  const hasAlert = formData.documento_asignado && employeeAlerts[formData.documento_asignado];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in slide-in-from-right-4 duration-500 pb-20">
      {/* HEADER ACCIONES */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-neutral-800 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-700 shadow-sm sticky top-0 z-30 transition-all backdrop-blur-md bg-opacity-90">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} icon={ArrowLeft} className="rounded-full !p-2" />
          <div>
            <div className="flex items-center gap-2 text-primary-500 mb-1">
              <Smartphone size={18} />
              <Text variant="caption" weight="bold" className="uppercase tracking-widest text-[10px]">Expediente de Línea</Text>
            </div>
            <Title variant="h3" weight="bold">
              {isCreating ? 'Apertura de Nueva Línea' : formData.linea}
            </Title>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          {!isCreating && (
            <Button variant="outline" onClick={onDelete} icon={Trash2} className="text-red-500 hover:bg-red-50 hover:border-red-200 flex-1 md:flex-none">
              Dar de Baja
            </Button>
          )}
          <Button variant="primary" onClick={onSave} icon={Save} className="shadow-lg shadow-primary-500/20 flex-1 md:flex-none">
            {isCreating ? 'Guardar Registro' : 'Actualizar Cambios'}
          </Button>
        </div>
      </div>

      {/* ALERTA CRÍTICA */}
      {hasAlert && (
        <div className={`${hasAlert.clase === 'CRITICAL' ? 'bg-red-50 dark:bg-red-900/20 border-red-500' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-500'} border-l-4 p-5 rounded-r-3xl flex gap-4 animate-in shake duration-500`}>
          <div className={`w-12 h-12 rounded-2xl ${hasAlert.clase === 'CRITICAL' ? 'bg-red-100 dark:bg-red-900/40 text-red-600' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600'} flex items-center justify-center shrink-0`}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <Title variant="h6" color={hasAlert.clase === 'CRITICAL' ? 'error' : 'warning'} weight="bold" className="mb-1 uppercase tracking-tight">
              {hasAlert.clase === 'CRITICAL' ? 'Situación de Personal Crítica' : 'Aviso de Retiro Próximo'}
            </Title>
            <Text variant="body2" color={hasAlert.clase === 'CRITICAL' ? 'error' : 'warning'} weight="medium" className="leading-relaxed opacity-90">
              {hasAlert.motivos} — <Text weight="bold" className="inline">Acción Requerida:</Text> Validar recuperación de línea o reasignación inmediata.
            </Text>
          </div>
        </div>
      )}

      {/* TABS DE NAVEGACIÓN */}
      <div className="flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 max-w-fit mx-auto md:mx-0">
        <Button 
          variant={activeSubTab === 'general' ? 'primary' : 'ghost'} 
          size="sm"
          onClick={() => setActiveSubTab('general')}
          className="rounded-xl px-6"
        >
          General & Asignación
        </Button>
        <Button 
          variant={activeSubTab === 'tecnico' ? 'primary' : 'ghost'} 
          size="sm"
          onClick={() => setActiveSubTab('tecnico')}
          className="rounded-xl px-6"
        >
          Equipo & Hardware
        </Button>
        <Button 
          variant={activeSubTab === 'finanzas' ? 'primary' : 'ghost'} 
          size="sm"
          onClick={() => setActiveSubTab('finanzas')}
          className="rounded-xl px-6"
        >
          Finanzas & Cobro
        </Button>
      </div>

      <Card className="p-8 border-none shadow-2xl shadow-black/5 rounded-[2rem]">
        {activeSubTab === 'general' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <Title variant="h6" weight="bold" className="border-b pb-2 dark:border-neutral-700">Identificación</Title>
              <Input 
                label="Número de Línea Móvil" 
                value={formData.linea || ''} 
                onChange={(e) => onInputChange('linea', e.target.value)} 
                placeholder="Ej. +57 311..."
                className="!rounded-2xl"
              />
              <Select
                label="Empresa Responsable"
                value={formData.empresa || 'RDC'}
                onChange={(e) => onInputChange('empresa', e.target.value)}
                options={[
                  { label: 'RDC', value: 'RDC' },
                  { label: 'CRUZTOR', value: 'CRUZTOR' },
                  { label: 'GTC', value: 'GTC' },
                ]}
                className="!rounded-2xl"
              />
              <Select
                label="Estado de la Línea"
                value={formData.estatus || 'ACTIVA'}
                onChange={(e) => onInputChange('estatus', e.target.value)}
                options={[
                  { label: 'ACTIVA', value: 'ACTIVA' },
                  { label: 'INACTIVA', value: 'INACTIVA' },
                  { label: 'SUSPENDIDA', value: 'SUSPENDIDA' },
                ]}
                className="!rounded-2xl"
              />
            </div>

            <div className="space-y-6">
              <Title variant="h6" weight="bold" className="border-b pb-2 dark:border-neutral-700">Situación Laboral</Title>
              <Input 
                label="Identificación Usuario (Cédula)" 
                value={formData.documento_asignado || ''} 
                onChange={(e) => onInputChange('documento_asignado', e.target.value)} 
                icon={User}
                className="!rounded-2xl"
              />
              <Input 
                label="Responsable del Cobro" 
                value={formData.documento_cobro || ''} 
                onChange={(e) => onInputChange('documento_cobro', e.target.value)} 
                icon={CreditCard}
                className="!rounded-2xl"
              />
              <Select
                label="Tipo de Asignación"
                value={formData.estado_asignacion || 'ASIGNADA'}
                onChange={(e) => onInputChange('estado_asignacion', e.target.value)}
                options={[
                  { label: 'ASIGNADA', value: 'ASIGNADA' },
                  { label: 'DISPONIBLE (LIBRE)', value: 'LIBRE' },
                  { label: 'REPO EN STOCK', value: 'STOCK' },
                ]}
                className="!rounded-2xl"
              />
            </div>
          </div>
        )}

        {activeSubTab === 'tecnico' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Title variant="h6" weight="bold">Hardware Asignado</Title>
                <Select
                  label="Dispositivo del Inventario"
                  value={formData.equipo_id?.toString() || ''}
                  onChange={(e) => onInputChange('equipo_id', e.target.value === '' ? null : parseInt(e.target.value))}
                  options={[
                    { label: 'Seleccionar del catálogo...', value: '' },
                    ...equipos.map(e => ({ label: `${e.modelo} - ${e.imei || 'Sin IMEI'}`, value: (e.id || '').toString() })),
                  ]}
                  className="!rounded-2xl"
                />
                <Input 
                   label="Nombre del Plan Contratado"
                   value={formData.nombre_plan || ''}
                   onChange={(e) => onInputChange('nombre_plan', e.target.value)}
                   placeholder="Ej. Plan Empresarial 60GB"
                   className="!rounded-2xl"
                />
              </div>
              <div className="space-y-4">
                <Textarea 
                  label="Bitácora Técnica & Observaciones"
                  value={formData.observaciones || ''}
                  onChange={(e) => onInputChange('observaciones', e.target.value)}
                  placeholder="Registre incidencias, cambios de equipo o notas importantes..."
                  rows={6}
                  className="!rounded-3xl"
                />
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'finanzas' && (
          <div className="space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
               <div className="p-5 bg-primary-50 dark:bg-primary-900/10 rounded-3xl border border-primary-100 dark:border-primary-800/50 space-y-4">
                  <Title variant="h6" weight="bold" color="text-primary">Parámetros de Dispersión (Motor IA)</Title>
                  <Text variant="caption" className="opacity-70 mb-4 block">Define qué porcentaje asume el empleado en la liquidación automática.</Text>
                  <div className="grid grid-cols-2 gap-4">
                     <Select 
                        label="Cobro Cargo Fijo"
                        value={formData.cobro_fijo_coef?.toString() || "0.5"}
                        onChange={(e) => onInputChange('cobro_fijo_coef', parseFloat(e.target.value))}
                        options={[
                          { label: 'Empresa 100% (0)', value: '0' },
                          { label: 'Mitad / Mitad (0.5)', value: '0.5' },
                          { label: 'Empleado 100% (1)', value: '1' },
                        ]}
                        className="!rounded-2xl"
                     />
                     <Select 
                        label="Cobro Especiales"
                        value={formData.cobro_especiales_coef?.toString() || "1"}
                        onChange={(e) => onInputChange('cobro_especiales_coef', parseFloat(e.target.value))}
                        options={[
                          { label: 'Empresa 100% (0)', value: '0' },
                          { label: 'Mitad / Mitad (0.5)', value: '0.5' },
                          { label: 'Empleado 100% (1)', value: '1' },
                        ]}
                        className="!rounded-2xl"
                     />
                  </div>
               </div>
               <div className="p-5 bg-neutral-50 dark:bg-neutral-900/50 rounded-3xl border border-neutral-200 dark:border-neutral-700/50 space-y-4">
                  <Title variant="h6" weight="bold">Aprobaciones</Title>
                  <Input 
                    label="Centro de Costo (C.O)" 
                    value={formData.asignado?.centro_costo || 'GENERAL'} 
                    disabled 
                    className="!rounded-2xl opacity-60"
                  />
                  <Input 
                    label="Convenio / Aprobado Por" 
                    value={formData.aprobado_por || ''} 
                    onChange={(e) => onInputChange('aprobado_por', e.target.value)}
                    className="!rounded-2xl"
                  />
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {[
                   { label: 'CFM con IVA ($)', field: 'cfm_con_iva' },
                   { label: 'CFM sin IVA ($)', field: 'cfm_sin_iva' },
                   { label: 'Descuento 39% ($)', field: 'descuento_39' },
                   { label: 'V/R Factura Operador ($)', field: 'vr_factura' },
                   { label: 'Deducción Empleado ($)', field: 'pago_empleado' },
                   { label: 'Deducción Empresa ($)', field: 'pago_empresa' },
                   { label: '1era Quincena ($)', field: 'primera_quincena' },
                   { label: '2da Quincena ($)', field: 'segunda_quincena' },
                 ].map((item) => (
                   <Input 
                      key={item.field}
                      label={item.label} 
                      type="number" 
                      value={(formData as any)[item.field]?.toString()} 
                      onChange={(e) => onInputChange(item.field as any, parseFloat(e.target.value) || 0)} 
                      className="!rounded-2xl"
                   />
                 ))}
             </div>
          </div>
        )}
      </Card>
      
      {!isCreating && (
        <div className="flex justify-center pt-4 opacity-40 hover:opacity-100 transition-opacity">
           <Text variant="caption">Última actualización: {new Date(formData.updated_at || '').toLocaleString()}</Text>
        </div>
      )}
    </div>
  );
};
