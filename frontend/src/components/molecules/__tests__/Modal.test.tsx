import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button, Title } from '../../atoms';
import Modal from '../Modal';

const ModalHarness = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Abrir modal</Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={<Title variant="h4">Título JSX</Title>}
      >
        Contenido
      </Modal>
    </>
  );
};

describe('Modal', () => {
  it('asocia títulos JSX y restaura foco al cerrar con Escape', async () => {
    render(<ModalHarness />);
    const trigger = screen.getByRole('button', { name: 'Abrir modal' });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole('dialog', { name: 'Título JSX' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
