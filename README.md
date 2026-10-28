<div align="center">
  <img src="public/app-icons/penge-192-v2.png" width="88" height="88" alt="Penge logo" />

  <h1>Penge<span>.</span></h1>

  <p><strong>A calmer plan for every paycheck.</strong></p>
  <p>Know what your income needs to cover — and what you have left.</p>

  <p>
    <a href="https://github.com/08Robfin/penge/actions/workflows/ci.yml"><img src="https://github.com/08Robfin/penge/actions/workflows/ci.yml/badge.svg" alt="Build and security checks" /></a>
    <img src="https://img.shields.io/badge/Node.js-24-285f43?logo=nodedotjs&logoColor=white" alt="Node.js 24" />
    <img src="https://img.shields.io/badge/PostgreSQL-17-285f43?logo=postgresql&logoColor=white" alt="PostgreSQL 17" />
    <img src="https://img.shields.io/badge/Self--hosted-Docker-285f43?logo=docker&logoColor=white" alt="Docker self-hosting" />
  </p>

  <p>
    <a href="#quick-start">Quick start</a> ·
    <a href="#what-you-can-do">Features</a> ·
    <a href="docs/SELF-HOSTING.md">Self-hosting guide</a> ·
    <a href="SECURITY.md">Security</a>
  </p>
</div>

<br />

<p align="center">
  <img src="docs/screenshots/overview.png" width="1080" alt="Penge overview showing a paycheck budget and upcoming payments using synthetic demo data" />
  <br />
  <sub>Demo account and invented amounts. Every new installation starts with its own empty database.</sub>
</p>

## Your paycheck, with a plan

Penge helps you give each paycheck a purpose: bills, subscriptions, loan payments, savings and everyday spending. Set up the recurring items once, then follow up on what you have paid.

You enter the figures yourself. There is no bank connection and no need to record every individual transaction.

## What you can do

| | |
| --- | --- |
| 💸 **Plan each paycheck**<br />Budget from one payday to the next. Carry money forward only when you choose to. | ✅ **Keep track of payments**<br />Mark individual payments as paid. Pay ahead and choose which paycheck funds them. |
| 🔁 **Manage recurring costs**<br />Bills, subscriptions and minimum loan payments, with dated changes when amounts go up or down. | 🌱 **Make room for savings**<br />Savings accounts, recurring transfers, balance adjustments and purchase plans. |
| 🔒 **Keep budgets separate**<br />Invite-only accounts, private financial APIs and administrator tools for invitations and access. | ✉️ **Stay in touch**<br />Branded invitations and password recovery, plus Markdown newsletters with preview and unsubscribe. |

Also included: light and dark themes, a mobile layout, Home Screen installation, JSON export/import and CSV mapping.

**Current scope:** Norwegian Bokmål interface and NOK. Balances are user-maintained estimates. Penge does not provide bank synchronization, automatic transaction imports, interest/amortization calculations, multi-currency accounting or full offline editing.

## One step at a time

New accounts begin with a focused walkthrough: set your income, add your commitments, then review your budget before saving.

<p align="center">
  <img src="docs/screenshots/onboarding.png" width="900" alt="Full-screen first-time setup asking for a synthetic income amount" />
</p>

## Quick start

You need **Docker Engine + Docker Compose v2**, Git and a Linux server with roughly **2 GB free memory** and enough persistent disk. The app runs Node 24 inside Docker; you do not need to replace your host's Node installation.

### 1. Get the source

```sh
git clone https://github.com/08Robfin/penge.git
cd penge
```

### 2. Create your private configuration

```sh
python3 scripts/create-env.py
```

This creates a mode-600 `.env` with a unique instance name and fresh, independent database and authentication secrets. It refuses to overwrite an existing configuration.

For an HTTPS installation, choose its exact origin on the first run and use this generator command:

```sh
python3 scripts/create-env.py --url https://budget.example.org
```

Alternatively, copy `.env.example` and choose a unique `COMPOSE_PROJECT_NAME` and replace the secret placeholders yourself. Never reuse another installation's secrets or commit your real `.env`.

