export const auditActions = {
  adminBootstrapped: "ADMIN_BOOTSTRAPPED",
  authorizationDenied: "AUTHORIZATION_DENIED",
  backupCreated: "BACKUP_CREATED",
  backupVerified: "BACKUP_VERIFIED",
  loginFailed: "LOGIN_FAILED",
  loginRateLimited: "LOGIN_RATE_LIMITED",
  loginSucceeded: "LOGIN_SUCCEEDED",
  logoutSucceeded: "LOGOUT_SUCCEEDED",
  sessionCreated: "SESSION_CREATED",
  sessionRevoked: "SESSION_REVOKED",
  restoreTestFailed: "RESTORE_TEST_FAILED",
  restoreTestSucceeded: "RESTORE_TEST_SUCCEEDED",
  secretRotationFailed: "SECRET_ROTATION_FAILED",
  secretRotationStarted: "SECRET_ROTATION_STARTED",
  secretRotationSucceeded: "SECRET_ROTATION_SUCCEEDED",
  totpEnabled: "TOTP_ENABLED",
  totpSetupStarted: "TOTP_SETUP_STARTED",
  totpVerificationFailed: "TOTP_VERIFICATION_FAILED",
} as const;

export type AuditAction = (typeof auditActions)[keyof typeof auditActions];

export type AuditOutcome = "failure" | "success";
