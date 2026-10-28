# Deployment

Use SELF-HOSTING.md for new instances and UPGRADING.md for changes. Deployment follows source validation, a restorable private backup and a rollback plan.

Existing installations may use ignored compose.production.yml with COMPOSE_FILE in private .env. Do not assume another operator's paths, volume or proxy network.

GitHub synchronization and deployment are separate. CI has no production credentials or SSH deployment. Never restart Docker globally, prune unrelated resources or modify another installation's data.
