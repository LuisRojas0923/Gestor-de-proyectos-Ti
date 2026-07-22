import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { Text } from '../components/atoms';

const mocks = vi.hoisted(() => ({
  user: null as null | { role: string; permissions?: string[] },
  isAdmin: false,
  sessionValidated: true,
  useIsAdmin: vi.fn(),
}));

vi.mock('../context/AppContext', () => ({
  useAppContext: () => ({
    state: {
      user: mocks.user,
      sessionValidated: mocks.sessionValidated,
    },
  }),
}));

vi.mock('../hooks/useIsAdmin', () => ({
  useIsAdmin: () => mocks.useIsAdmin(),
}));

function renderRoute(props: {
  allowedRoles?: string[];
  moduleCode?: string;
  permissions?: string[];
}) {
  return render(
    <MemoryRouter initialEntries={['/privada']}>
      <Routes>
        <Route
          path="/privada"
          element={(
            <ProtectedRoute {...props}>
              <Text>contenido privado</Text>
            </ProtectedRoute>
          )}
        />
        <Route path="/service-portal/inicio" element={<Text>portal</Text>} />
        <Route path="/login" element={<Text>login</Text>} />
        <Route path="/" element={<Text>dashboard</Text>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute RBAC', () => {
  beforeEach(() => {
    mocks.user = {
      role: 'usuario',
      permissions: [],
    };
    mocks.isAdmin = false;
    mocks.sessionValidated = true;
    mocks.useIsAdmin.mockReset();
    mocks.useIsAdmin.mockImplementation(() => mocks.isAdmin);
  });

  it('falla cerrado cuando permissions no viene en el usuario', () => {
    mocks.user = { role: 'usuario' };

    renderRoute({ moduleCode: 'bitacoras_operacionales.leer' });

    expect(screen.queryByText('contenido privado')).not.toBeInTheDocument();
    expect(screen.getByText('portal')).toBeInTheDocument();
  });

  it('espera la hidratacion antes de decidir permisos ausentes', () => {
    mocks.user = { role: 'usuario' };
    mocks.sessionValidated = false;

    renderRoute({ moduleCode: 'bitacoras_operacionales.leer' });

    expect(screen.getByRole('status')).toHaveTextContent('Validando permisos');
    expect(screen.queryByText('portal')).not.toBeInTheDocument();
  });

  it('espera la hidratacion antes de redirigir un token sin usuario cacheado', () => {
    mocks.user = null;
    mocks.sessionValidated = false;

    renderRoute({ allowedRoles: ['admin'] });

    expect(screen.getByRole('status')).toHaveTextContent('Validando permisos');
    expect(screen.queryByText('login')).not.toBeInTheDocument();
  });

  it('espera la hidratacion antes de validar roles legacy', () => {
    mocks.user = { role: 'admin', permissions: [] };
    mocks.sessionValidated = false;

    renderRoute({ allowedRoles: ['admin'] });

    expect(screen.getByRole('status')).toHaveTextContent('Validando permisos');
    expect(screen.queryByText('contenido privado')).not.toBeInTheDocument();
  });

  it('exige todos los permisos declarados', () => {
    mocks.user = {
      role: 'usuario',
      permissions: ['bitacoras_operacionales.leer'],
    };

    renderRoute({
      permissions: [
        'bitacoras_operacionales.leer',
        'bitacoras_operacionales.gestionar',
      ],
    });

    expect(screen.queryByText('contenido privado')).not.toBeInTheDocument();
    expect(screen.getByText('portal')).toBeInTheDocument();
  });

  it('admite la ruta cuando tiene todos los permisos exactos', () => {
    mocks.user = {
      role: 'usuario',
      permissions: [
        'bitacoras_operacionales.leer',
        'bitacoras_operacionales.gestionar',
      ],
    };

    renderRoute({
      permissions: [
        'bitacoras_operacionales.leer',
        'bitacoras_operacionales.gestionar',
      ],
    });

    expect(screen.getByText('contenido privado')).toBeInTheDocument();
  });

  it('ejecuta los hooks aunque no exista usuario', () => {
    mocks.user = null;

    renderRoute({ moduleCode: 'bitacoras_operacionales.leer' });

    expect(mocks.useIsAdmin).toHaveBeenCalledOnce();
    expect(screen.getByText('login')).toBeInTheDocument();
  });

  it('no permite que un bypass legacy omita permisos explicitos', () => {
    mocks.user = {
      role: 'usuario',
      permissions: [],
    };

    renderRoute({
      moduleCode: 'contabilidad',
      permissions: ['bitacoras_operacionales.leer'],
    });

    expect(screen.queryByText('contenido privado')).not.toBeInTheDocument();
    expect(screen.getByText('portal')).toBeInTheDocument();
  });

  it('no permite que el bypass admin omita permisos explicitos', () => {
    mocks.user = {
      role: 'admin',
      permissions: [],
    };
    mocks.isAdmin = true;

    renderRoute({
      moduleCode: 'dashboard',
      permissions: ['bitacoras_operacionales.leer'],
    });

    expect(screen.queryByText('contenido privado')).not.toBeInTheDocument();
    expect(screen.getByText('portal')).toBeInTheDocument();
  });
});
