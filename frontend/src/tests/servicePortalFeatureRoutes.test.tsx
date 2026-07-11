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
  });
});
