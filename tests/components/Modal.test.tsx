import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '~/components/Modal';

describe('Modal', () => {
  it('renders null when closed', () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}} labelledBy="t">
        <div>x</div>
      </Modal>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders children when open', () => {
    render(
      <Modal open onClose={() => {}} labelledBy="t">
        <h3 id="t">My modal</h3>
      </Modal>,
    );
    expect(screen.getByText('My modal')).toBeInTheDocument();
  });

  it('closes on overlay click', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal open onClose={onClose} labelledBy="t">
        <h3 id="t">My modal</h3>
      </Modal>,
    );
    const overlay = container.querySelector('.modal__overlay')!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} labelledBy="t">
        <h3 id="t">My modal</h3>
      </Modal>,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
