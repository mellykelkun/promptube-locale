export const auditActions = {
  adminBootstrapped: "ADMIN_BOOTSTRAPPED",
  authorizationDenied: "AUTHORIZATION_DENIED",
  loginFailed: "LOGIN_FAILED",
  loginRateLimited: "LOGIN_RATE_LIMITED",
  loginSucceeded: "LOGIN_SUCCEEDED",
  logoutSucceeded: "LOGOUT_SUCCEEDED",
  sessionCreated: "SESSION_CREATED",
  sessionRevoked: "SESSION_REVOKED",
  totpEnabled: "TOTP_ENABLED",
  totpSetupStarted: "TOTP_SETUP_STARTED",
  totpVerificationFailed: "TOTP_VERIFICATION_FAILED",
} as const;

export type AuditAction = (typeof auditActions)[keyof typeof auditActions];

export type AuditOutcome = "failure" | "success";
