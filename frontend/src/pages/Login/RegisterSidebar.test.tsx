import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RegisterSidebar from './RegisterSidebar';

const fillValidForm = () => {
    fireEvent.change(screen.getByPlaceholderText('Ej: 123456789'), { target: { value: '123456789' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: Juan Pérez'), { target: { value: 'Juan Pérez' } });
    fireEvent.change(screen.getByPlaceholderText('Mínimo 8 caracteres'), { target: { value: 'ClaveSegura123' } });
    fireEvent.change(screen.getByPlaceholderText('Repita la contraseña'), { target: { value: 'ClaveSegura123' } });
};

interface MockRegisterResponse {
    ok?: boolean;
    status?: number;
    body?: unknown;
}

const mockFetchResponse = (response: MockRegisterResponse) => {
    const json = response.body instanceof Error
        ? vi.fn().mockRejectedValue(response.body)
        : vi.fn().mockResolvedValue(response.body ?? {});

    return vi.fn().mockResolvedValue({
        ok: response.ok ?? true,
        status: response.status ?? 200,
        json,
    });
};

describe('RegisterSidebar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('muestra mensaje de cuenta autoactivada al registrar exitosamente', async () => {
        vi.stubGlobal('fetch', mockFetchResponse({ ok: true, status: 201 }));

        render(<RegisterSidebar isOpen onClose={vi.fn()} />);
        fillValidForm();
        fireEvent.click(screen.getByRole('button', { name: /Crear Cuenta/i }));

        await waitFor(() => {
            expect(screen.getByText('¡Cuenta activada!')).toBeInTheDocument();
            expect(screen.getByText(/Tu cuenta fue creada y habilitada correctamente/i)).toBeInTheDocument();
        });
    });

    it('aplana detail de FastAPI para errores 400', async () => {
        vi.stubGlobal('fetch', mockFetchResponse({
            ok: false,
            status: 400,
            body: { detail: [{ msg: 'La contraseña debe tener al menos 8 caracteres' }] },
        }));

        render(<RegisterSidebar isOpen onClose={vi.fn()} />);
        fillValidForm();
        fireEvent.click(screen.getByRole('button', { name: /Crear Cuenta/i }));

        expect(await screen.findByRole('alert')).toHaveTextContent('La contraseña debe tener al menos 8 caracteres');
    });

    it('muestra mensaje específico para 403 sin detalle', async () => {
        vi.stubGlobal('fetch', mockFetchResponse({
            ok: false,
            status: 403,
            body: new SyntaxError('Unexpected end of JSON input'),
        }));

        render(<RegisterSidebar isOpen onClose={vi.fn()} />);
        fillValidForm();
        fireEvent.click(screen.getByRole('button', { name: /Crear Cuenta/i }));

        expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible activar tu cuenta porque tu usuario no figura activo en ERP/establecimiento');
    });

    it('muestra mensaje específico para 429 sin detalle', async () => {
        vi.stubGlobal('fetch', mockFetchResponse({
            ok: false,
            status: 429,
            body: new SyntaxError('Unexpected end of JSON input'),
        }));

        render(<RegisterSidebar isOpen onClose={vi.fn()} />);
        fillValidForm();
        fireEvent.click(screen.getByRole('button', { name: /Crear Cuenta/i }));

        expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados intentos. Espera unos minutos antes de intentarlo nuevamente.');
    });
});
