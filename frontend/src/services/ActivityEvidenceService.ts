import { API_CONFIG, API_ENDPOINTS } from '../config/api';
import { AuthService } from './AuthService';


const INTERNAL_EVIDENCE_PATTERN = /^actividades\/(\d+)\/([0-9a-f]{32})_(.+)$/;

export function isInternalActivityEvidence(archivoUrl: string): boolean {
    return INTERNAL_EVIDENCE_PATTERN.test(archivoUrl);
}

export function getActivityEvidenceName(archivoUrl: string): string {
    const match = archivoUrl.match(INTERNAL_EVIDENCE_PATTERN);
    return match?.[3] || archivoUrl;
}

export function isSafeExternalEvidenceUrl(archivoUrl: string): boolean {
    try {
        const url = new URL(archivoUrl);
        return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
        return false;
    }
}

async function fetchEvidence(actividadId: number, retried = false): Promise<Response> {
    const token = localStorage.getItem('token');
    const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_ENDPOINTS.WBS_ACTIVITY_EVIDENCE(actividadId)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (response.status === 401 && !retried) {
        const refreshed = await AuthService.refreshAccessToken();
        if (refreshed) return fetchEvidence(actividadId, true);
    }
    return response;
}

function extractFilename(response: Response): string {
    const disposition = response.headers.get('content-disposition') || '';
    const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    if (encoded) return decodeURIComponent(encoded);
    return disposition.match(/filename="?([^";]+)"?/i)?.[1] || 'evidencia';
}

export async function downloadActivityEvidence(actividadId: number): Promise<void> {
    const response = await fetchEvidence(actividadId);
    if (!response.ok) {
        let message = 'No se pudo descargar la evidencia.';
        try {
            const body = await response.json();
            if (typeof body?.detail === 'string') message = body.detail;
        } catch {
            // La respuesta puede no ser JSON.
        }
        throw new Error(message);
    }

    const objectUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = extractFilename(response);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
}
