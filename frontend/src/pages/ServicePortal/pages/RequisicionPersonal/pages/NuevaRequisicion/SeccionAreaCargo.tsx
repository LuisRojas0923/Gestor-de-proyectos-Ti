import React, { useEffect, useState } from 'react';
import { Layers, Briefcase } from 'lucide-react';
import { Select, Text, Input, Button } from '../../../../../../components/atoms';
import { TextAreaField } from '../../../Common';
import type { FormularioRP, AreaRP, CargoRP, AprobadorRP } from '../../types/requisicion.types';
import { getAreas, getCargos } from '../../services/requisicionService';
import { CentroCostoService } from '../../../../../../services/CentroCostoService';
import { ModalSimuladorCentroCosto } from './ModalSimuladorCentroCosto';

const AutocompleteObjectField = ({
  label, name, value, onChange, options, placeholder, icon, disabled = false, required = false, labelHint
}: {
  label: string, name: string, value: string, onChange: (val: string) => void, options: {value: string, label: string}[], placeholder: string, icon: any, disabled?: boolean, required?: boolean, labelHint?: string
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const [prevValue, setPrevValue] = useState(value);
  const [prevOptions, setPrevOptions] = useState(options);

  if (value !== prevValue || options !== prevOptions) {
    setPrevValue(value);
    setPrevOptions(options);
    if (!value) {
      setSearchTerm('');
    } else {
      const match = options.find(o => o.value === value);
      if (match) setSearchTerm(match.label);
    }
  }

  const filtered = options
    .filter(o => o.label.toLowerCase().includes(searchTerm.toLowerCase()))
    .slice(0, 50);

  const handleSelect = (val: string, lbl: string) => {
    setSearchTerm(lbl);
    setShowDropdown(false);
    onChange(val);
  };

  const handleInputChange = (val: string) => {
    setSearchTerm(val);
    setShowDropdown(true);
    // No disparamos onChange('') aquí para permitir que el usuario escriba sin que el useEffect blanquee el input.
  };

  const handleBlur = () => {
    // Al quitar el setTimeout, evitamos problemas de closure con searchTerm.
    // Usamos onMouseDown en lugar de onClick en los botones para que el evento se dispare antes de perder el foco.
    setShowDropdown(false);
    const match = options.find(o => o.label.toLowerCase() === searchTerm.toLowerCase());
    if (match) {
      setSearchTerm(match.label);
      onChange(match.value);
    } else {
      setSearchTerm('');
      onChange('');
    }
  };

  return (
    <div className="relative flex-1">
      <Input
        label={label}
        name={name}
        value={searchTerm}
        onChange={e => handleInputChange(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        icon={icon}
        autoComplete="off"
        labelHint={labelHint}
      />
      {showDropdown && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-[var(--color-border)] rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-[var(--color-border)] transition-all">
          {filtered.length > 0 ? (
            filtered.map(o => (
              <Button
                variant="custom"
                key={o.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // Evita que se dispare el onBlur antes del click
                  handleSelect(o.value, o.label);
                }}
                className="w-full !justify-start px-4 py-3 bg-white dark:bg-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-700 transition-colors rounded-none"
              >
                <Text as="span" className="font-bold text-sm text-[var(--color-text-primary)]">{o.label}</Text>
              </Button>
            ))
          ) : (
            <div className="px-4 py-3 text-xs text-red-500 font-medium">
              No hay coincidencias
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface Props {
  form: FormularioRP;
  update: <K extends keyof FormularioRP>(k: K, v: FormularioRP[K]) => void;
  aprobadores: AprobadorRP[];
}

const CAUSALES = [
  { value: '', label: 'SELECCIONAR CAUSAL...' },
  { value: 'CREACIÓN DE UN NUEVO CARGO', label: 'CREACIÓN DE UN NUEVO CARGO' },
  { value: 'INCREMENTO OBRA / LABOR', label: 'INCREMENTO OBRA / LABOR' },
  { value: 'REEMPLAZO POR INCAPACIDAD ARL', label: 'REEMPLAZO POR INCAPACIDAD ARL' },
  { value: 'REEMPLAZO POR RETIRO VOLUNTARIO', label: 'REEMPLAZO POR RETIRO VOLUNTARIO' },
  { value: 'REEMPLAZO POR MATERNIDAD', label: 'REEMPLAZO POR MATERNIDAD' },
  { value: 'REEMPLAZO POR INCAPACIDAD EPS', label: 'REEMPLAZO POR INCAPACIDAD EPS' },
  { value: 'TERMINACIÓN DEL CONTRATO', label: 'TERMINACIÓN DEL CONTRATO' },
  { value: 'REEMPLAZO POR VACACIONES', label: 'REEMPLAZO POR VACACIONES' },
  { value: 'OTRO', label: 'OTRO (ESPECIFICAR)' },
];

export const SeccionAreaCargo: React.FC<Props> = ({ form, update, aprobadores }) => {
  // Estado para áreas y cargos
  const [areas, setAreas] = useState<AreaRP[]>([]);
  const [cargos, setCargos] = useState<CargoRP[]>([]);
  const [loadingCargos, setLoadingCargos] = useState(false);

  // Estado para centro de costo
  const [combinations, setCombinations] = useState<{ code: string; label: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedBreakdown, setSelectedBreakdown] = useState<string>('');
  
  // Datos para el simulador
  const [uens, setUens] = useState<any[]>([]);
  const [subcentros, setSubcentros] = useState<any[]>([]);
  const [especialidades, setEspecialidades] = useState<any[]>([]);
  const [isSimuladorOpen, setIsSimuladorOpen] = useState(false);

  // Cargar áreas
  useEffect(() => {
    getAreas().then(setAreas).catch(() => {});
  }, []);

  // Cargar centros de costo
  useEffect(() => {
    Promise.all([
      CentroCostoService.getUens(),
      CentroCostoService.getSubcentros(),
      CentroCostoService.getEspecialidades()
    ]).then(([u, s, e]) => {
      const activeUens = u.filter(x => x.activo);
      const activeSubcentros = s.filter(x => x.activo);
      const activeEspecialidades = e.filter(x => x.activo);

      setUens(activeUens);
      setSubcentros(activeSubcentros);
      setEspecialidades(activeEspecialidades);

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
      console.error('Error cargando centros de costos:', err);
    });
  }, [form.centro_costo]);

  const prevAreaIdRef = React.useRef<number | null>(form.area_id);

  // Cargar cargos cuando cambie el área
  useEffect(() => {
    if (form.area_id) {
      setLoadingCargos(true);
      if (prevAreaIdRef.current !== form.area_id) {
        update('cargo_id', null);
        prevAreaIdRef.current = form.area_id;
      }
      getCargos(form.area_id)
        .then(setCargos)
        .catch(() => {})
        .finally(() => setLoadingCargos(false));
    } else {
      setCargos([]);
      if (prevAreaIdRef.current !== null) {
        update('cargo_id', null);
        prevAreaIdRef.current = null;
      }
    }
  }, [form.area_id, update]);

  const areaOptions = [
    { value: '', label: 'SELECCIONAR ÁREA...' },
    ...areas.map(a => ({ value: String(a.id), label: a.nombre })),
  ];

  const cargoOptions = cargos.map(c => ({ value: String(c.id), label: c.nombre.toUpperCase() }));

  const directoresDelArea = aprobadores.filter(
    a => a.activo && a.area_id === form.area_id
  );

  const opcionesDirector = [
    { value: '', label: 'SELECCIONAR DIRECTOR...' },
    ...directoresDelArea.map(a => ({
      value: String(a.id),
      label: `${a.nombre_aprobador.toUpperCase()} — ${a.email_aprobador.toUpperCase()}`,
    })),
  ];

  const handleCCInputChange = (val: string) => {
    setSearchTerm(val);
    setShowDropdown(true);
    
    const match = combinations.find(c => c.code.toLowerCase() === val.trim().toLowerCase());
    if (match) {
      update('centro_costo', match.code);
      setSelectedBreakdown(match.label);
    } else {
      update('centro_costo', ''); 
      setSelectedBreakdown('');
    }
  };

  const handleCCSelect = (code: string, label: string) => {
    update('centro_costo', code);
    setSearchTerm(code);
    setSelectedBreakdown(label);
    setShowDropdown(false);
  };

  const filteredCC = combinations
    .filter(c => 
      c.code.toLowerCase().startsWith(searchTerm.toLowerCase()) || 
      c.label.toLowerCase().startsWith(searchTerm.toLowerCase())
    )
    .slice(0, 15);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        
        <div className="col-span-1 relative">
          <div className="mb-1 flex justify-between items-baseline gap-2">
            <Text as="label" variant="body2" weight="medium" color="text-primary" className="block">
              Centro de costo <Text as="span" color="error" className="ml-1">*</Text>
            </Text>
            <Button variant="custom"
              type="button"
              onClick={() => setIsSimuladorOpen(true)}
              className="text-[11px] md:text-xs text-[var(--color-primary)] hover:underline font-medium text-right whitespace-nowrap bg-transparent border-none cursor-pointer"
            >
              ¿No lo conoce? Simulador aquí
            </Button>
          </div>
          <Input
            name="centro_costo"
            value={searchTerm}
            onChange={e => handleCCInputChange(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => {
              setTimeout(() => setShowDropdown(false), 200);
            }}
            placeholder="Código o nombre..."
            required
            autoComplete="off"
          />

          {showDropdown && searchTerm.trim().length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-[var(--color-border)] rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-[var(--color-border)] transition-all">
              {filteredCC.length > 0 ? (
                filteredCC.map(c => (
                  <Button
                    variant="custom"
                    key={c.code}
                    type="button"
                    onClick={() => handleCCSelect(c.code, c.label)}
                    className="w-full !justify-start px-4 py-3 bg-white dark:bg-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-700 flex flex-row items-center gap-2 transition-colors"
                  >
                    <Text as="span" className="font-mono font-bold text-sm text-[var(--color-primary)] whitespace-nowrap">{c.code}</Text>
                    <Text as="span" className="text-xs text-slate-500 dark:text-slate-400 truncate">- {c.label}</Text>
                  </Button>
                ))
              ) : (
                <div className="px-4 py-3 text-xs text-red-500 font-medium">
                  Ninguna combinación válida
                </div>
              )}
            </div>
          )}

          {selectedBreakdown && (
            <div className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <Text as="span" className="text-emerald-600 dark:text-emerald-400 font-bold text-xs select-none">✓</Text>
              <div>
                <Text as="span" className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">Válido</Text>
              </div>
            </div>
          )}

          {searchTerm && !selectedBreakdown && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <Text as="span" className="text-red-600 dark:text-red-400 font-bold text-xs select-none">⚠</Text>
              <div>
                <Text as="span" className="text-xs font-bold text-red-800 dark:text-red-300 block">Inválido</Text>
              </div>
            </div>
          )}
        </div>
        
        <div className="col-span-1">
          <Select
            label="Área"
            name="area_id"
            value={form.area_id ? String(form.area_id) : ''}
            onChange={e => update('area_id', e.target.value ? Number(e.target.value) : null)}
            icon={Layers}
            options={areaOptions}
            required
          />
        </div>

        <div className="md:col-span-2">
          <AutocompleteObjectField
            label="Cargo solicitado"
            name="cargo_id"
            value={form.cargo_id ? String(form.cargo_id) : ''}
            onChange={val => update('cargo_id', val ? Number(val) : null)}
            icon={Briefcase}
            options={cargoOptions}
            placeholder={loadingCargos ? 'Cargando cargos...' : 'Escribe para buscar el cargo...'}
            disabled={!form.area_id || loadingCargos}
            required
            labelHint="Si el cargo no se encuentra dentro de las opciones, por favor diríjase al área de Gestión Humana."
          />
        </div>

        <div className="md:col-span-2">
          <Select
            label="Causal de requisición"
            name="causal_requisicion"
            value={form.causal_requisicion}
            onChange={e => update('causal_requisicion', e.target.value)}
            options={CAUSALES}
            required
          />
        </div>

        <div className="md:col-span-2">
        {!form.area_id ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <Text size="sm" className="text-amber-700">
              Debe seleccionar un <strong>Área</strong> para ver los directores.
            </Text>
          </div>
        ) : directoresDelArea.length === 0 ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <Text size="sm" className="text-red-700">
              No hay directores configurados para el área seleccionada.
            </Text>
          </div>
        ) : (
            <Select
              label="Director que aprobará la requisición"
              name="aprobador_id"
              value={form.aprobador_id ? String(form.aprobador_id) : ''}
              onChange={e => update('aprobador_id', e.target.value ? Number(e.target.value) : null)}
              options={opcionesDirector}
              required
              labelHint="Este director recibirá la solicitud por correo electrónico para su aprobación."
            />
        )}
        </div>

        {form.causal_requisicion === 'OTRO' && (
          <div className="col-span-1 md:col-span-3">
            <TextAreaField
              label="Especifique la causal"
              name="otra_causal"
              value={form.otra_causal}
              onChange={e => update('otra_causal', e.target.value)}
              placeholder="Describa detalladamente el motivo de la requisición..."
              rows={2}
              isRequired
            />
          </div>
        )}
      </div>

      <TextAreaField
        label="Perfil O"
        name="perfil_requerido"
        value={form.perfil_requerido}
        onChange={e => update('perfil_requerido', e.target.value)}
        placeholder=""
        rows={5}
        isRequired={false}
      />

      <ModalSimuladorCentroCosto
        isOpen={isSimuladorOpen}
        onClose={() => setIsSimuladorOpen(false)}
        uens={uens}
        subcentros={subcentros}
        especialidades={especialidades}
        onSelect={(codigo, label) => {
          handleCCSelect(codigo, label);
          setIsSimuladorOpen(false);
        }}
      />
    </div>
  );
};

export default SeccionAreaCargo;
