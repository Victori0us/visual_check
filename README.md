# Visual Regression Checker

This tool automates **visual regression testing** for Salt Edge Connect flows (AIS / PIS).
It uses **Puppeteer** for screenshots and **pixelmatch** for detecting UI changes across environments.

---

## Features

- **Environments**:
  - `localhost` → `http://localhost:5000`
  - `staging` → `https://www.banksalt.com`
  - `production` → `https://www.saltedge.com`

- **Modes**:
  - `partner` (default)
  - `client`

- **Flows**:
  - `ais` → `/admin/previews/connect/frame`
  - `pis` → `/admin/previews/payments_connect/frame`

- **Themes**:
  - `light` (default)
  - `dark`

- **Devices**:
  - `desktop` (1440×900)
  - `mobile320` (320×580)
  - `mobile360` (360×768)
  - `mobile414` (414×896)

- **Screens**:
  - `partner` supports extended screens (`gdpr_warning`, `override`, `confirmation`, etc.)
  - `client` supports slightly fewer screens

- **Screenshots storage structure**:

```
screenshots/
  ais/
    partner_default/
      search/
        desktop/
          baseline.png
          current.png
          diff.png
    partner_default_dark/
      consent/
        mobile414/
          baseline.png
          current.png
          diff.png
  pis/
    partner_payment_default/
      init_error/
        mobile360/
          baseline.png
          current.png
          diff.png
```

- **Cookie persistence per environment** → stored in `cookies/{env}.json` (valid ~12h).
- **Diff logic**:
- If no baseline → baseline is created.
- If differences → `diff.png` highlights them.
- If identical → `diff.png` is written with opacity `0.5` to confirm run.

---


### Setup

1. Clone repo and install dependencies:

```bash
git clone <repo-url>
cd visual-check
npm install
```

2. Create `.env` file(s) in project root with credentials:

```bash
# Localhost login
LOCALHOST_LOGIN_USER="admin@example.com"
LOCALHOST_LOGIN_PASS="yourpassword"

# Staging login
STAGING_LOGIN_USER="user@example.com"
STAGING_LOGIN_PASS="yourpassword"

# Production login
PRODUCTION_LOGIN_USER="user@example.com"
PRODUCTION_LOGIN_PASS="yourpassword"

```
⚠️ If your password contains special characters ($, &, !, etc.), wrap it in quotes.

3. Make sure the `cookies/` folder exists:

```bash
mkdir cookies
```

On first usage application will log in and record cookies, that will be valid for 12 hours.
After 12 hours cookies should be removed for right the application working

Cookies will be stored per environment (`cookies/localhost.json`, `cookies/staging.json`, `cookies/production.json`).

---


## USAGE

### Basic command

```bash
node visual-check.js --connect_template=<template> [options]
```

---


### CLI Options

| Option               | Description                                              | Default     |
| -------------------- | -------------------------------------------------------- | ----------- |
| `--connect_template` | Required. The template name (e.g., `partner_lendex`)     | —           |
| `--screen`           | Screen to test (e.g., `init_error`, `search`)            | all screens |
| `--mode`             | Mode: `partner`, `client`                                | `partner`   |
| `--env`              | Environment: `localhost`, `staging`, `production`        | `localhost` |
| `--flow`             | Flow: `ais`, `pis`                                       | `ais`       |
| `--theme`            | Theme: `light`, `dark`                                   | `light`     |
| `--device`           | Device: `desktop`, `mobile320`, `mobile360`, `mobile414` | all devices |
| `--show`             | Show browser (disable headless)                          | hidden      |
| `--approve`          | Approve current → overwrite baseline                     | false       |

---


### Examples

1. Run against **localhost**, AIS flow, partner mode:

```bash
node visual-check.js --connect_template=partner_default_fino
```

2. Run against **staging**, dark theme, mobile414:

```bash
node visual-check.js --connect_template=partner_default --screen=consent --theme=dark --device=mobile414 --env=staging
```

Run **PIS flow** for production:

```bash
node visual-check.js --connect_template=partner_lendex --flow=pis  --screen=init_error --env=production

```

Show browser while debugging:

```bash
node visual-check.js --connect_template=partner_default_fino --screen=kyc_standard --show

```

Approve new baseline after design changes:

```bash
node visual-check.js --connect_template=partner_default_fino --screen=consent --approve
```

---

### Notes

- Baselines live inside `screenshots/` and should be committed to VCS.
- Use `--approve` when differences are **expected** and should become the new baseline.
- Cookies are stored per environment in `cookies/ENV.json` (expire after 12h).
- Identical screenshots still produce a `diff.png` with **opacity 0.5** (so you know it was checked).
- Use `--screen` and `--device` to quickly test specific cases.
