import React, { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { Button, Title, Text, MaterialCard } from '../atoms';

const ApiDebug: React.FC = () => {
  const api = useApi();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testApi = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Testing API call to /etapas/flujo-ciclo');
      const result = await api.get('/etapas/flujo-ciclo');
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
    <MaterialCard className="p-6">
      <Title variant="h5" className="mb-4">Debug API - /etapas/flujo-ciclo</Title>

      <div className="mb-4">
        <Button
          onClick={testApi}
          loading={loading}
          variant="primary"
        >
          Probar API
        </Button>
      </div>

      {loading && (
        <Text color="primary" className="mb-4">Cargando datos...</Text>
      )}

      {error && (
        <div className="mb-4">
          <Text color="error" weight="bold">Error:</Text>
          <Text color="error"> {error}</Text>
        </div>
      )}

      {data && (
        <div>
          <div className="mb-2">
            <Text color="success" weight="bold">✅ Datos cargados exitosamente</Text>
          </div>
          <Text variant="caption" color="secondary" className="mb-2 block">
            Cantidad de etapas: {Array.isArray(data) ? data.length : 'No es array'}
          </Text>
          <details className="text-xs">
            <summary className="cursor-pointer text-blue-600">Ver datos completos</summary>
            <pre className="mt-2 p-2 bg-[var(--color-surface-variant)] rounded border border-[var(--color-border)] overflow-auto max-h-96 dark:text-white">
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </MaterialCard>
  );
};

export default ApiDebug;
