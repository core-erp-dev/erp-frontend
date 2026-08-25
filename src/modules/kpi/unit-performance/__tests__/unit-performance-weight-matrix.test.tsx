import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  createMatrixDraft,
  getMatrixValidation,
  UnitPerformanceWeightMatrix,
} from '../unit-performance-weight-matrix';
import type { UnitPerformanceWeightMatrix as Matrix } from '../unit-performance.types';

const baseMatrix: Matrix = {
  year: 2026,
  units: [
    { id: 'up-hub', organizationUnitId: 'ou-hub', unitCode: 'HUB', unitName: 'Hublang' },
    { id: 'up-spi', organizationUnitId: 'ou-spi', unitCode: 'SPI', unitName: 'SPI' },
  ],
  indicators: [{ id: 'ind-1', code: 'IND_01', name: 'ROE', aspectName: 'ASP_01' }],
  weights: [
    { indicatorId: 'ind-1', unitPerformanceId: 'up-hub', weight: 60 },
    { indicatorId: 'ind-1', unitPerformanceId: 'up-spi', weight: 40 },
  ],
  totals: { 'ind-1': 100 },
  complete: true,
};

const tableProps = {
  draft: createMatrixDraft(baseMatrix),
  canEdit: true,
  isLoading: false,
  error: null,
  onRetry: jest.fn(),
  onDraftChange: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

it('uses the HeroUI matrix table with dynamic unit columns and indicator identity', () => {
  render(<UnitPerformanceWeightMatrix matrix={baseMatrix} {...tableProps} />);

  expect(screen.getByLabelText('Matriks Konfigurasi Performa Unit')).toBeInTheDocument();
  expect(screen.getByText('IND_01')).toBeInTheDocument();
  expect(screen.getByText('ROE')).toBeInTheDocument();
  expect(screen.getByText('Hublang')).toBeInTheDocument();
  expect(screen.getAllByText('SPI').length).toBeGreaterThan(0);
  expect(screen.getByText('Total')).toBeInTheDocument();
  expect(screen.getByLabelText('IND_01 ROE - Hublang Bobot')).toBeInTheDocument();
});

it('renders read-only values without inputs', () => {
  render(<UnitPerformanceWeightMatrix matrix={baseMatrix} {...tableProps} canEdit={false} />);

  expect(screen.getByText('60%')).toBeInTheDocument();
  expect(screen.getByText('40%')).toBeInTheDocument();
  expect(screen.queryByLabelText('IND_01 ROE - Hublang Bobot')).not.toBeInTheDocument();
});

it('accepts zero when the indicator total remains 100%', () => {
  const zeroMatrix: Matrix = {
    ...baseMatrix,
    weights: [
      { indicatorId: 'ind-1', unitPerformanceId: 'up-hub', weight: 0 },
      { indicatorId: 'ind-1', unitPerformanceId: 'up-spi', weight: 100 },
    ],
  };
  const validation = getMatrixValidation(zeroMatrix, createMatrixDraft(zeroMatrix));

  expect(validation.allValid).toBe(true);
  render(<UnitPerformanceWeightMatrix matrix={zeroMatrix} {...tableProps} draft={createMatrixDraft(zeroMatrix)} />);
  expect(screen.getByDisplayValue('0')).toBeInTheDocument();
  expect(screen.getByText('100%')).toBeInTheDocument();
});

it('keeps totals invalid when they are not exactly 100%', () => {
  const draft = createMatrixDraft(baseMatrix);
  draft['ind-1']['up-hub'] = '55';
  const validation = getMatrixValidation(baseMatrix, draft);

  expect(validation.allValid).toBe(false);
  expect(validation.perIndicator.get('ind-1')?.totalCents).toBe(9500);
});

it('keeps loading and error states in the table body', () => {
  const { rerender } = render(<UnitPerformanceWeightMatrix matrix={baseMatrix} {...tableProps} isLoading />);
  expect(screen.queryByText('IND_01')).not.toBeInTheDocument();

  rerender(<UnitPerformanceWeightMatrix matrix={baseMatrix} {...tableProps} error="Gagal memuat konfigurasi." />);
  expect(screen.getByText('Gagal memuat konfigurasi.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Coba Lagi' })).toBeInTheDocument();
});
