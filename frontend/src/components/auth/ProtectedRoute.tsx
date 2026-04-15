import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
    moduleCode?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles, moduleCode }) => {
    const { state } = useAppContext();
    const { user } = state;
    const location = useLocation();

    if (!user) {
        // Redirigir al login si no hay usuario
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Normalizar rol del usuario de forma segura
    const userRole = (user.role || '').trim().toLowerCase();
    const isAdminRole = ['analyst', 'admin', 'director', 'admin_sistemas', 'admin_mejoramiento'].includes(userRole);

    // 1. Validación por módulo (RBAC Dinámico)
    // El Dashboard administrativo y la Torre de Control están permitidos para roles administrativos.
    if ((moduleCode === 'dashboard' || moduleCode === 'control-tower') && isAdminRole) {
        return <>{children}</>;
    }

    // Validación estricta de permisos si se requiere un moduleCode
    if (moduleCode && user.permissions) {
        // Módulos que son accesibles para todos los usuarios autenticados (manejan su propia lógica interna de permisos)
        const isGeneralAccessModule = ['contabilidad', 'viaticos_gestion', 'viaticos_reportes', 'viaticos_estado'].includes(moduleCode);
        const hasBypass = isGeneralAccessModule || (user.viaticante === true && ['viaticos_gestion', 'viaticos_reportes', 'viaticos_estado'].includes(moduleCode));

        if (!user.permissions.includes(moduleCode) && !hasBypass) {
            // Si el usuario NO tiene permiso para este módulo y NO aplica la excepción de viaticante:

            // Caso 1: Usuario estándar intentando entrar a ruta administrativa -> Redirigir al inicio del Portal
            if (userRole === 'user' || userRole === 'usuario' || userRole === 'manager') {
                if (location.pathname.startsWith('/service-portal/inicio')) {
                    // Si ya está en el inicio del portal y NO tiene permiso ni para el portal (caso crítico), redirigir al login
                    return <Navigate to="/login" replace />;
                }
                return <Navigate to="/service-portal/inicio" replace />;
            }

            // Caso 2: Administrativo intentando entrar a módulo restringido -> Redirigir a su Dashboard
            if (isAdminRole) {
                // Si falla el propio dashboard o está en la raíz, enviarlo al portal como último recurso
                if (location.pathname === '/' || moduleCode === 'dashboard') {
                    return <Navigate to="/service-portal/inicio" replace />;
                }
                return <Navigate to="/" replace />;
            }

            // Caso 3: Fallback general -> Login
            return <Navigate to="/login" replace />;
        }
    }

    // 2. Validación por roles (Compatibilidad hacia atrás / Rutas sin moduleCode)
    if (allowedRoles && !allowedRoles.map(r => r.toLowerCase()).includes(userRole)) {
        if (isAdminRole) {
            return <Navigate to="/" replace />;
        } else {
            return <Navigate to="/service-portal/inicio" replace />;
        }
    }

    return <>{children}</>;
};

export default ProtectedRoute;
