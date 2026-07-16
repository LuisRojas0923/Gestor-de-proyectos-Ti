import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import FilePicker from '../FilePicker';

describe('FilePicker', () => {
  it('mantiene el input de archivo sobre toda el área clicable', () => {
    const onChange = vi.fn();
    render(
      <FilePicker
        id="evidencia"
        files={[]}
        multiple={false}
        accept=".pdf"
        placeholder="Seleccionar evidencia"
        onChange={onChange}
      />
    );

    const input = screen.getByLabelText('Seleccionar evidencia');
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('accept', '.pdf');
    expect(input).not.toHaveAttribute('multiple');
    expect(input).toHaveClass('h-full');
    expect(input.parentElement).toHaveClass('relative');
    expect(input.parentElement?.parentElement).toHaveClass('h-full', '[&>div]:h-full');

    const file = new File(['%PDF-1.7'], 'evidencia.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onChange).toHaveBeenCalledOnce();
  });
});
