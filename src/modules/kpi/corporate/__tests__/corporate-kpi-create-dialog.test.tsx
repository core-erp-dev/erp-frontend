import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CorporateKpiCreateDialog } from '../corporate-kpi-create-dialog';

jest.mock('@heroui/react', () => {
  const actual = jest.requireActual('@heroui/react');
  const React = jest.requireActual('react');
  const SelectMock = (props: {
    'aria-label'?: string;
    onSelectionChange?: (key: string | number) => void;
    children?: React.ReactNode;
  }) => {
    const label = props['aria-label'] ?? '';
    const selection = label === 'Pilih tahun sumber' ? '2025' : 'copy';
    return React.createElement(
      'div',
      {
        'data-testid': `select-${label.toLowerCase().replace(/\s+/g, '-')}`,
        onClick: () => props.onSelectionChange?.(selection),
      },
      props.children,
    );
  };
  SelectMock.Trigger = 'span';
  SelectMock.Value = 'span';
  SelectMock.Indicator = 'span';
  SelectMock.Popover = 'span';
  return { ...actual, Select: SelectMock };
});

const sourceStructure = {
  id: 'struct-2025',
  year: 2025,
  status: 'DRAFT' as const,
  activatedAt: null,
  activatedBy: null,
  deletedAt: null,
  createdAt: '2025-01-01T00:00:00',
  updatedAt: '2025-01-01T00:00:00',
};

function renderDialog(overrides: Partial<React.ComponentProps<typeof CorporateKpiCreateDialog>> = {}) {
  return render(
    <CorporateKpiCreateDialog
      isOpen={true}
      targetYear={2026}
      structures={[sourceStructure]}
      isPending={false}
      onClose={jest.fn()}
      onCreateNew={jest.fn()}
      onCopy={jest.fn().mockResolvedValue(undefined)}
      {...overrides}
    />,
  );
}

describe('CorporateKpiCreateDialog', () => {
  it('continues to the normal create form for Buat Baru', () => {
    const onCreateNew = jest.fn();
    renderDialog({ onCreateNew });

    fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan' }));

    expect(onCreateNew).toHaveBeenCalledTimes(1);
  });

  it('sends the selected source year for Salin dari Tahun Sebelumnya', async () => {
    const onCopy = jest.fn().mockResolvedValue(undefined);
    renderDialog({ onCopy });

    fireEvent.click(screen.getByTestId('select-pilih-cara-membuat-kpi-perusahaan'));
    fireEvent.click(screen.getByTestId('select-pilih-tahun-sumber'));
    fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan' }));

    await waitFor(() => expect(onCopy).toHaveBeenCalledWith(2025));
  });
});
