import { describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import { createServicePortalFeatureRoutes } from '../pages/ServicePortal/routes/featureRoutes';

describe('rutas de horarios y alcance', () => {
  it('declara guardas independientes y biometría protegida', () => {
    const routes = createServicePortalFeatureRoutes() as ReactElement<{ path: string; element: ReactElement<{ moduleCode: string }> }>[];
    const permiso = (path: string) => routes.find((route) => route.props.path === path)?.props.element.props.moduleCode;
    expect(permiso('horas-extras/plantillas')).toBe('nomina_horas_extras.plantillas_horario.administrar');
    expect(permiso('alcance-empleados')).toBe('alcance_empleados.administrar');
    expect(permiso('biometria')).toBe('biometria');
    expect(routes.some((route) => route.props.path === 'tiempo-asistencia')).toBe(true);
    expect(permiso('tiempo-asistencia')).toBeUndefined();
    const alias = routes.find((route) => route.props.path === 'horas-extras');
    expect(alias?.props.element.props.to).toBe('/service-portal/tiempo-asistencia');
    expect(alias?.props.element.props.replace).toBe(true);
  });
});
