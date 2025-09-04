import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';

const Indicators: React.FC = () => {
  const { t } = useTranslation();
  const { state } = useAppContext();
  const { darkMode } = state;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
          Indicadores de Gestión (KPIs)
        </h1>
      </div>
      <div className={`${
        darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
      } border rounded-xl p-6`}>
        <p className={`${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
          Este panel mostrará los 6 indicadores clave de rendimiento que definimos.
          Podrás ver gráficos, aplicar filtros por proveedor y rango de fechas, y ver el estado de cada indicador con un sistema de semáforos (verde, amarillo, rojo).
        </p>
      </div>
    </div>
  );
};

export default Indicators;
