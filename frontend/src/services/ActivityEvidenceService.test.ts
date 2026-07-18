import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    downloadActivityEvidence,
    getActivityEvidenceName,
    isInternalActivityEvidence,
    isSafeExternalEvidenceUrl,
} from './ActivityEvidenceService';


describe('ActivityEvidenceService', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('distingue archivos internos de URLs legadas seguras', () => {
        const internal = `actividades/42/${'a'.repeat(32)}_informe final.pdf`;
        expect(isInternalActivityEvidence(internal)).toBe(true);
        expect(getActivityEvidenceName(internal)).toBe('informe final.pdf');
        expect(isSafeExternalEvidenceUrl('https://sharepoint.example/informe')).toBe(true);
        expect(isSafeExternalEvidenceUrl('javascript:alert(1)')).toBe(false);
    });

    it('descarga el archivo interno enviando el bearer token', async () => {
        localStorage.setItem('token', 'token-prueba');
        const click = vi.fn();
        vi.spyOn(document, 'createElement').mockReturnValue({
            click,
            remove: vi.fn(),
            set href(_value: string) {},
            set download(_value: string) {},
        } as unknown as HTMLAnchorElement);
        vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
        vi.stubGlobal('URL', {
            createObjectURL: vi.fn(() => 'blob:evidencia'),
            revokeObjectURL: vi.fn(),
        });
        const fetchMock = vi.fn().mockResolvedValue(new Response('contenido', {
            status: 200,
            headers: { 'content-disposition': 'attachment; filename="informe.pdf"' },
        }));
        vi.stubGlobal('fetch', fetchMock);

        await downloadActivityEvidence(42);

        expect(fetchMock).toHaveBeenCalledWith(
            '/api/v2/actividades/42/archivo',
            { headers: { Authorization: 'Bearer token-prueba' } }
        );
        expect(click).toHaveBeenCalledOnce();
    });
});
