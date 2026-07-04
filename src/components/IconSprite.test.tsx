import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { IconSprite } from './IconSprite';
import type { Icon } from '../data/types';

describe('IconSprite', () => {
  const mockIcon: Icon = { id: 'iron-plate', x: 264, y: 132, color: '#7c6c5f' };

  it('renders with correct size', () => {
    const { getByTestId } = render(<IconSprite icon={mockIcon} size={32} />);
    const el = getByTestId('icon-iron-plate') as HTMLElement;
    expect(el.style.width).toBe('32px');
    expect(el.style.height).toBe('32px');
  });

  it('renders with background image pointing to icons.webp', () => {
    const { getByTestId } = render(<IconSprite icon={mockIcon} size={32} />);
    const el = getByTestId('icon-iron-plate') as HTMLElement;
    expect(el.style.backgroundImage).toContain('icons.webp');
  });

  it('calculates correct background position for 32px size', () => {
    const { getByTestId } = render(<IconSprite icon={mockIcon} size={32} />);
    const el = getByTestId('icon-iron-plate') as HTMLElement;
    // scale = 32/64 = 0.5, so position = -264*0.5 = -132, -132*0.5 = -66
    expect(el.style.backgroundPosition).toBe('-132px -66px');
  });

  it('calculates correct background size for 32px', () => {
    const { getByTestId } = render(<IconSprite icon={mockIcon} size={32} />);
    const el = getByTestId('icon-iron-plate') as HTMLElement;
    // scale = 0.5, sheet = 1320*0.5 = 660
    expect(el.style.backgroundSize).toBe('660px 660px');
  });

  it('uses pixelated rendering', () => {
    const { getByTestId } = render(<IconSprite icon={mockIcon} size={32} />);
    const el = getByTestId('icon-iron-plate') as HTMLElement;
    expect(el.style.imageRendering).toBe('pixelated');
  });
});