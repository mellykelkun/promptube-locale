# Audit local admin

Le journal `admin_audit_events` conserve les événements d’authentification, d’autorisation et
d’exploitation sensibles. Il est en lecture seule dans l’interface admin actuelle.

Événements auth principaux :

- `ADMIN_BOOTSTRAPPED` ;
- `LOGIN_SUCCEEDED` ;
- `LOGIN_FAILED` ;
- `LOGIN_RATE_LIMITED` ;
- `TOTP_SETUP_STARTED` ;
- `TOTP_ENABLED` ;
- `TOTP_VERIFICATION_FAILED` ;
- `SESSION_CREATED` ;
- `SESSION_REVOKED` ;
- `LOGOUT_SUCCEEDED` ;
- `AUTHORIZATION_DENIED`.

Événements opérationnels :

- `BACKUP_CREATED` ;
- `BACKUP_VERIFIED` ;
- `RESTORE_TEST_SUCCEEDED` ;
- `RESTORE_TEST_FAILED` ;
- `SECRET_ROTATION_STARTED` ;
- `SECRET_ROTATION_SUCCEEDED` ;
- `SECRET_ROTATION_FAILED`.

Interdits dans l’audit :

- mot de passe ;
- hash Argon2 ;
- cookie ;
- token ;
- Authorization ;
- secret Better Auth ;
- secret TOTP ou URI TOTP ;
- code TOTP ;
- code de secours ;
- clé ou contenu de backup.
