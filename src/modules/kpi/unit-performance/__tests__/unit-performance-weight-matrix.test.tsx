/**
 * Weight matrix editor tests: dynamic columns from participating units,
 * per-cell percentage inputs, live per-indicator totals, save gating
 * (enabled ONLY when every indicator totals exactly 100% with all cells
 * filled), and the submitted payload shape (one entry per indicator × unit).
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UnitPerformanceWeightMatrix } from '../unit-performance-weight-matrix';
import type { UnitPerformanceWeightMatrix as Matrix } from '../unit-performance.types';

const baseMatrix: Matrix = {
  year: 2026,
  units: [
    { id: 'up-hub', organizationUnitId: 'ou-hub', unitCode: 'HUB', unitName: 'Hublang' },
    { id: 'up-spi', organizationUnitId: 'ou-spi', unitCode: 'SPI', unitName: 'SPI' },
  ],
  indicators: [
    { id: 'ind-1', code: 'IND_01', name: 'ROE', aspectName: 'ASP_01' },
  ],
  weights: [
    { indicatorId: 'ind-1', unitPerformanceId: 'up-hub', weight: 60 },
    { indicatorId: 'ind-1', unitPerformanceId: 'up-spi', weight: 40 },
  ],
  totals: { 'ind-1': 100 },
  complete: true,
};

const onSave = jest.fn().mockResolvedValue(true);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('dynamic columns', () => {
  it('renders one column per participating unit — nothing hardcoded', () => {
    render(<UnitPerformanceWeightMatrix matrix={baseMatrix} isMutating={false} onSave={onSave} />);

    expect(screen.getByText('Hublang')).toBeInTheDocument();
    // unitCode "SPI" also appears under the header name — assert presence
    expect(screen.getAllByText('SPI').length).toBeGreaterThan(0);
    // code + aspect share one span ("IND_01 · ASP_01") — substring match
    expect(screen.getByText(/IND_01/)).toBeInTheDocument();
    // per-cell inputs carry the indicator × unit pairing
    expect(screen.getByLabelText('ROE — Hublang weight')).toBeInTheDocument();
    expect(screen.getByLabelText('ROE — SPI weight')).toBeInTheDocument();
  });

  it('pre-fills the matrix cells from the server weights', () => {
    render(<UnitPerformanceWeightMatrix matrix={baseMatrix} isMutating={false} onSave={onSave} />);

    expect(screen.getByLabelText('ROE — Hublang weight')).toHaveValue('60');
    expect(screen.getByLabelText('ROE — SPI weight')).toHaveValue('40');
  });
});

describe('validation & save gating', () => {
  it('keeps Save disabled when the total is not exactly 100%', () => {
    render(<UnitPerformanceWeightMatrix matrix={baseMatrix} isMutating={false} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('ROE — Hublang weight'), { target: { value: '55' } });

    // 55 + 40 = 95 — not complete
    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('Must total exactly 100%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Matrix' })).toBeDisabled();
  });

  it('keeps Save disabled when a cell is empty (unit without weight)', () => {
    const emptyMatrix: Matrix = {
      ...baseMatrix,
      weights: [{ indicatorId: 'ind-1', unitPerformanceId: 'up-hub', weight: 100 }],
      totals: { 'ind-1': 100 },
    };
    render(<UnitPerformanceWeightMatrix matrix={emptyMatrix} isMutating={false} onSave={onSave} />);

    expect(screen.getByText('Fill every unit weight (> 0)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Matrix' })).toBeDisabled();
  });

  it('rejects non-numeric or out-of-range weights as missing', () => {
    render(<UnitPerformanceWeightMatrix matrix={baseMatrix} isMutating={false} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('ROE — Hublang weight'), { target: { value: 'abc' } });

    expect(screen.getByText('Fill every unit weight (> 0)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Matrix' })).toBeDisabled();
  });

  it('enables Save and submits the full matrix in one request when every indicator totals 100%', async () => {
    render(<UnitPerformanceWeightMatrix matrix={baseMatrix} isMutating={false} onSave={onSave} />);
    // 60 + 40 = 100 already — save enabled
    expect(screen.getByText('100%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save Matrix' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith([
      { indicatorId: 'ind-1', unitPerformanceId: 'up-hub', weight: 60 },
      { indicatorId: 'ind-1', unitPerformanceId: 'up-spi', weight: 40 },
    ]);
  });

  it('submits small weights like 3% verbatim', async () => {
    const smallMatrix: Matrix = {
      ...baseMatrix,
      weights: [
        { indicatorId: 'ind-1', unitPerformanceId: 'up-hub', weight: 97 },
        { indicatorId: 'ind-1', unitPerformanceId: 'up-spi', weight: 3 },
      ],
      totals: { 'ind-1': 100 },
    };
    render(<UnitPerformanceWeightMatrix matrix={smallMatrix} isMutating={false} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save Matrix' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith([
      { indicatorId: 'ind-1', unitPerformanceId: 'up-hub', weight: 97 },
      { indicatorId: 'ind-1', unitPerformanceId: 'up-spi', weight: 3 },
    ]));
  });
});

describe('empty states', () => {
  it('shows the no-units empty state', () => {
    render(
      <UnitPerformanceWeightMatrix
        matrix={{ ...baseMatrix, units: [], weights: [], totals: {} }}
        isMutating={false}
        onSave={onSave}
      />,
    );
    expect(screen.getByText(/No participating units yet/)).toBeInTheDocument();
  });

  it('shows the no-indicators empty state', () => {
    render(
      <UnitPerformanceWeightMatrix
        matrix={{ ...baseMatrix, indicators: [], weights: [], totals: {} }}
        isMutating={false}
        onSave={onSave}
      />,
    );
    expect(screen.getByText(/No indicators for this year/)).toBeInTheDocument();
  });
});
