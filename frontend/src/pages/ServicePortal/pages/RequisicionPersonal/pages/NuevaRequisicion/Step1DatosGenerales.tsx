// Paso 1: Datos Generales de la Requisición
import React, { useEffect, useState } from 'react';
import { MapPin, Briefcase, User, Hash, Calendar, Building2, HardHat } from 'lucide-react';
import { Button, Input, Select, Text, Title } from '../../../../../../components/atoms';
import { FormField, TextAreaField } from '../../../Common';
import type { FormularioRP } from '../../types/requisicion.types';
import type { CiudadRP } from '../../types/requisicion.types';
import { getCiudades } from '../../services/requisicionService';
import { CentroCostoService, CostCenterItem } from '../../../../../../services/CentroCostoService';

interface Props {
  form: FormularioRP;
  update: <K extends keyof FormularioRP>(k: K, v: FormularioRP[K]) => void;
  correoSolicitante: string;
  nombreSolicitante: string;
}

const Step1DatosGenerales: React.FC<Props> = ({ form, update, correoSolicitante, nombreSolicitante }) => {
  const [ciudades, setCiudades] = useState<CiudadRP[]>([]);

  // Autocomplete Centro de costo
  const [combinations, setCombinations] = useState<{ code: string; label: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedBreakdown, setSelectedBreakdown] = useState<string>('');

  useEffect(() => {
    getCiudades().then(setCiudades).catch(() => {});
  }, []);

  useEffect(() => {
    // Cargar los tres catálogos del ERP
    Promise.all([
      CentroCostoService.getUens(),
      CentroCostoService.getSubcentros(),
      CentroCostoService.getEspecialidades()
    ]).then(([u, s, e]) => {
      // Filtrar solo los activos
      const activeUens = u.filter(x => x.activo);
      const activeSubcentros = s.filter(x => x.activo);
      const activeEspecialidades = e.filter(x => x.activo);

      // Generar el producto cartesiano de combinaciones
      const list: { code: string; label: string }[] = [];
      activeUens.forEach(uen => {
        activeSubcentros.forEach(sub => {
          activeEspecialidades.forEach(esp => {
            const code = `${uen.codigo}${sub.codigo}-${esp.codigo}`;
            const label = `${uen.nombre} - ${sub.nombre} - ${esp.nombre}`;
            list.push({ code, label });
          });
        });
      });
      setCombinations(list);

      // Si el formulario ya tiene un valor inicial, buscar su descripción
      if (form.centro_costo) {
        const found = list.find(x => x.code === form.centro_costo);
        if (found) {
          setSelectedBreakdown(found.label);
          setSearchTerm(found.code);
        } else {
          setSearchTerm(form.centro_costo);
        }
      }
    }).catch(err => {
      console.error('Error cargando centros de costos para autocomplete:', err);
    });
  }, [form.centro_costo]);

  const handleInputChange = (val: string) => {
    setSearchTerm(val);
    setShowDropdown(true);
    
    const match = combinations.find(c => c.code.toLowerCase() === val.trim().toLowerCase());
    if (match) {
      update('centro_costo', match.code);
      setSelectedBreakdown(match.label);
    } else {
      update('centro_costo', ''); // Descalifica si no coincide exactamente
      setSelectedBreakdown('');
    }
  };

  const handleSelect = (code: string, label: string) => {
    update('centro_costo', code);
    setSearchTerm(code);
    setSelectedBreakdown(label);
    setShowDropdown(false);
  };

  const filtered = combinations
    .filter(c => 
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.label.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .slice(0, 15);

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
          min={1}
          value={String(form.numero_personas_requeridas)}
          onChange={e => {
            const val = e.target.value;
            const clean = val.replace(/\D/g, '');
            const parsed = clean ? parseInt(clean, 10) : 0;
            update('numero_personas_requeridas', parsed);
          }}
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
        <div className="relative">
          <Input
            label="Centro de costo"
            name="centro_costo"
            value={searchTerm}
            onChange={e => handleInputChange(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => {
              // Pequeño retardo para dar tiempo a capturar el click en el listado
              setTimeout(() => setShowDropdown(false), 200);
            }}
            placeholder="Escriba el código o nombre del centro de costo..."
            required
            autoComplete="off"
          />

          {showDropdown && searchTerm.trim().length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-[var(--color-border)] rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-[var(--color-border)] transition-all">
              {filtered.length > 0 ? (
                filtered.map(c => (
                  <Button
                    variant="custom"
                    key={c.code}
                    type="button"
                    onClick={() => handleSelect(c.code, c.label)}
                    className="w-full !justify-start px-4 py-3 bg-white dark:bg-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-700 flex flex-row items-center gap-2 transition-colors"
                  >
                    <Text as="span" className="font-mono font-bold text-sm text-[var(--color-primary)] whitespace-nowrap">{c.code}</Text>
                    <Text as="span" className="text-xs text-slate-500 dark:text-slate-400 truncate">- {c.label}</Text>
                  </Button>
                ))
              ) : (
                <div className="px-4 py-3 text-xs text-red-500 font-medium">
                  Ninguna combinación válida encontrada
                </div>
              )}
            </div>
          )}

          {/* Discriminación del Centro de Costo */}
          {selectedBreakdown && (
            <div className="mt-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <Text as="span" className="text-emerald-600 dark:text-emerald-400 font-bold text-xs select-none">✓</Text>
              <div>
                <Text as="span" className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">Centro de Costo Válido</Text>
                <Text as="span" className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">{selectedBreakdown}</Text>
              </div>
            </div>
          )}

          {searchTerm && !selectedBreakdown && (
            <div className="mt-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <Text as="span" className="text-red-600 dark:text-red-400 font-bold text-xs select-none">⚠</Text>
              <div>
                <Text as="span" className="text-xs font-bold text-red-800 dark:text-red-300 block">Combinación Inválida</Text>
                <Text as="span" className="text-xs text-red-700 dark:text-red-400 font-medium">
                  El centro de costo ingresado no corresponde a ninguna combinación activa en el ERP.
                </Text>
              </div>
            </div>
          )}
        </div>
      </div>

      <TextAreaField
        label="Perfil requerido"
        name="perfil_requerido"
        value={form.perfil_requerido}
        onChange={e => update('perfil_requerido', e.target.value)}
        placeholder="Experiencia, formación, conocimientos técnicos, certificaciones, competencias y condiciones especiales requeridas..."
        rows={5}
        isRequired={false}
      />
    </div>
  );
};

export default Step1DatosGenerales;
