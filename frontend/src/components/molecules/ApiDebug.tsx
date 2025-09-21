import React, { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';

const ApiDebug: React.FC = () => {
  const api = useApi();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testApi = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Testing API call to /stages/cycle-flow');
      const result = await api.get('/stages/cycle-flow');
      console.log('API result:', result);
      setData(result);
    } catch (err) {
      console.error('API error:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testApi();
  }, []);

  return (
    <div className="p-6 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-bold mb-4">Debug API - /stages/cycle-flow</h3>
      
      <div className="mb-4">
        <button 
          onClick={testApi}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Cargando...' : 'Probar API'}
        </button>
      </div>

      {loading && (
        <div className="text-blue-600">Cargando datos...</div>
      )}

      {error && (
        <div className="text-red-600 mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {data && (
        <div>
          <div className="text-green-600 mb-2">
            <strong>✅ Datos cargados exitosamente</strong>
          </div>
          <div className="text-sm text-gray-600 mb-2">
            Cantidad de etapas: {Array.isArray(data) ? data.length : 'No es array'}
          </div>
          <details className="text-xs">
            <summary className="cursor-pointer text-blue-600">Ver datos completos</summary>
            <pre className="mt-2 p-2 bg-white rounded border overflow-auto max-h-96">
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default ApiDebug;
