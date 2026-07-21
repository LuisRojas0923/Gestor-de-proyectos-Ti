import { Text } from '../../../../components/atoms';
import type { DataTableColumn } from '../../../../components/molecules/DataTable';
import type { CalculoPlanilla } from '../../../../types/horasExtrasPlanilla';


const moneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

const numero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

export const formatPlanillaDate = (fecha: string) => {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return `${dia}/${String(mes).padStart(2, '0')}/${anio}`;
};

const texto = (valor: string | null) => valor?.trim() || 'No disponible';

export const CALCULO_PLANILLA_ACCESSORS = {
  cedula: (fila: CalculoPlanilla) => fila.cedula,
  empleado: (fila: CalculoPlanilla) => texto(fila.empleado),
  salario: (fila: CalculoPlanilla) => moneda.format(fila.salario),
  base_hora: (fila: CalculoPlanilla) => moneda.format(fila.base_hora),
  aplica_he: (fila: CalculoPlanilla) => fila.aplica_he ? 'SI' : 'NO',
  empresa: (fila: CalculoPlanilla) => texto(fila.empresa),
  sucursal: (fila: CalculoPlanilla) => texto(fila.sucursal),
  fecha: (fila: CalculoPlanilla) => formatPlanillaDate(fila.fecha),
  ot_cc: (fila: CalculoPlanilla) => texto(fila.ot_cc),
  sub_subc: (fila: CalculoPlanilla) => texto(fila.sub_subc),
  especialidad_ot: (fila: CalculoPlanilla) => texto(fila.especialidad_ot),
  cantidad: (fila: CalculoPlanilla) => numero.format(fila.cantidad),
  ubicacion: (fila: CalculoPlanilla) => fila.ubicacion,
  novedad: (fila: CalculoPlanilla) => fila.novedad,
  cantidad_horas: (fila: CalculoPlanilla) => numero.format(fila.cantidad_horas),
  observaciones: (fila: CalculoPlanilla) => texto(fila.observaciones),
  responsable: (fila: CalculoPlanilla) => texto(fila.responsable),
  encargados: (fila: CalculoPlanilla) => texto(fila.encargados),
  cliente: (fila: CalculoPlanilla) => texto(fila.cliente),
};

const celda = (valor: string, secundaria = false) => (
  <Text
    variant="caption"
    color={secundaria ? 'text-secondary' : 'text-primary'}
    className="whitespace-nowrap"
  >
    {valor}
  </Text>
);

export const CALCULO_PLANILLA_COLUMNS: DataTableColumn<CalculoPlanilla>[] = [
  { key: 'cedula', label: 'CÉDULA', minWidth: '120px', filterable: true, render: (fila) => celda(fila.cedula) },
  { key: 'empleado', label: 'EMPLEADO', minWidth: '250px', filterable: true, render: (fila) => celda(texto(fila.empleado), !fila.empleado) },
  { key: 'salario', label: 'SALARIO', minWidth: '135px', filterable: true, render: (fila) => celda(moneda.format(fila.salario)) },
  { key: 'base_hora', label: 'BASE HORA', minWidth: '120px', filterable: true, render: (fila) => celda(moneda.format(fila.base_hora)) },
  { key: 'aplica_he', label: 'APLICA HE', minWidth: '105px', centered: true, filterable: true, render: (fila) => celda(fila.aplica_he ? 'SI' : 'NO') },
  { key: 'empresa', label: 'EMPRESA', minWidth: '190px', filterable: true, render: (fila) => celda(texto(fila.empresa), !fila.empresa) },
  { key: 'sucursal', label: 'SUCURSAL', minWidth: '130px', filterable: true, render: (fila) => celda(texto(fila.sucursal), !fila.sucursal) },
  { key: 'fecha', label: 'FECHA', minWidth: '110px', filterable: true, render: (fila) => celda(formatPlanillaDate(fila.fecha)) },
  { key: 'ot_cc', label: 'OT / CC', minWidth: '110px', filterable: true, render: (fila) => celda(texto(fila.ot_cc), !fila.ot_cc) },
  { key: 'sub_subc', label: 'SUB. / SUBC.', minWidth: '120px', filterable: true, render: (fila) => celda(texto(fila.sub_subc), !fila.sub_subc) },
  { key: 'especialidad_ot', label: 'ESPECIALIDAD OT', minWidth: '190px', filterable: true, render: (fila) => celda(texto(fila.especialidad_ot), !fila.especialidad_ot) },
  { key: 'cantidad', label: 'CANTIDAD', minWidth: '100px', centered: true, filterable: true, render: (fila) => celda(numero.format(fila.cantidad)) },
  { key: 'ubicacion', label: 'UBICACIÓN', minWidth: '110px', centered: true, filterable: true, render: (fila) => celda(fila.ubicacion) },
  { key: 'novedad', label: 'NOVEDAD', minWidth: '120px', filterable: true, render: (fila) => celda(fila.novedad) },
  { key: 'cantidad_horas', label: 'CANT. HORAS', minWidth: '120px', centered: true, filterable: true, render: (fila) => celda(numero.format(fila.cantidad_horas)) },
  { key: 'observaciones', label: 'OBSERVACIONES', minWidth: '220px', filterable: true, render: (fila) => celda(texto(fila.observaciones), !fila.observaciones) },
  { key: 'responsable', label: 'RESPONSABLE', minWidth: '180px', filterable: true, render: (fila) => celda(texto(fila.responsable), !fila.responsable) },
  { key: 'encargados', label: 'ENCARGADOS', minWidth: '160px', filterable: true, render: (fila) => celda(texto(fila.encargados), !fila.encargados) },
  { key: 'cliente', label: 'CLIENTE', minWidth: '160px', filterable: true, render: (fila) => celda(texto(fila.cliente), !fila.cliente) },
];
