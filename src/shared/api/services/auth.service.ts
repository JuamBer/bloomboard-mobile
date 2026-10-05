import { apiClient } from '../client';
import type { AuthResponse, LoginDto, User } from '../../types/api.types';

/** Sign-in and the public account flows a member uses. Staff sign-in, the
 *  center picker and business signup are the web app's. */
export const authService = {
  login: async (dto: LoginDto): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', dto, {
      silentErrors: true,
    });
    return data;
  },

  /** A person creating their own account; the password is set from the
   *  emailed link. Answers the same whether or not the email had an account. */
  registerMember: async (dto: {
    firstName: string;
    lastName: string;
    email: string;
    acceptTerms: boolean;
    /** Names the routine the account starts with ("Mi rutina"). */
    language?: 'es' | 'en';
  }): Promise<void> => {
    await apiClient.post('/register', dto, { silentErrors: true });
  },

  /** A member a gym or trainer already has asking for their activation link
   *  by the email the business has. Same answer whether or not one was sent. */
  requestActivation: async (email: string): Promise<void> => {
    await apiClient.post(
      '/register/activation',
      { email },
      { silentErrors: true },
    );
  },

  me: async (): Promise<User> => {
    const { data } = await apiClient.get<User>('/auth/me');
    return data;
  },

  /** The welcome email's activation link: who it is for, before the form. */
  validateActivation: async (
    token: string,
  ): Promise<{ valid: boolean; firstName: string; email: string | null }> => {
    const { data } = await apiClient.get<{
      valid: boolean;
      firstName: string;
      email: string | null;
    }>(`/auth/activation/${token}`, { silentErrors: true });
    return data;
  },

  /** Sets the member's own password (claiming the account) and signs in. */
  setPassword: async (
    token: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string }> => {
    const { data } = await apiClient.post<{
      accessToken: string;
      refreshToken: string;
    }>('/auth/set-password', { token, password }, { silentErrors: true });
    return data;
  },
};
