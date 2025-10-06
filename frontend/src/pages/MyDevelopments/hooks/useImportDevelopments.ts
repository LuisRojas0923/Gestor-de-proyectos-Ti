import { useNotifications } from '../../../components/notifications/NotificationsContext';
import { API_CONFIG, API_ENDPOINTS } from '../../../config/api';
import { DevelopmentWithCurrentStatus } from '../../../types';

type PartialDev = Partial<DevelopmentWithCurrentStatus>;

function isValidRemedyId(id: string): boolean {
  return /^INC\d+$/.test(id);
}

function looksLikeTimestampId(id: string): boolean {
  return /^\d{1,2}\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\.?\s+\d{4}\s+\d{1,2}:\d{2}$/i.test(id);
}

function mapRow(item: PartialDev) {
  const estimated = (item as any).estimated_end_date as string | undefined;
  return {
    id: item.id!,
    name: item.name ?? 'N/A',
    description: item.description ?? '',
    module: item.module ?? '',
    type: (item as any).type ?? 'Desarrollo',
    environment: (item as any).environment ?? '',
    remedy_link: (item as any).remedy_link ?? '',
    provider: item.provider ?? 'N/A',
    responsible: (item as any).responsible ?? 'N/A',
    general_status: item.general_status ?? 'Pendiente',
    estimated_end_date: estimated ? new Date(estimated).toISOString().split('T')[0] : null,
    current_phase_id: null,
    current_stage_id: null,
    stage_progress_percentage: 0,
  };
}

export function useImportDevelopments() {
  const { addNotification } = useNotifications();
  const importDevelopments = async (importedData: PartialDev[]): Promise<boolean> => {
    const validData = importedData
      .filter(item => {
        if (!item.id) return false;
        const idStr = String(item.id);
        if (looksLikeTimestampId(idStr)) return false;
        if (!isValidRemedyId(idStr)) return false;
        return true;
      })
      .map(mapRow);

    if (validData.length === 0) {
      addNotification('error', 'No se encontraron datos válidos para importar.');
      return false;
    }

    try {
      const url = `${API_CONFIG.BASE_URL.replace('/api/v1', '/api')}${API_ENDPOINTS.LEGACY_DEVELOPMENTS_BULK}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Error desconocido' }));
        addNotification('error', `Error al importar: ${errorData.detail ?? 'Error desconocido'}`);
        return false;
      }

      const result = await response.json();
      const summary = result?.data?.summary;
      if (summary) {
        const parts: string[] = [];
        if (summary.created > 0) parts.push(`${summary.created} creado(s)`);
        if (summary.updated > 0) parts.push(`${summary.updated} actualizado(s)`);
        if (summary.skipped > 0) parts.push(`${summary.skipped} sin cambios`);
        addNotification('success', `Importación completada: ${parts.join(', ')}`);
      } else {
        addNotification('success', 'Importación completada');
      }
      return true;
    } catch (err) {
      addNotification('error', 'Error de conexión al importar. Verifica el backend.');
      return false;
    }
  };

  return { importDevelopments };
}


