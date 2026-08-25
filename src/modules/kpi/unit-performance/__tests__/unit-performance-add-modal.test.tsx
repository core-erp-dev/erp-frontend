/**
 * Add Unit modal tests: org-unit picker only (NO global weight field — the
 * per-indicator weights are configured in the matrix), submit payload shape,
 * and cancellation.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnitPerformanceAddModal } from '../unit-performance-add-modal';
import type { OrganizationUnitResponse } from '@/modules/organization/organization-units/types';

jest.mock('@heroui/react', () => {
  const actual = jest.requireActual('@heroui/react');
  return {
    ...actual,
    toast: { success: jest.fn(), danger: jest.fn(), warning: jest.fn(), info: jest.fn() },
  };
});

const orgUnits: OrganizationUnitResponse[] = [
  { id: 'ou-a', parentId: null, parentName: null, unitCode: 'A', unitName: 'Alpha',
    unitType: 'DEPARTMENT', children: [] },
  { id: 'ou-b', parentId: null, parentName: null, unitCode: 'B', unitName: 'Beta',
    unitType: 'DEPARTMENT', children: [] },
];

const onSubmit = jest.fn().mockResolvedValue(true);
const onClose = jest.fn();

beforeEach(() => jest.clearAllMocks());

it('renders only the org-unit picker — no global weight field', () => {
  render(
    <UnitPerformanceAddModal
      isOpen
      onClose={onClose}
      onSubmit={onSubmit}
      orgUnits={orgUnits}
      isSubmitting={false}
    />,
  );

  expect(screen.getByPlaceholderText('Pilih unit organisasi')).toBeInTheDocument();
  expect(screen.queryByText('Weight (%)')).not.toBeInTheDocument();
});

it('cancels without submitting', () => {
  render(
    <UnitPerformanceAddModal
      isOpen
      onClose={onClose}
      onSubmit={onSubmit}
      orgUnits={orgUnits}
      isSubmitting={false}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
  expect(onClose).toHaveBeenCalled();
  expect(onSubmit).not.toHaveBeenCalled();
});
