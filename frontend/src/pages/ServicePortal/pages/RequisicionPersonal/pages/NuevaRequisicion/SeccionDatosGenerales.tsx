import React, { useEffect, useState, useCallback } from 'react';
import { MapPin, Briefcase, User, Hash, Calendar, HardHat } from 'lucide-react';
import { Button, Input, Select, Text } from '../../../../../../components/atoms';
import { FormField } from '../../../Common';
import type { FormularioRP } from '../../types/requisicion.types';
import { DIVIPOLA } from '../../constants/divipola';
import { validarOT, buscarOTs } from '../../services/requisicionService';

interface Props {
  form: FormularioRP;
  update: <K extends keyof FormularioRP>(k: K, v: FormularioRP[K]) => void;
  correoSolicitante: string;
  nombreSolicitante: string;
  setBloquearEnvio?: (bloquear: boolean) => void;
}

const AutocompleteField = ({
  label, name, value, onChange, options, placeholder, icon, disabled = false, required = false
}: {
  label: string, name: string, value: string, onChange: (val: string) => void, options: string[], placeholder: string, icon: any, disabled?: boolean, required?: boolean
}) => {
  const [searchTerm, setSearchTerm] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  const filtered = options
    .filter(o => o.toLowerCase().includes(searchTerm.toLowerCase()))
    .slice(0, 50);

  const handleSelect = (option: string) => {
    setSearchTerm(option);
    setShowDropdown(false);
    onChange(option);
  };

  const handleInputChange = (val: string) => {
    const uppercased = val.toUpperCase();
    setSearchTerm(uppercased);
    setShowDropdown(true);
    onChange(uppercased);
  };

  return (
    <div className="relative flex-1">
      <Input
        label={label}
        name={name}
        value={searchTerm}
        onChange={e => handleInputChange(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        icon={icon}
        autoComplete="off"
      />
      {showDropdown && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-[var(--color-border)] rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-[var(--color-border)] transition-all">
          {filtered.length > 0 ? (
            filtered.map(o => (
              <Button
                variant="custom"
                key={o}
                type="button"
                onClick={() => handleSelect(o)}
                className="w-full !justify-start px-4 py-3 bg-white dark:bg-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-700 transition-colors rounded-none"
              >
                <Text as="span" className="font-bold text-sm text-[var(--color-text-primary)]">{o}</Text>
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

const AsyncOTAutocompleteField = ({
  label, name, value, onChange, placeholder, icon, disabled = false, required = false,
  onValidateOT, setOtError, validatingOt, otError
}: {
  label: string, name: string, value: string, onChange: (val: string) => void, placeholder: string, icon: any, disabled?: boolean, required?: boolean,
  onValidateOT: (val: string) => void, setOtError: (err: string | null) => void, validatingOt: boolean, otError: string | null
}) => {
  const [searchTerm, setSearchTerm] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setSearchTerm(value);
  }

  useEffect(() => {
    if (!showDropdown) return;
    if (searchTerm === 'N/A') {
      const immediateTimer = setTimeout(() => setOptions(['N/A']), 0);
      return () => clearTimeout(immediateTimer);
    }
    
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await buscarOTs(searchTerm);
        const ots = results.map((r: any) => r.orden).filter(Boolean);
        setOptions(['N/A', ...ots.filter((o: string) => o !== 'N/A')]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchTerm, showDropdown]);

  const handleSelect = (option: string) => {
    setSearchTerm(option);
    setShowDropdown(false);
    onChange(option);
    onValidateOT(option);
  };

  const handleInputChange = (val: string) => {
    const uppercased = val.toUpperCase();
    setSearchTerm(uppercased);
    setShowDropdown(true);
    onChange(uppercased);
  };

  return (
    <div className="relative flex-1">
      <Input
        label={label}
        name={name}
        value={searchTerm}
        onChange={(e: any) => { handleInputChange(e.target.value); setOtError(null); }}
        onFocus={() => {
          setShowDropdown(true);
          if (!options.length && searchTerm.trim() === '') setOptions(['N/A']);
        }}
        onBlur={() => {
          setTimeout(() => {
             setShowDropdown(false);
             onValidateOT(searchTerm);
          }, 200);
        }}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        icon={icon}
        autoComplete="off"
      />
      {otError && (
        <div className="mt-2 p-2.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-700 dark:text-red-400 font-semibold flex items-start gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <Text as="span" color="inherit" className="text-red-600 dark:text-red-400 font-bold select-none">⚠</Text>
          <Text as="span" color="inherit">{otError}</Text>
        </div>
      )}
      {validatingOt && (
        <div className="mt-1.5 text-[11px] text-slate-500 font-medium animate-pulse">
          Validando OT en el ERP...
        </div>
      )}
      {showDropdown && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-[var(--color-border)] rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-[var(--color-border)] transition-all">
          {loading && options.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-500 font-medium text-center">Buscando OTs...</div>
          ) : options.length > 0 ? (
            options.map(o => (
              <Button
                variant="custom"
                key={o}
                type="button"
                onClick={() => handleSelect(o)}
                className="w-full !justify-start px-4 py-3 bg-white dark:bg-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-700 transition-colors rounded-none"
              >
                <Text as="span" className={`text-sm ${o === 'N/A' ? 'text-blue-600 font-bold' : 'text-[var(--color-text-primary)] font-medium'}`}>{o}</Text>
              </Button>
            ))
          ) : (
            <div className="px-4 py-3 text-xs text-red-500 font-medium text-center">No se encontraron OTs</div>
          )}
        </div>
      )}
    </div>
  );
};

const RadioCheckGroup = ({
  label, name, value, onChange, options, required, labelHint
}: {
  label: string;
  name: string;
  value: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[];
  required?: boolean;
  labelHint?: string;
}) => {
  return (
    <div className="flex flex-col gap-1.5 h-full justify-start">
      <Text as="label" color="inherit" className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-1">
        {label}
        {required && <Text as="span" color="inherit" className="text-red-500">*</Text>}
        {labelHint && <Text as="span" color="inherit" className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1 truncate" title={labelHint}>{labelHint}</Text>}
      </Text>
      <div className="flex flex-wrap gap-4 mt-2">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <Text as="label" color="inherit"
              key={opt.value}
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => onChange(opt.value)}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                isSelected 
                  ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' 
                  : 'bg-white border-slate-300 dark:border-slate-600 group-hover:border-[var(--color-primary)]'
              }`}>
                {isSelected && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <Text as="span" color="inherit" className={`text-sm font-medium transition-colors ${isSelected ? 'text-[var(--color-text-primary)]' : 'text-slate-600 dark:text-slate-400 group-hover:text-[var(--color-text-primary)]'}`}>
                {opt.label}
              </Text>
            </Text>
          );
        })}
      </div>
    </div>
  );
};

export const SeccionDatosGenerales: React.FC<Props> = ({ form, update, correoSolicitante, nombreSolicitante, setBloquearEnvio }) => {
  const [validatingOt, setValidatingOt] = useState(false);
  const [otError, setOtError] = useState<string | null>(null);

  const realizarValidacionOT = useCallback(async (otValor: string) => {
    if (!otValor || otValor.trim() === '' || otValor.trim().toUpperCase() === 'N/A') {
      setOtError(null);
      if (setBloquearEnvio) setBloquearEnvio(false);
      return;
    }

    setValidatingOt(true);
    setOtError(null);
    try {
      const res = await validarOT(otValor);
      if (res.encontrado) {
        if (res.terminada) {
          setOtError(`La orden de trabajo "${otValor}" está TERMINADA en el ERP. No se puede continuar.`);
          if (setBloquearEnvio) setBloquearEnvio(true);
        } else {
          setOtError(null);
          if (setBloquearEnvio) setBloquearEnvio(false);
          if (res.cliente) {
            update('nombre_obra_proyecto', res.cliente.toUpperCase());
          }
        }
      } else {
        setOtError(null);
        if (setBloquearEnvio) setBloquearEnvio(false);
      }
    } catch (err) {
      console.error('Error validando OT:', err);
      setOtError(null);
      if (setBloquearEnvio) setBloquearEnvio(false);
    } finally {
      setValidatingOt(false);
    }
  }, [setBloquearEnvio, update]);

  useEffect(() => {
    if (form.ot) {
      realizarValidacionOT(form.ot);
    }
  }, [form.ot, realizarValidacionOT]);

  const departamentoOptions = Object.keys(DIVIPOLA);
  const municipioOptions = form.departamento ? DIVIPOLA[form.departamento] || [] : [];
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
        
        {/* ROW 1 */}
        <div className="col-span-1">
          <FormField label="Nombre del solicitante" name="nombre_solicitante" defaultValue={nombreSolicitante} readOnly icon={User} />
        </div>
        <div className="col-span-1">
          <FormField label="Correo del solicitante" name="correo_solicitante" defaultValue={correoSolicitante} readOnly icon={User} />
        </div>
        <div className="col-span-1">
          <AutocompleteField
            label="Departamento"
            name="departamento"
            value={form.departamento}
            onChange={val => {
              update('departamento', val);
              update('municipio', '');
            }}
            icon={MapPin}
            options={departamentoOptions}
            placeholder="Escribe el departamento..."
            required
          />
        </div>
        <div className="col-span-1">
          <AutocompleteField
            label="Municipio"
            name="municipio"
            value={form.municipio}
            onChange={val => update('municipio', val)}
            options={municipioOptions}
            placeholder="Escribe el municipio..."
            icon={MapPin}
            disabled={!form.departamento || !DIVIPOLA[form.departamento]}
            required
          />
        </div>

        {/* ROW 2 */}
        <div className="col-span-1">
          <AsyncOTAutocompleteField
            label="OT (Orden de Trabajo)"
            name="ot"
            value={form.ot}
            onChange={val => {
              update('ot', val);
              setOtError(null);
              if (setBloquearEnvio) setBloquearEnvio(false);
            }}
            onValidateOT={realizarValidacionOT}
            setOtError={setOtError}
            validatingOt={validatingOt}
            otError={otError}
            icon={Hash}
            placeholder="Escribe para buscar..."
            required={true}
          />
        </div>

        <div className="col-span-1">
          <FormField
            label="Nombre obra / proyecto"
            name="nombre_obra_proyecto"
            value={form.nombre_obra_proyecto}
            onChange={e => update('nombre_obra_proyecto', e.target.value)}
            icon={Briefcase}
            isRequired={true}
          />
        </div>

        <div className="col-span-1">
          <FormField
            label="Dirección de obra o proyecto"
            name="direccion_obra_proyecto"
            value={form.direccion_obra_proyecto}
            onChange={e => update('direccion_obra_proyecto', e.target.value)}
            icon={MapPin}
            isRequired={true}
          />
        </div>

        <div className="col-span-1">
          <FormField
            label="Encargado en sitio"
            name="encargado_sitio"
            value={form.encargado_sitio}
            onChange={e => update('encargado_sitio', e.target.value)}
            icon={HardHat}
            isRequired={true}
          />
        </div>

        {/* ROW 3 */}
        <div className="col-span-1">
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
            isRequired={true}
          />
        </div>

        <div className="col-span-1">
          <RadioCheckGroup
            label="TSA"
            name="tsa"
            value={form.tsa}
            onChange={val => update('tsa', val)}
            options={[
              { value: 'APLICA', label: 'APLICA' },
              { value: 'NO APLICA', label: 'NO APLICA' },
            ]}
            required
            labelHint="Trabajo Seguro en Alturas"
          />
        </div>

        <div className="col-span-1">
          <RadioCheckGroup
            label="Duración"
            name="duracion_obra_contrato"
            value={form.duracion_obra_contrato}
            onChange={val => update('duracion_obra_contrato', val)}
            options={[
              { value: '2 MESES', label: '2 MESES' },
              { value: 'MÁS DE 2 MESES', label: 'MÁS DE 2 MESES' },
            ]}
            required
          />
        </div>

        <div className="col-span-1">
          <FormField
            label="Fecha de ingreso"
            name="fecha_probable_ingreso"
            type="date"
            value={form.fecha_probable_ingreso}
            onChange={e => update('fecha_probable_ingreso', e.target.value)}
            min={today}
            icon={Calendar}
            isRequired={true}
          />
        </div>
      </div>
    </div>
  );
};

export default SeccionDatosGenerales;
