import type { SupabaseClient } from '@supabase/supabase-js';
import { withAuthTimeout } from './auth';

export class RecoveryError extends Error {}
export type RecoveryCallback = { code: string; flowId?: string };

const CALLBACK_FIELDS = ['code', 'sb_flow_id', 'error', 'error_code', 'access_token', 'refresh_token'] as const;
type CallbackParams = Record<string, string | string[] | undefined>;

// Expo Go/router versions may expose callback values differently. Read the original
// reset URL too, but never use an unrelated cached launch URL or override conflicts.
export function recoveryCallbackParams(params: CallbackParams, rawUrl?: string | null): CallbackParams {
  const result: CallbackParams = {};
  for (const field of CALLBACK_FIELDS) if (params[field] !== undefined) result[field] = params[field];
  if (!rawUrl) return result;
  let url: URL;
  try { url = new URL(rawUrl); } catch { return result; }
  const path = url.protocol === 'motorrentalexpo:' ? `/${url.hostname}${url.pathname}` : url.pathname;
  if (!/\/auth\/reset-password\/?$/.test(path)) return result;
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
  for (const field of CALLBACK_FIELDS) {
    const values = [...url.searchParams.getAll(field), ...fragment.getAll(field)];
    if (!values.length) continue;
    const routed = result[field];
    result[field] = values.length !== 1 || (routed !== undefined && routed !== values[0])
      ? [...values, ...(typeof routed === 'string' ? [routed] : [])]
      : values[0];
  }
  return result;
}

export function recoveryCallbackDiagnostic(params: CallbackParams): string {
  // Field names only: never display or log recovery codes, tokens, or the full URL.
  const fields = CALLBACK_FIELDS.filter(field => params[field] !== undefined);
  return `Callback fields: ${fields.join(', ') || 'none'}`;
}

export function parseRecoveryCallback(params: CallbackParams): RecoveryCallback {
  if (params.error || params.error_code) {
    throw new RecoveryError('Supabase could not verify this email link. It may be expired or already used. Request a new link.');
  }
  if (params.access_token !== undefined || params.refresh_token !== undefined) {
    throw new RecoveryError('This link uses an older recovery format. Request a new link from this app to continue securely.');
  }
  if (params.code === undefined || params.code === '') {
    throw new RecoveryError('The app opened without a password-reset verification code. Request a new link and check the reset email template uses the Supabase confirmation link.');
  }
  if (typeof params.code !== 'string' || !params.code.trim() ||
      (params.sb_flow_id !== undefined && (typeof params.sb_flow_id !== 'string' || !params.sb_flow_id.trim()))) {
    throw new RecoveryError('This reset link contains invalid verification details. Request a new link.');
  }
  return { code: params.code, flowId: params.sb_flow_id as string | undefined };
}

export function validateNewPassword(password: string, confirmation: string): void {
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new RecoveryError('Use at least 8 characters, including one letter and one number.');
  }
  if (password !== confirmation) throw new RecoveryError('Enter the same new password in both fields.');
}

export function recoveryErrorMessage(error: unknown): string {
  if (error instanceof RecoveryError) return error.message;
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  if (['otp_expired', 'flow_state_expired', 'flow_state_not_found', 'bad_code_verifier', 'pkce_verifier_not_found', 'session_not_found', 'refresh_token_not_found'].includes(String(code))) {
    return 'This link has expired, was already used, or was opened on a different device. Request a new reset link.';
  }
  if (code === 'same_password') return 'Choose a password different from your current password.';
  if (code === 'weak_password') return 'Choose a stronger password and try again.';
  if (['over_email_send_rate_limit', 'over_request_rate_limit'].includes(String(code))) return 'Please wait a moment before trying again.';
  return 'We could not complete this request. Check your connection and try again.';
}

type RecoveryState = { verifiedUserId: string | null; codeKey: string | null; exchange: Promise<void> | null };
const states = new WeakMap<SupabaseClient, RecoveryState>();

export function createPasswordRecoveryService(client: SupabaseClient) {
  let state = states.get(client);
  if (!state) { state = { verifiedUserId: null, codeKey: null, exchange: null }; states.set(client, state); }
  const current = state;
  return {
    async request(email: string, redirectTo: string): Promise<void> {
      const normalized = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new RecoveryError('Enter a valid email address.');
      const url = new URL(redirectTo);
      if (!['https:', 'http:', 'exp:', 'exps:', 'motorrentalexpo:'].includes(url.protocol) || url.username || url.password || url.hash) {
        throw new RecoveryError('The password recovery return address is not configured correctly.');
      }
      current.verifiedUserId = null; current.codeKey = null; current.exchange = null;
      const { error } = await withAuthTimeout(client.auth.resetPasswordForEmail(normalized, { redirectTo }));
      if (error) throw error;
      // Supabase deliberately does not disclose whether this address has an account.
    },
    exchange(callback: RecoveryCallback): Promise<void> {
      const key = JSON.stringify([callback.code, callback.flowId ?? null]);
      if (current.codeKey === key && current.exchange) return current.exchange;
      if (current.exchange && !current.verifiedUserId) {
        return Promise.reject(new RecoveryError('A reset link is already being checked. Please wait, or request a new link.'));
      }
      current.verifiedUserId = null;
      current.codeKey = key;
      current.exchange = (async () => {
        const { data, error } = await withAuthTimeout(client.auth.exchangeCodeForSession(callback.code,
          callback.flowId ? { flowId: callback.flowId } : undefined));
        if (error) throw error;
        // The installed Supabase SDK returns the verifier's stored flow type. A URL
        // parameter or a pre-existing normal session is not recovery authorization.
        const redirectType = 'redirectType' in data ? data.redirectType : undefined;
        if (!data.session || redirectType !== 'recovery') throw new RecoveryError('This is not a valid password recovery link. Request a new reset link.');
        current.verifiedUserId = data.session.user.id;
      })().catch(error => { current.codeKey = null; current.exchange = null; throw error; });
      return current.exchange;
    },
    async updatePassword(password: string, confirmation: string): Promise<void> {
      validateNewPassword(password, confirmation);
      if (!current.verifiedUserId) throw new RecoveryError('Open a valid reset link before setting a new password.');
      const { data, error: identityError } = await withAuthTimeout(client.auth.getUser());
      if (identityError) throw identityError;
      if (!data.user || data.user.id !== current.verifiedUserId) {
        current.verifiedUserId = null;
        throw new RecoveryError('Your recovery session changed. Request a new reset link.');
      }
      const { error } = await withAuthTimeout(client.auth.updateUser({ password }));
      if (error) throw error;
      current.verifiedUserId = null;
    },
    async finish(): Promise<void> {
      const { error } = await withAuthTimeout(client.auth.signOut({ scope: 'global' }));
      if (error) throw error;
      current.verifiedUserId = null; current.exchange = null; current.codeKey = null;
    },
    async cancel(): Promise<void> {
      current.verifiedUserId = null; current.exchange = null; current.codeKey = null;
      const { error } = await withAuthTimeout(client.auth.signOut({ scope: 'local' }));
      if (error) throw error;
    },
  };
}
