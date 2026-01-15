import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const { state } = useAppContext();
    const { user } = state;
    const location = useLocation();

    if (!user) {
        // Redirigir al login si no hay usuario
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Si tiene un rol no permitido, redirigir según su rol
        if (user.role === 'analyst') {
            return <Navigate to="/" replace />;
        } else {
            return <Navigate to="/service-portal" replace />;
        }
    }

    return <>{children}</>;
};

export default ProtectedRoute;
