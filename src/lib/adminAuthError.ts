export function adminAuthError(error: unknown): string {
  const auth = error as { code?: string; status?: number; message?: string; name?: string } | null
  switch (auth?.code) {
    case 'invalid_credentials':
      return 'Email or password is incorrect. Use the password created for this Supabase account, or choose Forgot password to reset it.'
    case 'email_not_confirmed':
      return 'Your email is not confirmed. Open the confirmation email before signing in, or confirm the user in Supabase Authentication.'
    case 'user_banned':
      return 'This account is disabled. Contact the store owner.'
    case 'email_provider_disabled':
      return 'Email sign-in is disabled for this project. Enable it in Supabase Authentication settings.'
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Too many attempts. Wait a few minutes before trying again.'
    case 'weak_password':
      return 'Choose a stronger password that meets the project password requirements.'
    case 'same_password':
      return 'Choose a new password different from your current password.'
  }
  if (auth?.status === 429) return 'Too many attempts. Wait a few minutes before trying again.'
  if (auth?.name === 'AuthRetryableFetchError' || /fetch|network/i.test(auth?.message || ''))
    return 'Cannot reach the sign-in service. Check your connection and try again.'
  if (/invalid login credentials/i.test(auth?.message || ''))
    return 'Email or password is incorrect. Use Forgot password if you need to reset it.'
  if ((auth?.status || 0) >= 500) return 'The authentication service is unavailable. Try again shortly.'
  return 'Sign-in could not be completed. Check the Supabase authentication settings or try resetting your password.'
}
