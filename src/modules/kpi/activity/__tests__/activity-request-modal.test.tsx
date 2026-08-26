/**
 * ActivityRequestModal — self-child assignee auto-selection.
 *
 * Child mode loads assignable assignees per parent (T3). In the self-child
 * context (parent = the actor's direct superior, scope=superior) T3 returns
 * ONLY the actor's own assignment — the modal must preselect it so the
 * request targets the actor without an explicit pick. In the child-for-
 * subordinate context a lone non-self assignee must NOT be auto-selected.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ActivityRequestModal } from '../activity-request-modal';
import { activityV1Api } from '../activity-v1-api';
import { corporateKpiApi } from '@/modules/kpi/corporate/corporate-kpi-api';
import { corporateKpiStructuresApi } from '@/modules/kpi/corporate/corporate-kpi-structures-api';
import type { AssignableUserPositionResponse } from '../activity-v1.types';

jest.mock('../activity-v1-api', () => ({ activityV1Api: { getAssignableAssignees: jest.fn() } }));
jest.mock('../use-activity-data', () => ({ useActivityData: () => ({ submitCreateRequest: mockSubmitCreate }) }));
jest.mock('@/modules/kpi/corporate/corporate-kpi-api', () => ({ corporateKpiApi: { getTreeByYear: jest.fn() } }));
jest.mock('@/modules/kpi/corporate/corporate-kpi-structures-api', () => ({
  corporateKpiStructuresApi: { list: jest.fn() },
}));

const mockSubmitCreate = jest.fn();
const mockedAssignable = jest.mocked(activityV1Api.getAssignableAssignees);
const mockedTree = jest.mocked(corporateKpiApi.getTreeByYear);
const mockedStructures = jest.mocked(corporateKpiStructuresApi.list);

const actingPosition = {
  positionId: 'pos-1',
  positionName: 'Kasubbag',
  userPositionId: 'up-self',
  userId: 'u-1',
  isPrimary: true,
};

const parent = {
  id: 'boss-act-1',
  activityName: 'Boss Activity',
} as never;

const selfAssignee: AssignableUserPositionResponse = {
  userPositionId: 'up-self',
  userId: 'u-1',
  userFullName: 'Me',
  positionId: 'pos-1',
  positionName: 'Kasubbag',
  isPrimary: true,
  isSelf: true,
};

const subordinateAssignee: AssignableUserPositionResponse = {
  ...selfAssignee,
  userPositionId: 'up-sub',
  userId: 'u-2',
  userFullName: 'Sub',
  isSelf: false,
};

function renderModal() {
  return render(
    <ActivityRequestModal
      isOpen
      onClose={jest.fn()}
      mode="child"
      actingPosition={actingPosition}
      parents={[parent]}
      initialParentId="boss-act-1"
      onSuccess={jest.fn()}
      onConflict={jest.fn()}
    />,
  );
}

describe('ActivityRequestModal — self-child assignee auto-selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedTree.mockResolvedValue([]);
    mockedStructures.mockResolvedValue([]);
    mockSubmitCreate.mockResolvedValue({ success: true, conflict: null, message: null });
  });

  it('preselects the single self assignee and submits the request targeting the actor', async () => {
    mockedAssignable.mockResolvedValue([selfAssignee]);
    renderModal();

    await waitFor(() => expect(mockedAssignable).toHaveBeenCalledWith('pos-1', 'boss-act-1'));

    fireEvent.change(screen.getByPlaceholderText('Masukkan nama aktivitas...'), { target: { value: 'My Child' } });
    fireEvent.change(screen.getByPlaceholderText('Contoh: %, IDR, unit'), { target: { value: '%' } });
    fireEvent.change(screen.getByPlaceholderText('Contoh: 100'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /Kirim Pengajuan/ }));

    await waitFor(() =>
      expect(mockSubmitCreate).toHaveBeenCalledWith(expect.objectContaining({
        parentId: 'boss-act-1',
        assignedToUserPositionId: 'up-self',
        actingPositionId: 'pos-1',
        activityName: 'My Child',
      })),
    );
  });

  it('does NOT auto-select a lone non-self assignee (child-for-subordinate requires an explicit pick)', async () => {
    mockedAssignable.mockResolvedValue([subordinateAssignee]);
    renderModal();

    await waitFor(() => expect(mockedAssignable).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText('Masukkan nama aktivitas...'), { target: { value: 'Child' } });
    fireEvent.change(screen.getByPlaceholderText('Contoh: %, IDR, unit'), { target: { value: '%' } });
    fireEvent.change(screen.getByPlaceholderText('Contoh: 100'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /Kirim Pengajuan/ }));

    expect(await screen.findByText('Pilih posisi penanggung jawab.')).toBeInTheDocument();
    expect(mockSubmitCreate).not.toHaveBeenCalled();
  });
});
