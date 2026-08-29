/**
 * Acting-Position selector tests.
 *
 * Proves: NO implicit selection (value stays null until the user picks, even
 * with exactly one Position), all active Positions are listed, the primary
 * Position is identified. Loading/error/empty presentation belongs to the
 * consuming page, not a shared blocking panel.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ActingPositionSelector } from '../acting-position-selector';
import type { ActingPosition } from '../acting-position';

const positions: ActingPosition[] = [
  { positionId: 'pos-primary', positionName: 'Manager', userPositionId: 'up-1', userId: 'u-1', isPrimary: true },
  { positionId: 'pos-secondary', positionName: 'Staff', userPositionId: 'up-2', userId: 'u-1', isPrimary: false },
];

const onlyOne: ActingPosition[] = [
  { positionId: 'pos-only', positionName: 'Sole Role', userPositionId: 'up-9', userId: 'u-1', isPrimary: true },
];

describe('ActingPositionSelector — explicit selection', () => {
  it('never calls onChange on mount, even with exactly one Position (no implicit selection)', () => {
    const onChange = jest.fn();
    render(
      <ActingPositionSelector positions={onlyOne} value={null} onChange={onChange} />,
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not pre-select a Position when the user has not chosen (value stays null)', () => {
    const onChange = jest.fn();
    render(
      <ActingPositionSelector positions={positions} value={null} onChange={onChange} />,
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('lists ALL active Positions and identifies the primary', () => {
    render(
      <ActingPositionSelector positions={positions} value={null} onChange={jest.fn()} />,
    );
    expect(screen.getAllByText('Manager').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Staff').length).toBeGreaterThan(0);
    // The primary Position carries an explicit marker.
    expect(screen.getAllByText('Utama').length).toBe(1);
  });
});
