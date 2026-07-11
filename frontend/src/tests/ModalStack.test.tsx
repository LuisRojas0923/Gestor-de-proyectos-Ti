import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { Button } from '../components/atoms';
import Modal from '../components/molecules/Modal';

const NestedModals = ({ onParentClose = vi.fn() }: { onParentClose?: () => void }) => {
  const [parentOpen, setParentOpen] = useState(false);
  const [childOpen, setChildOpen] = useState(false);
  return <>
    <Button onClick={() => setParentOpen(true)}>Abrir editor</Button>
    <Modal isOpen={parentOpen} onClose={() => { setParentOpen(false); onParentClose(); }} title="Editor padre">
      <Button onClick={() => setChildOpen(true)}>Abrir reloj</Button>
      <Modal isOpen={childOpen} onClose={() => setChildOpen(false)} title="Reloj hijo">
        <Button>Aceptar hora</Button>
      </Modal>
    </Modal>
  </>;
};

describe('Modal con pila anidada', () => {
  it('Escape cierra solo el modal superior, conserva scroll lock y restaura foco', async () => {
    const onParentClose = vi.fn();
    document.body.style.overflow = 'clip';
    render(<NestedModals onParentClose={onParentClose} />);
    const parentTrigger = screen.getByRole('button', { name: 'Abrir editor' });
    parentTrigger.focus();
    fireEvent.click(parentTrigger);
    await screen.findByRole('dialog', { name: 'Editor padre' });
    expect(document.body.style.overflow).toBe('hidden');

    const childTrigger = screen.getByRole('button', { name: 'Abrir reloj' });
    childTrigger.focus();
    fireEvent.click(childTrigger);
    await screen.findByRole('dialog', { name: 'Reloj hijo' });
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Reloj hijo' })).not.toBeInTheDocument());
    expect(screen.getByRole('dialog', { name: 'Editor padre' })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    await waitFor(() => expect(childTrigger).toHaveFocus());
    expect(onParentClose).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.body.style.overflow).toBe('clip');
    await waitFor(() => expect(parentTrigger).toHaveFocus());
    expect(onParentClose).toHaveBeenCalledOnce();
  });

  it('permite deshabilitar la X mientras una mutación está en curso', () => {
    const onClose = vi.fn();
    render(<Modal isOpen onClose={onClose} title="Mutación" closeButtonDisabled><Button>Procesando</Button></Modal>);
    const close = screen.getByRole('button', { name: 'Cerrar modal' });
    expect(close).toBeDisabled();
    fireEvent.click(close);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Mutación' })).toBeInTheDocument();
  });
});
