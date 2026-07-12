import { fireEvent, render, screen } from '@testing-library/react';
import { Clock } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import ServiceCard from '../ServiceCard';

describe('ServiceCard', () => {
  it('expone una primitiva nativa accesible y conserva la interacción', () => {
    const onClick = vi.fn();
    render(<ServiceCard title="Tiempo y asistencia" description="Gestionar horarios" icon={<Clock aria-hidden="true" />} onClick={onClick} />);
    const card = screen.getByRole('button', { name: /Tiempo y asistencia/i });
    expect(card.tagName).toBe('BUTTON');
    card.focus();
    expect(card).toHaveFocus();
    fireEvent.click(card);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
