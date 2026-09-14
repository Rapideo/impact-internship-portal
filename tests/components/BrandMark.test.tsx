// tests/components/BrandMark.test.tsx
// Every nav and footer renders the same brand mark: the reversed Equus
// Workforce Solutions logo (white wordmark for the dark surface) with a
// plain-language alt. Six renderers, one contract — so a future logo swap
// can't half-land.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import type { ComponentType } from 'react';
import { AdminNav } from '../../app/components/AdminNav';
import { AdminFooter } from '../../app/components/AdminFooter';
import { EmployerNav } from '../../app/components/nav/EmployerNav';
import { EmployerFooter } from '../../app/components/nav/EmployerFooter';
import { PublicNav } from '../../app/components/nav/PublicNav';
import { PublicFooter } from '../../app/components/nav/PublicFooter';

const BRAND_ALT = 'Equus Workforce Solutions';
const BRAND_SRC = '/logo-reverse.svg';

const renderers: ReadonlyArray<[string, ComponentType]> = [
  ['AdminNav', () => <AdminNav active="home" userEmail="admin@example.com" />],
  ['AdminFooter', () => <AdminFooter />],
  ['EmployerNav', () => <EmployerNav employerName="Acme" userEmail="e@example.com" />],
  ['EmployerFooter', () => <EmployerFooter />],
  ['PublicNav', () => <PublicNav />],
  ['PublicFooter', () => <PublicFooter />],
];

describe.each(renderers)('%s brand mark', (_name, Component) => {
  it(`renders the reversed Equus logo with alt "${BRAND_ALT}"`, () => {
    const Stub = createRoutesStub([{ path: '/', Component }]);
    render(<Stub initialEntries={['/']} />);
    const img = screen.getByRole('img', { name: BRAND_ALT });
    expect(img).toHaveAttribute('src', BRAND_SRC);
    expect(img).toHaveClass('wordmark__img');
  });
});
