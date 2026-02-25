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
    const isAdminRole = ['analyst', 'admin', 'director', 'admin_sistemas'].includes(userRole);

    // 1. Nueva validación por módulo (RBAC Dinámico)
    // Dashboard y Torre de Control siempre permitidos para roles administrativos para evitar bloqueos por sincronización.
    if ((moduleCode === 'dashboard' || moduleCode === 'control-tower') && isAdminRole) {
        return <>{children}</>;
    }
    // Solo bloqueamos si el arreglo de permisos EXISTE y el módulo NO está permitido.
    if (moduleCode && user.permissions && !user.permissions.includes(moduleCode)) {
        // Si el rol es estrictamente de usuario o manager, siempre va al portal
        if (userRole === 'user' || userRole === 'usuario' || userRole === 'manager') {
            // Evitar redirección infinita si ya estamos navegando dentro del portal
            if (location.pathname.startsWith('/service-portal')) {
                return <>{children}</>;
            }
            return <Navigate to="/service-portal/inicio" replace />;
        }

        // Si es un admin/analista/director:
        // Evitamos bucles si ya estamos en la raíz o si falla el propio dashboard
        if (location.pathname === '/' || moduleCode === 'dashboard') {
            // Como último recurso, si un administrativo no tiene dashboard,
            // le permitimos ver el portal de servicios en lugar de bloquearlo.
            return <Navigate to="/service-portal/inicio" replace />;
        }

        // Si falla otro módulo (ej: chat), devolver al inicio administrativo.
        return <Navigate to="/" replace />;
    }

    // 2. Validación por roles (Compatibilidad hacia atrás)
    if (allowedRoles && !allowedRoles.map(r => r.toLowerCase()).includes(userRole)) {
        // Si tiene un rol no permitido, redirigir según su rol
        if (isAdminRole) {
            return <Navigate to="/" replace />;
        } else {
            return <Navigate to="/service-portal" replace />;
        }
    }

    return <>{children}</>;
};

export default ProtectedRoute;
