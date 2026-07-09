import { useEffect, useState } from 'react';
import { obtenerEmpleadoERP } from '../../../../../services/horasExtrasService';
import type { EmpleadoERPDetalle, NivelRiesgoARL } from '../../../../../types/horasExtras';

export function useEmpleadoERP(cedula: string) {
  const [empleadoERP, setEmpleadoERP] = useState<EmpleadoERPDetalle | null>(null);
  const [salario, setSalario] = useState<number | null>(null);
  const [nivel, setNivel] = useState<NivelRiesgoARL>('III');
  const [cargandoEmpleado, setCargandoEmpleado] = useState(false);
  const [errorEmpleado, setErrorEmpleado] = useState<string | null>(null);

  useEffect(() => {
    const cedulaLimpia = cedula.trim();
    if (!cedulaLimpia || cedulaLimpia.length < 5) {
      setEmpleadoERP(null);
      setSalario(null);
      setNivel('III');
      setCargandoEmpleado(false);
      setErrorEmpleado(null);
      return;
    }

    let cancel = false;
    const timer = window.setTimeout(async () => {
      setCargandoEmpleado(true);
      try {
        const empleado = await obtenerEmpleadoERP(cedulaLimpia, localStorage.getItem('token') || '');
        if (cancel) return;
        setEmpleadoERP(empleado);
        setNivel(empleado.nivel_riesgo_arl || 'I');
        if (!empleado.salario_base_mensual || empleado.salario_base_mensual <= 0) {
          setSalario(null);
          setErrorEmpleado('El empleado no tiene salario base mensual vigente en ERP');
          return;
        }
        setSalario(empleado.salario_base_mensual);
        setErrorEmpleado(null);
      } catch (e: unknown) {
        if (cancel) return;
        setEmpleadoERP(null);
        setSalario(null);
        setErrorEmpleado(e instanceof Error ? e.message : 'No se pudo consultar el empleado en ERP');
      } finally {
        if (!cancel) setCargandoEmpleado(false);
      }
    }, 400);

    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [cedula]);

  return { empleadoERP, salario, nivel, cargandoEmpleado, errorEmpleado };
}
