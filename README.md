<div align="center">
  <img src="public/app-icons/penge-192-v2.png" width="88" height="88" alt="Penge logo" />

  <h1>Penge<span>.</span></h1>

  <p><strong>A calmer plan for every paycheck.</strong></p>
  <p>Version 1.0 · Released 28 October 2026 · MIT</p>
  <p>Know what your income needs to cover — and what you have left.</p>

  <p>
    <a href="https://github.com/08Robfin/penge/actions/workflows/ci.yml"><img src="https://github.com/08Robfin/penge/actions/workflows/ci.yml/badge.svg" alt="Automated checks" /></a>
    <img src="https://img.shields.io/badge/Node.js-24-285f43?logo=nodedotjs&logoColor=white" alt="Node.js 24" />
    <img src="https://img.shields.io/badge/PostgreSQL-17-285f43?logo=postgresql&logoColor=white" alt="PostgreSQL 17" />
    <img src="https://img.shields.io/badge/Self--hosted-Docker-285f43?logo=docker&logoColor=white" alt="Docker self-hosting" />
  </p>

  <p>
    <a href="#quick-start">Quick start</a> ·
    <a href="#what-you-can-do">Features</a> ·
    <a href="docs/SELF-HOSTING.md">Self-hosting guide</a> ·
    <a href="docs/SECURITY-AUDIT.md">Testing and limitations</a>
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

Infrastructure administrators still have technical access to the database. Penge is a hobby project, not a bank or professional financial service. It has had limited internal and automated testing, not a professional security audit or independent penetration test. There is no guarantee that it is secure, correct or suitable for your data; use it at your own risk. See [testing and limitations](docs/SECURITY-AUDIT.md).

Before inviting real users, configure HTTPS, a suitable privacy notice and encrypted backups with an off-server recovery copy. Newsletter membership currently defaults on; review the consent requirements for your use case.

## Version 1.0

This repository is the released **1.0 source snapshot**. The author's running server may change independently. Day-to-day server changes are not automatically synchronized here, and no further releases or maintenance are promised. A future version, such as 1.1, will be published only if the owner chooses to do so.

GitHub does not deploy to the server and holds no production credentials. Scheduled dependency-update pull requests are disabled. Anyone may use or modify this version under MIT.

For a deliberate future upgrade, see the [upgrade and rollback guide](docs/UPGRADING.md). **Never run `docker compose down -v` on an installation whose data you want to keep.**

## Find your way

| Guide | What it covers |
| --- | --- |
| [Self-hosting](docs/SELF-HOSTING.md) | HTTPS, networks, persistence and first-time setup |
| [Configuration](docs/CONFIGURATION.md) | Every environment variable and operator branding |
| [Email](docs/EMAIL.md) | Resend/SMTP, templates, delivery and unsubscribe |
| [Backups and recovery](docs/BACKUPS.md) | Encrypted archives and isolated restore verification |
| [Upgrades](docs/UPGRADING.md) | Controlled releases and rollback |
| [Development and tests](docs/DEVELOPMENT.md) | Node 24, isolated fixtures, Git checks and CI |
| [Testing and limitations](docs/SECURITY-AUDIT.md) | What was checked and what is not guaranteed |
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

Automated checks cover tests, types, builds, dependencies, secret patterns, source and container images. These are limited checks, not security certification. Screenshots use synthetic data.

## License

[MIT](LICENSE) — use, self-host, modify and share Penge, including commercially. Preserve the copyright and license notice. The Robfin.no service credit remains in the app; MIT does not require a visible UI credit. Third-party dependencies retain their own licenses.
