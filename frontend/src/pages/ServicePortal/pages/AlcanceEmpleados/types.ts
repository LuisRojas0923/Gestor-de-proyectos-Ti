export type { EmpleadoErpAlcance, FiltrosEmpleadosErp, GestorAlcance, PaginaEmpleadosErp } from '../../../../types/horariosRelaciones';

export interface CambiosRelacion {
  altas: Set<string>;
  bajas: Set<string>;
}
