/**
 * Tests unitarios para HdiPreview.tsx
 *
 * Cobertura:
 * - El input acepta solo .xlsx (no .xls)
 * - Archivo > 10MB es rechazado
 * - Estado vacío menciona Excel (.xlsx) y no PDF
 * - Botón Procesar deshabilitado sin archivos
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotificationsProvider } from '../components/notifications/NotificationsContext';

vi.mock('axios', () => ({
    default: {
        get: vi.fn().mockResolvedValue({ data: { rows: [], summary: {}, warnings_detalle: [] } }),
        post: vi.fn(),
    }
}));

vi.mock('../config/api', () => ({
    API_CONFIG: { BASE_URL: 'http://localhost:8000/api/v2' }
}));

vi.mock('../components/atoms', () => ({
    Title: ({ children, ...p }: any) => <h1 {...p}>{children}</h1>,
    Text: ({ children, as: Tag = 'span', ...p }: any) => <Tag {...p}>{children}</Tag>,
    Button: ({ children, onClick, disabled, ...p }: any) => (
        <button onClick={onClick} disabled={disabled} {...p}>{children}</button>
    ),
    Select: ({ label, value, onChange, options }: any) => (
        <select aria-label={label} value={value} onChange={onChange}>
            {options?.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    ),
    Input: ({ label, onChange, value, type, ...p }: any) => (
        <input aria-label={label} onChange={onChange} value={value} type={type} {...p} />
    ),
    Badge: ({ children, ...p }: any) => <span {...p}>{children}</span>,
}));

vi.mock('../pages/ServicePortal/pages/NOVEDADES_NOMINA/components/SubcategorySummaryCard', () => ({
    default: ({ label }: any) => <div>{label}</div>
}));

vi.mock('../components/molecules/FilterDropdown', () => ({
    FilterDropdown: () => <div data-testid="filter-dropdown" />
}));

const renderHdiPreview = async () => {
    const { default: HdiPreview } = await import('../pages/ServicePortal/pages/NOVEDADES_NOMINA/HdiPreview');
    return render(
        <MemoryRouter>
            <NotificationsProvider>
                <HdiPreview />
            </NotificationsProvider>
        </MemoryRouter>
    );
};

describe('HdiPreview — contrato de archivos', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('el input de archivos acepta SOLO .xlsx (no .xls)', async () => {
        await renderHdiPreview();
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        expect(fileInput).toBeInTheDocument();
        expect(fileInput.getAttribute('accept')).toBe('.xlsx');
    });

    it('rechaza archivos > 10MB y no los agrega al estado (botón sigue deshabilitado)', async () => {
        await renderHdiPreview();
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;

        const oversizedFile = new File(
            [new ArrayBuffer(11 * 1024 * 1024)],
            'datos_hdi.xlsx',
            { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
        );

        fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

        // El archivo no debe agregarse: el botón permanece deshabilitado
        const procesarBtn = screen.getByRole('button', { name: /procesar archivos/i });
        expect(procesarBtn).toBeDisabled();
    });

    it('acepta archivos .xlsx dentro del límite y habilita el botón Procesar', async () => {
        await renderHdiPreview();
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;

        const validFile = new File(
            ['contenido xlsx simulado'],
            'hdi_julio_2026.xlsx',
            { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
        );

        fireEvent.change(fileInput, { target: { files: [validFile] } });

        const procesarBtn = screen.getByRole('button', { name: /procesar archivos/i });
        expect(procesarBtn).not.toBeDisabled();
    });

    it('el estado vacío menciona archivos Excel (.xlsx) y NO PDF', async () => {
        await renderHdiPreview();
        expect(screen.getByText(/archivos Excel \(\.xlsx\)/i)).toBeInTheDocument();
        expect(screen.queryByText(/archivos PDF/i)).not.toBeInTheDocument();
    });

    it('renderiza el título del módulo SEGUROS HDI', async () => {
        await renderHdiPreview();
        expect(screen.getByText(/SEGUROS HDI/i)).toBeInTheDocument();
    });
});
