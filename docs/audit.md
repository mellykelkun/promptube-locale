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

Événements catalogue :

- `CATALOG_CATEGORY_CREATED`, `CATALOG_CATEGORY_UPDATED`, `CATALOG_CATEGORY_ARCHIVED`,
  `CATALOG_CATEGORY_RESTORED` ;
- `CATALOG_SUBCATEGORY_CREATED`, `CATALOG_SUBCATEGORY_UPDATED`, `CATALOG_SUBCATEGORY_ARCHIVED`,
  `CATALOG_SUBCATEGORY_RESTORED` ;
- `CATALOG_MODULE_CREATED`, `CATALOG_MODULE_UPDATED`, `CATALOG_MODULE_ARCHIVED`,
  `CATALOG_MODULE_RESTORED` ;
- `CATALOG_VERSION_CREATED`, `CATALOG_VERSION_UPDATED`, `CATALOG_VERSION_SUBMITTED`,
  `CATALOG_VERSION_RETURNED_TO_DRAFT`, `CATALOG_VERSION_APPROVED`, `CATALOG_VERSION_SUPERSEDED` ;
- `CATALOG_CONFLICT_DETECTED` ;
- `CATALOG_AUTHORIZATION_DENIED`.

Les conflits de révision sont audités après rollback de la transaction échouée afin que l’événement
persiste sans laisser passer la mutation concurrente.

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
- contenu Markdown complet ;
- description catalogue complète ;
- clé ou contenu de backup.
