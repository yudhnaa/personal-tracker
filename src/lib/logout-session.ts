export type LogoutSessionResolution<T> =
  | { ended: true }
  | { ended: false; error: unknown; account?: T };

export async function resolveLogoutSession<T>(
  logout: () => Promise<unknown>,
  currentAccount: () => Promise<T>,
  isUnauthenticated: (error: unknown) => boolean,
): Promise<LogoutSessionResolution<T>> {
  try {
    await logout();
    return { ended: true };
  } catch (logoutError) {
    try {
      const account = await currentAccount();
      return { ended: false, error: logoutError, account };
    } catch (sessionError) {
      return isUnauthenticated(sessionError)
        ? { ended: true }
        : { ended: false, error: sessionError };
    }
  }
}
