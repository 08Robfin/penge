# Deployment
Use SELF-HOSTING.md for a new instance and UPGRADING.md for changes. Deployment follows source validation, a restorable backup and a rollback plan.

Operators may keep deployment-specific overrides and configuration outside version control. Read those trusted local instructions before changing a running installation.

GitHub synchronization and deployment are separate. CI has no production credentials or SSH deployment. Never restart Docker globally, prune unrelated resources or modify another installation's data.
