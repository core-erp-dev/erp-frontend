import { api } from '@/lib/axios';

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const profileApi = {
  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    await api.patch('/api/v1/users/me/password', data);
  },
};
