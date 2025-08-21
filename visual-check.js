import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import "dotenv/config";
import { fileURLToPath } from "url";
import chalk from "chalk";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Predefined screens for partner true/false
const SCREENS_PARTNER_TRUE = [
  "search",
  "credentials",
  "provider_and_consent_skipped",
  "consent",
  "override",
  "stage",
  "interactive_app_redirect",
  "interactive_otp",
  "interactive_captcha",
  "interactive_checkboxes",
  "interactive_with_optional",
  "success",
  "errors",
  "init_error",
  "gdpr_warning",
  "kyc_simplified",
  "kyc_standard",
];

const SCREENS_PARTNER_FALSE = [
  "search",
  "credentials",
  "provider_and_consent_skipped",
  "consent",
  "override",
  "stage",
  "interactive_app_redirect",
  "interactive_otp",
  "interactive_captcha",
  "interactive_checkboxes",
  "interactive_with_optional",
  "success",
  "errors",
  "init_error",
];

// Device sizes
const DEVICE_SIZES = {
  desktop: { width: 1440, height: 900 },
  mobile320: { width: 320, height: 580 },
  mobile360: { width: 360, height: 768 },
  mobile414: { width: 414, height: 896 },
};

// Environment URLs
const ENV_URLS = {
  localhost: "http://localhost:5000",
  staging: "https://www.banksalt.com",
  production: "https://www.saltedge.com"
};

// Default theme
const DEFAULT_THEME = "light";

const BASE_PATH = "/admin/previews/connect/frame?customization=off&locale=en&mode=all";

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const params = { env: "localhost", theme: DEFAULT_THEME };

  for (const arg of args) {
    if (arg.startsWith("--connect_template=")) {
      params.connect_template = arg.split("=")[1];
    } else if (arg.startsWith("--partner=")) {
      params.partner = arg.split("=")[1] === "true";
    } else if (arg.startsWith("--screen=")) {
      params.screen = arg.split("=")[1];
    } else if (arg.startsWith("--device=")) {
      params.device = arg.split("=")[1];
    } else if (arg.startsWith("--theme=")) {
      params.theme = arg.split("=")[1];
    } else if (arg.startsWith("--env=")) {
      const value = arg.split("=")[1];
      if (ENV_URLS[value]) {
        params.env = value;
      } else {
        console.warn(`⚠️ Unknown env "${value}", defaulting to localhost`);
      }
    } else if (arg === "--show") {
      params.showBrowser = true;
    } else if (arg === "--approve") {
      params.approve = true;
    }
  }

  return params;
}

// Storage paths
function getStoragePaths(connectTemplate, screen, device) {
  const baseFolder = path.join(
    __dirname,
    "screenshots",
    connectTemplate,
    screen,
    device
  );

  if (!fs.existsSync(baseFolder)) {
    fs.mkdirSync(baseFolder, { recursive: true });
  }

  return {
    baseline: path.join(baseFolder, "baseline.png"),
    current: path.join(baseFolder, "current.png"),
    diff: path.join(baseFolder, "diff.png")
  };
}

// Cookie file per environment
function getCookiePath(env) {
  return path.join(__dirname, "cookies", `${env}.json`);
}

// Login
async function login(page, env) {
  const cookieFile = getCookiePath(env);

  // Load cookies if exist
  if (fs.existsSync(cookieFile)) {
    const cookies = JSON.parse(fs.readFileSync(cookieFile, "utf-8"));
    await page.setCookie(...cookies);
    console.log(chalk.green(`✅ Loaded cookies for ${env} environment`));
    return;
  }

  // Otherwise perform login
  const emailInput = env === "localhost" ? "#admin_email" : "#user_email"
  const passwordInput = env === "localhost" ? "#admin_password" : "#user_password"
  const buttonSubmit = env == "localhost" ? ".admin-log-in-button" : ".btn-default"

  const loginUrl = env == "localhost" ? `${ENV_URLS[env]}/admins/sign_in/` : `${ENV_URLS[env]}/admin/dashboard`
  await page.goto(loginUrl, { waitUntil: "networkidle0" });
  await page.type(emailInput, process.env.LOGIN_USER);
  await page.type(passwordInput, process.env.LOGIN_PASS);

  await Promise.all([
    page.click(buttonSubmit),
    page.waitForNavigation({ waitUntil: "networkidle0" })
  ]);

  if (env !== "localhost") {
    await page.waitForSelector(".dashboards", { visible: true });
  }
  console.log(chalk.green("✅ Logged in successfully"));

  // Save cookies
  const cookies = await page.cookies();
  cookies.forEach(cookie => {
    cookie.expires = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 hours
  });

  fs.writeFileSync(cookieFile, JSON.stringify(cookies, null, 2));
  console.log(chalk.green(`✅ Cookies saved for ${env} environment`));
}

