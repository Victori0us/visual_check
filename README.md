# Visual Check Cheat Sheet

A lightweight visual regression checker using Puppeteer and Pixelmatch.

---


## Installation

```bash
# Clone or go to project folder
cd visual-check

# Install dependencies using Yarn
yarn add puppeteer pngjs pixelmatch sharp chalk dotenv
```

---


### Environment Variables

Create a `.env` file:

```bash
LOGIN_USER=your_username
LOGIN_PASS=your_password
```

---


### Basic usage

```bash
node visual-check.js --connect_template=<template_name> --partner=<true|false>
```

- `--connect_template` (required) — template name (e.g., `partner_budgetbakers`)
- `--partner` — `true` or `false` (decides which screens array to use)

---


### Log in and cookies

On first usage application will log in and record cookies, that will be valid for 12 hours.
After 12 hours cookies should be removed for right the application working

---


### Optional Flags

- `--screen=<screen_name>` — Run only a specific screen.
- `--device=<device_name>` — Run only a specific device. Options:
  - `desktop` (1440x900)
  - `mobile320` (320x580)
  - `mobile375` (360x768)
  - `mobile414` (414x896)

- `--show` — Show the browser window (headless = false).
- `--approve` — Approve changes, update baseline with current screenshot.

---


### Examples

Run all screens for a partner template:

```bash
node visual-check.js --connect_template=partner_budgetbakers --partner=true
```

Run only consent screen on `mobile375`:

```bash
node visual-check.js --connect_template=partner_budgetbakers --partner=true --screen=consent --device=mobile375
```

Show browser while running:

```bash
node visual-check.js --connect_template=partner_budgetbakers --partner=true --show
```

Approve current screenshots as new baseline:

```bash
node visual-check.js --connect_template=partner_budgetbakers --partner=true --approve
```

---


### Output

Screenshots saved in:

`screenshots/<connect_template>/<screen>/<device>/`

Files per folder:

- `baseline.png` — reference image
- `current.png` — latest screenshot
- `diff.png` — highlights differences
- Terminal outputs differences in **red**; no differences in **green**.
- Summary of problematic screens displayed at the end.

---


### Tips:

- Animations are automatically disabled for consistent screenshots.
- Screenshots are resized to match baseline if sizes differ.
- Use `--screen` and `--device` to quickly test specific cases.
