import { Text } from '../../../../../components/atoms';

interface EmpleadoDatosProps { etiqueta: string; valor: string | null; mono?: boolean }

const EmpleadoDatos = ({ etiqueta, valor, mono = false }: EmpleadoDatosProps) => (
  <Text as="span" className="block truncate text-xs">
    <Text as="span" className="font-semibold text-[var(--color-text-secondary)]">{etiqueta}: </Text>
    <Text as="span" className={mono ? 'font-mono' : ''}>{valor || 'No disponible'}</Text>
  </Text>
);

export default EmpleadoDatos;
