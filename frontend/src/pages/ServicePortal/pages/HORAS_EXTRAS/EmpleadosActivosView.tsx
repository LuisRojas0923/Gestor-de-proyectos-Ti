import React from 'react';
import { Navigate } from 'react-router-dom';

const EmpleadosActivosView: React.FC = () => {
  return <Navigate to="/service-portal/horas-extras/planificador?panel=empleados" replace />;
};

export default EmpleadosActivosView;
