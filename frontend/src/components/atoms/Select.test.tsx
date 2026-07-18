import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Select from './Select';


describe('Select', () => {
  it('asocia etiqueta, obligatoriedad y mensaje de error', () => {
    render(
      <Select
        label="Empresa"
        required
        error
        errorMessage="Seleccione una empresa"
        options={[{ value: '', label: 'Seleccione' }]}
      />,
    );

    const select = screen.getByLabelText(/Empresa/);
    const error = screen.getByText('Seleccione una empresa');
    expect(select).toBeRequired();
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(select).toHaveAttribute('aria-describedby', error.id);
  });
});