### 3. Start Penge

```sh
docker compose up -d --build
docker compose ps
```

Open **http://localhost:3000** on the server. The default listener is loopback only. The stack initializes its own PostgreSQL volume and applies migrations before starting the app and mail worker.

### 4. Create your first account

```sh
docker compose run --rm tools run admin -- invite you@example.org
```

Open the printed invitation link privately and register with a unique password. Then grant your account administrator access:

```sh
docker compose run --rm tools run admin -- grant-admin you@example.org
```

Refresh Penge. **Administrasjon** now lets you invite people and manage access.

> The source contains no existing users or budgets, and a fresh installation never connects to the developer's running instance.

## Email that belongs to your instance

Set **`RESEND_API_KEY` or `SMTP_URL`**, plus a verified **`MAIL_FROM`**, in your private configuration. Keep the mail worker running.

- **Invitations** explain Penge and include a personal registration link.
- **Forgot password** sends a short-lived, single-use link for an existing account. It never creates a new account.
- **Newsletters** share the same design, support Markdown and include privacy, operator credit and unsubscribe links.

Without a delivery provider, invitations can be copied manually. Password recovery, verified email changes and newsletter sending require email configuration.

[Email setup and delivery details →](docs/EMAIL.md)

## Your data and your server

Penge stores financial data in your own PostgreSQL database. Public APIs scope financial records to the signed-in account. Passwords use Argon2id, and queued emails are encrypted.

Infrastructure administrators still have technical access to the database. Penge is a hobby project, not a bank or professional financial service. The [security assessment](docs/SECURITY-AUDIT.md) explains what was checked, what was fixed and the remaining limits.

Before inviting real users, configure HTTPS, a suitable privacy notice and encrypted backups with an off-server recovery copy. Newsletter membership currently defaults on; review the consent requirements for your use case.

## Updates and recovery

Back up first, verify your recovery key, and review the migration notes.

```sh
git pull --ff-only
docker compose build
docker compose run --rm tools run migrate
docker compose up -d
```

**Never run `docker compose down -v` on an installation whose data you want to keep.**

GitHub checks and production deployment are separate. No workflow automatically deploys to your server or receives production credentials.

## Find your way

| Guide | What it covers |
| --- | --- |
| [Self-hosting](docs/SELF-HOSTING.md) | HTTPS, networks, persistence and first-time setup |
| [Configuration](docs/CONFIGURATION.md) | Every environment variable and operator branding |
| [Email](docs/EMAIL.md) | Resend/SMTP, templates, delivery and unsubscribe |
| [Backups and recovery](docs/BACKUPS.md) | Encrypted archives and isolated restore verification |
| [Upgrades](docs/UPGRADING.md) | Controlled releases and rollback |
| [Development and tests](docs/DEVELOPMENT.md) | Node 24, isolated fixtures, Git checks and CI |
| [Security assessment](docs/SECURITY-AUDIT.md) | Findings, evidence, limitations and release checklist |
| [Contributing](CONTRIBUTING.md) | Focused changes and review expectations |

<details>
<summary><strong>Troubleshooting</strong></summary>

- **Startup fails:** check that secrets are independent and the application origin is exact. Never paste `.env` into an issue.
- **403 after changing domains:** update `BETTER_AUTH_URL` to the browser's origin, then recreate app/worker containers.
- **Mail stays pending:** check the worker and private provider/sender configuration.
- **Data seems missing:** confirm `COMPOSE_PROJECT_NAME` and the intended existing volume before changing anything.
- **Old Home Screen icon:** refresh the site or reinstall the shortcut.

</details>

## Built with

**Next.js · React · TypeScript · Better Auth · Argon2id · PostgreSQL · Zod · Docker Compose**

CI checks include unit and HTTP tests, strict TypeScript, production builds, dependency auditing, secret scanning, static analysis and container scanning. Screenshots use synthetic data.

## License status

**License selection is pending.** Public visibility does not grant a redistribution license. The owner will select a license separately; third-party dependencies retain their own licenses.
