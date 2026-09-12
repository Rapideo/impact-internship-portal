import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InternCode } from '~/components/InternCode';

describe('<InternCode>', () => {
  it('renders the code in a mono span', () => {
    render(<InternCode code="IMP-26-0417" />);
    const el = screen.getByText('IMP-26-0417');
    expect(el.tagName).toBe('SPAN');
    expect(el.className).toBe('intern-code');
  });

  it('adds the size modifier', () => {
    render(<InternCode code="IMP-26-0417" size="lg" />);
    expect(screen.getByText('IMP-26-0417').className).toBe('intern-code intern-code--lg');
  });

  it('adds the strong modifier', () => {
    render(<InternCode code="IMP-26-0417" strong />);
    expect(screen.getByText('IMP-26-0417').className).toBe('intern-code intern-code--strong');
  });
});
