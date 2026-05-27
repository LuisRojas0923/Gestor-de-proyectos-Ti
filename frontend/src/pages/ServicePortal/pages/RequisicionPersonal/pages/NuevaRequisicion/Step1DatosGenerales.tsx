// Paso 1: Datos Generales de la Requisición
import React, { useEffect, useState } from 'react';
import { MapPin, Briefcase, User, Hash, Calendar, Building2, HardHat } from 'lucide-react';
import { Select, Title, Text } from '../../../../../../components/atoms';
import { FormField, TextAreaField } from '../../../Common';
import type { FormularioRP } from '../../types/requisicion.types';
import type { CiudadRP } from '../../types/requisicion.types';
import { getCiudades } from '../../services/requisicionService';

interface Props {
  form: FormularioRP;
  update: <K extends keyof FormularioRP>(k: K, v: FormularioRP[K]) => void;
  correoSolicitante: string;
  nombreSolicitante: string;
}

const Step1DatosGenerales: React.FC<Props> = ({ form, update, correoSolicitante, nombreSolicitante }) => {
  const [ciudades, setCiudades] = useState<CiudadRP[]>([]);

  useEffect(() => {
    getCiudades().then(setCiudades).catch(() => {});
  }, []);

  const ciudadOptions = ciudades.map(c => ({ value: String(c.id), label: c.nombre }));
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-2 border-b border-[var(--color-border)]">
        <User className="w-5 h-5 text-[var(--color-primary)]" />
        <Title variant="h6" className="font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
          Información del Solicitante
        </Title>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormField label="Nombre del solicitante" name="nombre_solicitante" defaultValue={nombreSolicitante} readOnly icon={User} />
        <FormField label="Correo del solicitante" name="correo_solicitante" defaultValue={correoSolicitante} readOnly icon={User} />
      </div>

      <div className="flex items-center gap-3 pt-2 pb-2 border-b border-[var(--color-border)]">
        <Building2 className="w-5 h-5 text-[var(--color-primary)]" />
        <Title variant="h6" className="font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
          Datos de la Obra / Proyecto
        </Title>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Select
          label="Ciudad"
          name="ciudad_id"
          value={form.ciudad_id ? String(form.ciudad_id) : ''}
          onChange={e => update('ciudad_id', e.target.value ? Number(e.target.value) : null)}
          icon={MapPin}
          options={[{ value: '', label: 'Seleccionar ciudad...' }, ...ciudadOptions]}
          required
        />
        <FormField
          label="OT (Orden de Trabajo)"
          name="ot"
          value={form.ot}
          onChange={e => update('ot', e.target.value)}
          icon={Hash}
          placeholder="Ej: OT-20260001 o N/A"
          isRequired={false}
        />
        <FormField
          label="Nombre obra / proyecto"
          name="nombre_obra_proyecto"
          value={form.nombre_obra_proyecto}
          onChange={e => update('nombre_obra_proyecto', e.target.value)}
          icon={Briefcase}
          isRequired
        />
        <FormField
          label="Dirección de obra o proyecto"
          name="direccion_obra_proyecto"
          value={form.direccion_obra_proyecto}
          onChange={e => update('direccion_obra_proyecto', e.target.value)}
          icon={MapPin}
          isRequired={false}
        />
        <FormField
          label="Encargado en sitio"
          name="encargado_sitio"
          value={form.encargado_sitio}
          onChange={e => update('encargado_sitio', e.target.value)}
          icon={HardHat}
          isRequired={false}
        />
        <FormField
          label="N° personas requeridas"
          name="numero_personas_requeridas"
          type="number"
          value={String(form.numero_personas_requeridas)}
          onChange={e => update('numero_personas_requeridas', Number(e.target.value))}
          isRequired
        />
        <Select
          label="TSA (Trabajo Seguro en Alturas)"
          name="tsa"
          value={form.tsa}
          onChange={e => update('tsa', e.target.value)}
          options={[
            { value: '', label: 'Seleccionar...' },
            { value: 'APLICA', label: 'APLICA' },
            { value: 'NO APLICA', label: 'NO APLICA' },
          ]}
          required
        />
        <Select
          label="Duración obra o contrato"
          name="duracion_obra_contrato"
          value={form.duracion_obra_contrato}
          onChange={e => update('duracion_obra_contrato', e.target.value)}
          options={[
            { value: '', label: 'Seleccionar...' },
            { value: '2 MESES', label: '2 MESES' },
            { value: 'MÁS DE 2 MESES', label: 'MÁS DE 2 MESES' },
          ]}
          required
        />
        <FormField
          label="Fecha probable de ingreso"
          name="fecha_probable_ingreso"
          type="date"
          value={form.fecha_probable_ingreso}
          onChange={e => update('fecha_probable_ingreso', e.target.value)}
          min={today}
          icon={Calendar}
          isRequired
        />
        <FormField
          label="Centro de costo"
          name="centro_costo"
          value={form.centro_costo}
          onChange={e => update('centro_costo', e.target.value)}
          isRequired
        />
      </div>

      <TextAreaField
        label="Perfil requerido"
        name="perfil_requerido"
        value={form.perfil_requerido}
        onChange={e => update('perfil_requerido', e.target.value)}
        placeholder="Experiencia, formación, conocimientos técnicos, certificaciones, competencias y condiciones especiales requeridas..."
        rows={5}
        isRequired
      />
    </div>
  );
};

export default Step1DatosGenerales;
