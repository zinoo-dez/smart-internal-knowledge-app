import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { BrandIcon } from './brand-icon';

describe('BrandIcon', () => {
  it('renders badge variant with decorative aria-hidden by default', () => {
    const { container } = render(<BrandIcon className="w-8 h-8" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('viewBox', '0 0 32 32');
    expect(svg?.querySelector('linearGradient')).toBeInTheDocument();
  });

  it('renders mark variant without badge gradient using currentColor', () => {
    const { container } = render(<BrandIcon variant="mark" className="w-4 h-4 text-blue-600" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.querySelector('linearGradient')).not.toBeInTheDocument();
    const paths = svg?.querySelectorAll('path');
    expect(paths).toHaveLength(3);
    expect(paths?.[0]).toHaveAttribute('fill', 'currentColor');
  });

  it('generates unique gradient IDs across multiple badge instances', () => {
    const { container } = render(
      <div>
        <BrandIcon />
        <BrandIcon />
      </div>,
    );
    const gradients = Array.from(container.querySelectorAll('linearGradient')).map((el) =>
      el.getAttribute('id'),
    );
    expect(gradients).toHaveLength(2);
    expect(gradients[0]).toBeTruthy();
    expect(gradients[0]).not.toBe(gradients[1]);
  });

  it('exposes accessible role and title when title prop is provided', () => {
    render(<BrandIcon title="Smart Internal Knowledge Assistant" />);
    const img = screen.getByRole('img', { name: 'Smart Internal Knowledge Assistant' });
    expect(img).toBeInTheDocument();
    expect(img).not.toHaveAttribute('aria-hidden');
  });
});
