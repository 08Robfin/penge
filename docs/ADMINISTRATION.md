# Administration
Create the initial invitation and administrator grant using the local tools CLI as described in README. No administrator role is accepted from signup or budget payloads.
Administrators can invite/revoke, disable/enable and delete ordinary accounts, manage newsletter membership and prepare campaigns. They do not receive financial exports for other users. Disabling revokes sessions; account deletion requires administrator-password and target-email confirmation. Administrator accounts are protected against removal through this interface.
Audit events record action and target, never passwords or invitation tokens. Protect the database containing this private account metadata.
