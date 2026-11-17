import type { Session, SupabaseClient } from '@supabase/supabase-js';

export type AuthUser = { id: string; fullName: string; email: string; role: 'client' | 'admin' };

export function withAuthTimeout<T>(operation: PromiseLike<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The connection took too long. Please try again.')), 20_000);
    Promise.resolve(operation).then(
      value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); },
    );
  });
}

export function authErrorMessage(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  switch (code) {
    case 'invalid_credentials': return 'The email or password is incorrect.';
    case 'email_not_confirmed': return 'Confirm your email first, then return here to log in.';
    case 'user_already_exists': case 'email_exists': return 'An account with this email already exists. Please log in.';
    case 'over_email_send_rate_limit': case 'over_request_rate_limit': return 'Too many attempts. Please wait a moment and try again.';
    case 'signup_disabled': return 'Registration is currently unavailable. Please try again later.';
    case 'weak_password': return 'Choose a stronger password and try again.';
    default: return 'We could not connect to your account. Check your connection and try again.';
  }
}

export function createAuthService(client: SupabaseClient) {
  return {
    async signIn(email: string, password: string) {
      const { error } = await withAuthTimeout(client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password }));
      if (error) throw error;
    },
    async register(fullName: string, email: string, password: string) {
      const { data, error } = await withAuthTimeout(client.auth.signUp({
        email: email.trim().toLowerCase(), password,
        options: { data: { full_name: fullName.trim() } },
      }));
      if (error) throw error;
      return { needsEmailConfirmation: !data.session };
    },
    async loadUser(session: Session): Promise<AuthUser> {
      // Validate the stored identity with Auth before loading backend-controlled roles.
      const { data: identity, error: identityError } = await withAuthTimeout(client.auth.getUser());
      if (identityError) throw identityError;
      if (!identity.user || identity.user.id !== session.user.id) throw new Error('Your session changed. Please log in again.');
      const [{ data: profile, error: profileError }, { data: role, error: roleError }] = await Promise.all([
        withAuthTimeout(client.from('profiles').select('full_name').eq('id', identity.user.id).single()),
        withAuthTimeout(client.from('user_roles').select('role').eq('user_id', identity.user.id).single()),
      ]);
      if (profileError) throw profileError;
      if (roleError) throw roleError;
      if (!profile || typeof profile.full_name !== 'string' || !role || !['client', 'admin'].includes(role.role)) {
        throw new Error('Account setup is incomplete. Please contact the rental shop.');
      }
      return { id: identity.user.id, fullName: profile.full_name, email: identity.user.email ?? '', role: role.role };
    },
  };
}
