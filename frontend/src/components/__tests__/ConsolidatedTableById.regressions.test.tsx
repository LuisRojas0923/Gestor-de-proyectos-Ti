import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ConsolidatedTableById from '../ConsolidatedTableById';

const mockData = {
    id: 'HO-1',
    nombre: 'Proyecto Prueba',
    actividades: [
        { id: 1, titulo: 'Tarea 1', estado: 'en_progreso', porcentaje_avance: 50 },
        { id: 2, titulo: 'Tarea 2', estado: 'pendiente', porcentaje_avance: 0 },
        { id: 3, titulo: 'Tarea 3', estado: '', porcentaje_avance: 100 },
    ],
};

const nextData = {
    id: 'HO-2',
    nombre: 'Proyecto Siguiente',
    actividades: [
        { id: 4, titulo: 'Tarea nueva', estado: 'pendiente', porcentaje_avance: 25 },
    ],
};

const originalFetch = global.fetch;
const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

describe('ConsolidatedTableById - regresiones finales', () => {
    beforeEach(() => {
        global.fetch = vi.fn().mockImplementation((input: string | URL | Request) => Promise.resolve({
            ok: true,
            json: async () => String(input).endsWith('/HO-2') ? nextData : mockData,
        }));
        Element.prototype.getBoundingClientRect = vi.fn(() => ({
            width: 100,
            height: 40,
            top: 40,
            left: 20,
            bottom: 80,
            right: 120,
        })) as unknown as () => DOMRect;
    });

    afterEach(() => {
        global.fetch = originalFetch;
        Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    });

    it('combina filtros y permite limpiar una columna sin perder la otra', async () => {
        render(<ConsolidatedTableById desarrolloId="HO-1" />);
        await screen.findByText('Tarea 1');

        fireEvent.click(screen.getByRole('button', { name: 'Estado' }));
        let dialog = await screen.findByRole('dialog');
        fireEvent.click(within(dialog).getByRole('checkbox', { name: 'pendiente' }));
        fireEvent.click(within(dialog).getByRole('button', { name: 'Aplicar' }));

        fireEvent.click(screen.getByRole('button', { name: 'Progreso' }));
        dialog = await screen.findByRole('dialog');
        fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Completado (100%)' }));

        expect(screen.getByText('Tarea 1')).toBeInTheDocument();
        expect(screen.queryByText('Tarea 2')).not.toBeInTheDocument();
        expect(screen.queryByText('Tarea 3')).not.toBeInTheDocument();

        fireEvent.click(within(dialog).getByRole('button', { name: 'Limpiar' }));

        expect(screen.getByText('Tarea 1')).toBeInTheDocument();
        expect(screen.queryByText('Tarea 2')).not.toBeInTheDocument();
        expect(screen.getByText('Tarea 3')).toBeInTheDocument();
    });

    it('reinicia filtros y popover cuando cambia el desarrollo', async () => {
        const { rerender } = render(<ConsolidatedTableById desarrolloId="HO-1" />);
        await screen.findByText('Tarea 1');

        fireEvent.click(screen.getByRole('button', { name: 'Estado' }));
        const dialog = await screen.findByRole('dialog');
        fireEvent.click(within(dialog).getByRole('checkbox', { name: 'pendiente' }));
        expect(screen.getByRole('button', { name: 'Estado, filtro activo' })).toBeInTheDocument();

        rerender(<ConsolidatedTableById desarrolloId="HO-2" />);

        expect(await screen.findByText('Tarea nueva')).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Estado' })).toHaveAttribute('aria-expanded', 'false');
    });

    it('ignora respuestas antiguas después de cambiar el desarrollo', async () => {
        let resolveFirst: ((value: { ok: boolean; json: () => Promise<typeof mockData> }) => void) | undefined;
        let resolveSecond: ((value: { ok: boolean; json: () => Promise<typeof nextData> }) => void) | undefined;
        global.fetch = vi.fn().mockImplementation((input: string | URL | Request) => new Promise((resolve) => {
            if (String(input).endsWith('/HO-2')) {
                resolveSecond = resolve;
            } else {
                resolveFirst = resolve;
            }
        }));

        const { rerender } = render(<ConsolidatedTableById desarrolloId="HO-1" />);
        rerender(<ConsolidatedTableById desarrolloId="HO-2" />);

        await act(async () => {
            resolveSecond?.({ ok: true, json: async () => nextData });
        });
        expect(await screen.findByText('Tarea nueva')).toBeInTheDocument();

        await act(async () => {
            resolveFirst?.({ ok: true, json: async () => mockData });
        });
        expect(screen.getByText('Tarea nueva')).toBeInTheDocument();
        expect(screen.queryByText('Tarea 1')).not.toBeInTheDocument();
    });

    it('mantiene estructura HTML válida y comunica el filtro activo', async () => {
        render(<ConsolidatedTableById desarrolloId="HO-1" />);
        await screen.findByText('Tarea 1');

        fireEvent.click(screen.getByRole('button', { name: 'Estado' }));
        const dialog = await screen.findByRole('dialog');
        const option = within(dialog).getByRole('checkbox', { name: 'pendiente' });

        expect(option.querySelector('div')).toBeNull();
        expect(option.firstElementChild).toHaveClass('contents');

        fireEvent.click(option);
        expect(screen.getByRole('button', { name: 'Estado, filtro activo' })).toBeInTheDocument();
    });

    it('cierra el popover cuando el foco abandona el diálogo', async () => {
        render(<ConsolidatedTableById desarrolloId="HO-1" />);
        await screen.findByText('Tarea 1');

        fireEvent.click(screen.getByRole('button', { name: 'Estado' }));
        await screen.findByRole('dialog');
        fireEvent.focusIn(document.body);

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
});
