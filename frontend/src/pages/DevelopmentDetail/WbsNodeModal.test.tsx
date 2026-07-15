import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WbsNodeModal } from './WbsNodeModal';


const mocks = vi.hoisted(() => ({
    apiCall: 0,
    createActivity: vi.fn(),
    updateActivity: vi.fn(),
    uploadEvidence: vi.fn(),
}));

vi.mock('../../hooks/useApi', () => ({
    useApi: () => {
        const isActivityApi = mocks.apiCall++ % 2 === 0;
        return isActivityApi
            ? { post: mocks.createActivity, patch: mocks.updateActivity }
            : { post: mocks.uploadEvidence };
    },
}));

vi.mock('../../context/AppContext', () => ({
    useAppContext: () => ({ state: { user: { id: 'USR-1' } } }),
}));

vi.mock('../../components/assignments/AssignableUserSelect', () => ({
    AssignableUserSelect: () => null,
}));

describe('WbsNodeModal evidencias', () => {
    beforeEach(() => {
        mocks.apiCall = 0;
        mocks.createActivity.mockReset().mockResolvedValue({ id: 42 });
        mocks.updateActivity.mockReset().mockResolvedValue({ id: 42 });
        mocks.uploadEvidence.mockReset().mockRejectedValue(new Error('fallo de carga'));
    });

    it('informa el éxito parcial y reintenta sin duplicar la actividad', async () => {
        const onSaved = vi.fn();
        const onClose = vi.fn();
        render(
            <WbsNodeModal
                isOpen
                onClose={onClose}
                onSaved={onSaved}
                developmentId="DEV-1"
                darkMode={false}
            />
        );

        fireEvent.change(screen.getByPlaceholderText('Ej. Análisis de Requerimientos'), {
            target: { value: 'Tarea con evidencia' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
        fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

        const input = document.getElementById('wbs-evidence-upload') as HTMLInputElement;
        fireEvent.change(input, {
            target: {
                files: [new File(['%PDF-1.7'], 'evidencia.pdf', { type: 'application/pdf' })],
            },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Crear Tarea' }));

        expect(await screen.findByText(/La tarea se guardó, pero no fue posible adjuntar/)).toBeInTheDocument();
        expect(mocks.createActivity).toHaveBeenCalledOnce();
        expect(onSaved).toHaveBeenCalledOnce();
        expect(onClose).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Crear Tarea' }));
        await waitFor(() => expect(mocks.uploadEvidence).toHaveBeenCalledTimes(2));
        expect(mocks.createActivity).toHaveBeenCalledOnce();
        expect(mocks.updateActivity).toHaveBeenCalledOnce();
    });
});
