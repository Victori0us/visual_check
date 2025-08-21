# Visual Regression Checker

This tool automates **screenshot capture** and **visual regression testing** for SaltEdge Connect templates using Puppeteer, with support for multiple environments, modes, themes, and cookie-based sessions.

---

## Features

- 🚀 Automated **screenshot capture** with Puppeteer.
- 🖥️ Predefined device sizes (desktop, mobile320, mobile360, mobile414).
- 🌐 Supports environments:
  - localhost → http://localhost:5000
  - staging → https://www.banksalt.com
  - production → https://www.saltedge.com
- 🍪 Cookies saved per environment (/cookies/{env}.json) to keep sessions alive.
- 🎨 Theme support (--theme=light / dark).
- 👥 Mode support: --mode=partner (default) or --mode=client.
- 🖼️ Image diffing with pixelmatch.
- ✅ Approval mode (--approve) to update baselines.
- 🔍 Stops animations for consistent screenshots.


## Installation

```bash
git clone <repo-url>
cd visual-check
npm install
```

---


### Setup

1. Create an `.env` file in the project root:

```bash
LOGIN_USER=your_username
LOGIN_PASS=your_password
```

2. Make sure you have a `cookies/` folder:

```bash
mkdir cookies
```

On first usage application will log in and record cookies, that will be valid for 12 hours.
After 12 hours cookies should be removed for right the application working

Cookies will be stored per environment (`cookies/localhost.json`, `cookies/staging.json`, `cookies/production.json`).

---


### Usage

Run the tool with:

```bash
node visual-check.js --connect_template=<template> [options]
```

---


### Options

| Option                                       | Description                                                     |
| -------------------------------------------- | --------------------------------------------------------------- |
| `--connect_template=...`                     | (Required) Connect template name.                               |
| `--mode=partner` / `client`                  | Mode for testing (default: `partner`).                          |
| `--env=localhost` / `staging` / `production` | Target environment (default: `localhost`).                      |
| `--screen=consent`                           | Run only a specific screen (default: all screens for the mode). |
| `--device=mobile360`                         | Run only for a specific device (default: all devices).          |
| `--theme=dark`                               | Theme selection (default: `light`).                             |
| `--approve`                                  | Approve changes: update baseline and reset diff.                |
| `--show`                                     | Run Puppeteer with visible browser window.                      |


### Examples

Run full check for `partner mode` in `localhost`:

```bash
node visual-check.js --connect_template=partner_default_fino
```

Run a single screen with specific device:

```bash
node visual-check.js --connect_template=partner_default_fino --screen=consent --device=mobile360
```

Run in `staging environment` with dark theme:

```bash
node visual-check.js --connect_template=partner_default_fino --env=staging --theme=dark
```

Show browser while running:

```bash
node visual-check.js --connect_template=partner_default_fino --partner=true --show
```

Approve new baseline after design changes:

```bash
node visual-check.js --connect_template=partner_default_fino --screen=consent --approve
```

---


### Outputs

Screenshots and diffs are stored under:

```
screenshots/
  └── <connect_template>/
      └── <screen>/
          └── <device>/
              ├── baseline.png   # Approved baseline
              ├── current.png    # Latest screenshot
              └── diff.png       # Differences
```

---

### Workflow

1. Run the script → compares current screenshots against baseline.
2. If differences are detected → diff.png highlights mismatches.
3. If design changes are valid → rerun with --approve to update baselines.
4. Cookies are reused for 12h per environment.


### Roadmap / Ideas

- Support for batch testing multiple templates.
- Slack/GitHub Actions integration for CI pipelines.
- Enhanced reporting (HTML/PDF summary).

---

### Tips:

- Animations are automatically disabled for consistent screenshots.
- Screenshots are resized to match baseline if sizes differ.
- Use `--screen` and `--device` to quickly test specific cases.