// Stop all animations on the page
async function stopAnimations(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
      }
      svg * {
        animation: none !important;
        transition: none !important;
      }
    `,
  });
}

// Capture screenshot
async function captureScreenshot(url, path, page, viewport) {
  await page.setViewport(viewport);
  await page.goto(url, { waitUntil: "networkidle0" });
  await stopAnimations(page);
  await page.screenshot({ path, fullPage: true });
}

// Resize current image to baseline size if mismatch
async function normalizeImageSize(currentPath, width, height) {
  const buffer = await sharp(currentPath)
    .resize(width, height, { fit: "contain" })
    .toBuffer();

  await fs.promises.writeFile(currentPath, buffer);
}

// Compare images
async function compareImages(paths, approve = false) {
  if (!fs.existsSync(paths.baseline)) {
    console.log(chalk.yellow("📸 No baseline found — creating one..."));
    fs.copyFileSync(paths.current, paths.baseline);
    return { changed: false, message: "Baseline created." };
  }

  const img1 = PNG.sync.read(fs.readFileSync(paths.baseline));
  let img2 = PNG.sync.read(fs.readFileSync(paths.current));

  if (img1.width !== img2.width || img1.height !== img2.height) {
    console.log(chalk.yellow("⚠️ Image sizes differ — resizing current image..."));
    await normalizeImageSize(paths.current, img1.width, img1.height);
    img2 = PNG.sync.read(fs.readFileSync(paths.current));
  }

  const { width, height } = img1;
  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(
    img1.data,
    img2.data,
    diff.data,
    width,
    height,
    { threshold: 0.1 }
  );

  fs.writeFileSync(paths.diff, PNG.sync.write(diff));

  const changed = numDiffPixels > 100;

  if (!changed && approve) {
    // approved mode, overwrite baseline and update diff.png with opacity 0.5
    fs.copyFileSync(paths.current, paths.baseline);

    const imgTransparent = new PNG({ width, height });
    for (let i = 0; i < img2.data.length; i += 4) {
      imgTransparent.data[i] = img2.data[i];
      imgTransparent.data[i + 1] = img2.data[i + 1];
      imgTransparent.data[i + 2] = img2.data[i + 2];
      imgTransparent.data[i + 3] = 128; // opacity 0.5
    }
    fs.writeFileSync(paths.diff, PNG.sync.write(imgTransparent));
  }

  return { changed, diffPixels: numDiffPixels };
}

// Main execution
(async () => {
  const {
    connect_template,
    partner,
    screen: onlyScreen,
    device: onlyDevice,
    env,
    theme,
    showBrowser,
    approve,
  } = parseArgs();

  if (!connect_template) {
    console.error(chalk.red("❌ Please provide --connect_template=…"));
    process.exit(1);
  }

  const screens = onlyScreen
    ? [onlyScreen]
    : partner
      ? SCREENS_PARTNER_TRUE
      : SCREENS_PARTNER_FALSE;

  const devices = onlyDevice ? [onlyDevice] : Object.keys(DEVICE_SIZES);

  const browser = await puppeteer.launch({
    headless: !showBrowser,
    defaultViewport: DEVICE_SIZES.desktop,
  });

  const page = await browser.newPage();
  await login(page, env);

  const diffResults = [];

  for (const screen of screens) {
    for (const device of devices) {
      const viewport = DEVICE_SIZES[device];

      if (!viewport) {
        console.error(chalk.red(`❌ Unknown device: ${device}`));
        continue;
      }

      const url = `${ENV_URLS[env]}${BASE_PATH}&theme=${theme}&connect_template=${connect_template}&screen=${screen}`;
      const paths = getStoragePaths(connect_template, screen, device);

      console.log(
        chalk.blue(`\n🔍 Checking: ${connect_template} / ${screen} / ${device} / theme=${theme} (${viewport.width}x${viewport.height})`)
      );

      await captureScreenshot(url, paths.current, page, viewport);

      if (approve) {
        fs.copyFileSync(paths.current, paths.baseline);
        console.log(chalk.green("✅ Changes approved — baseline updated."));

        // Generate a blank diff after approval
        await compareImages(paths);
        continue;
      }

      try {
        const result = await compareImages(paths);

        if (result.changed) {
          console.log(chalk.red(`❌ Design changed! Different pixels: ${result.diffPixels}`));
          console.log(chalk.yellow(`💡 See "${paths.diff}" for highlighted differences.`));

          diffResults.push({ screen, device });
        } else {
          console.log(chalk.green("✅ No difference detected"));
        }
      } catch (error) {
        console.log(chalk.red("Error comparing images:"), error);
      }
    }
  }

  await browser.close();

  console.log(chalk.magenta("\n📊 Scan Summary:"));

  if (diffResults.length === 0) {
    console.log(chalk.green("✅ No differences found."));
  } else {
    diffResults.forEach(({ screen, device }) => {
      console.log(chalk.red(`❌ ${screen} on ${device}`));
    });
  }
})();
