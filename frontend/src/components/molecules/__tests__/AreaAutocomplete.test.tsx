import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AreaAutocomplete from '../AreaAutocomplete';

describe('AreaAutocomplete', () => {
    it('en modo cerrado permite escribir solo para buscar y seleccionar opciones', async () => {
        const onChange = vi.fn();

        render(
            <AreaAutocomplete
                label="Área Impactada"
                placeholder="Buscar área impactada..."
                value=""
                options={['TODAS LAS AREAS', 'GESTIÓN HUMANA']}
                onChange={onChange}
                required
                strictOptions
            />
        );

        expect(screen.getByText('*')).toBeInTheDocument();
        expect(screen.queryByText(/Obligatorio: selecciona un área/i)).not.toBeInTheDocument();

        const input = screen.getByPlaceholderText('Buscar área impactada...') as HTMLInputElement;
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: 'gestion' } });

        expect(onChange).not.toHaveBeenCalled();

        const option = await screen.findByText('GESTIÓN HUMANA');
        fireEvent.mouseDown(option.closest('button') as HTMLButtonElement);

        expect(onChange).toHaveBeenCalledWith('GESTIÓN HUMANA');
        fireEvent.blur(input);
        await waitFor(() => {
            expect(input.value).toBe('GESTIÓN HUMANA');
        });
    });

    it('en modo cerrado revierte texto escrito si no se selecciona una opción', async () => {
        const onChange = vi.fn();

        render(
            <AreaAutocomplete
                label="Área Impactada"
                placeholder="Buscar área impactada..."
                value="TODAS LAS AREAS"
                options={['TODAS LAS AREAS', 'GESTIÓN HUMANA']}
                onChange={onChange}
                strictOptions
            />
        );

        const input = screen.getByPlaceholderText('Buscar área impactada...') as HTMLInputElement;
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: 'otra area' } });
        fireEvent.blur(input);

        await waitFor(() => {
            expect(input.value).toBe('TODAS LAS AREAS');
        });
        expect(onChange).not.toHaveBeenCalled();
    });

    it('muestra un error corto cuando el formulario lo marca como faltante', () => {
        render(
            <AreaAutocomplete
                label="Área Impactada"
                placeholder="Buscar área impactada..."
                value=""
                options={['TODAS LAS AREAS']}
                onChange={vi.fn()}
                required
                strictOptions
                errorMessage="Selecciona el área impactada."
            />
        );

        expect(screen.getByRole('alert')).toHaveTextContent('Selecciona el área impactada.');
    });
});
