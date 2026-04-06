#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { spawn, exec } = require("child_process");
const net = require("net");
const os = require("os");
const path = require("path");
const fs = require("fs");

const PKG_DIR = path.join(__dirname, "..");
const CACHE_DIR = path.join(os.homedir(), ".cc-lens");

// ANSI helpers — Claude's warm orange palette
const O = "\x1b[38;5;208m"; // orange
const O2 = "\x1b[38;5;214m"; // amber
const DIM = "\x1b[2m";
const B = "\x1b[1m";
const R = "\x1b[0m";

// OSC 8 terminal hyperlink
function link(text, url) {
  return `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
}

function printBanner() {
  const art = [
    `${O}${B} ██████╗ ██████╗     ██╗     ███████╗███╗   ██╗███████╗${R}`,
    `${O}${B}██╔════╝██╔════╝     ██║     ██╔════╝████╗  ██║██╔════╝${R}`,
    `${O2}${B}██║     ██║          ██║     █████╗  ██╔██╗ ██║███████╗${R}`,
    `${O2}${B}██║     ██║          ██║     ██╔══╝  ██║╚██╗██║╚════██║${R}`,
    `${O}${B}╚██████╗╚██████╗     ███████╗███████╗██║ ╚████║███████║${R}`,
    `${O}${B} ╚═════╝ ╚═════╝     ╚══════╝╚══════╝╚═╝  ╚═══╝╚══════╝${R}`,
  ];

  const author = link(`${O2}pitimon${R}`, "https://github.com/pitimon");

  console.log();
  art.forEach((line) => console.log("  " + line));
  console.log();
  console.log(
    `  ${B}${O}Claude Code Lens${R}   ${DIM}—  your ~/.claude/ at a glance${R}`,
  );
  console.log(`  ${DIM}Made with ♥ by ${R}${author}`);
  console.log();
}

function findFreePort(port = 3000) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on("error", () => resolve(findFreePort(port + 1)));
    server.listen(port, () => server.close(() => resolve(port)));
  });
}

function openBrowser(url) {
  const cmd =
    process.platform === "darwin"
      ? `open "${url}"`
      : process.platform === "win32"
        ? `start "" "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd);
}

// Source dirs/files to mirror into ~/.cc-lens/
const SRC_DIRS = ["app", "components", "lib", "types", "public"];
const SRC_FILES = [
  "next.config.ts",
  "tsconfig.json",
  "postcss.config.mjs",
  "components.json",
];

function syncSource(pkg) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  for (const dir of SRC_DIRS) {
    const src = path.join(PKG_DIR, dir);
    if (fs.existsSync(src)) {
      fs.cpSync(src, path.join(CACHE_DIR, dir), {
        recursive: true,
        force: true,
      });
    }
  }
  for (const file of SRC_FILES) {
    const src = path.join(PKG_DIR, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(CACHE_DIR, file));
    }
  }
  // Write a minimal package.json with only runtime dependencies —
  // devDependencies (eslint, shadcn, etc.) are not needed and may have
  // pinned versions that don't exist on npm, causing ETARGET errors.
  fs.writeFileSync(
    path.join(CACHE_DIR, "package.json"),
    JSON.stringify(
      {
        name: "cc-lens-runtime",
        version: pkg.version,
        dependencies: pkg.dependencies,
      },
      null,
      2,
    ),
  );
  const lockSrc = path.join(PKG_DIR, "package-lock.json");
  if (fs.existsSync(lockSrc)) {
    fs.copyFileSync(lockSrc, path.join(CACHE_DIR, "package-lock.json"));
  }
}

async function main() {
  printBanner();

  const pkg = require(path.join(PKG_DIR, "package.json"));

  // Check whether ~/.cc-lens/ is up-to-date for this version
  const versionFile = path.join(CACHE_DIR, ".cc-lens-version");
  const cachedVersion = fs.existsSync(versionFile)
    ? fs.readFileSync(versionFile, "utf8").trim()
    : null;

  // Use Next's JS entry (not node_modules/.bin/next[.cmd]) — Windows EINVAL if spawn() tries to exec .cmd without shell.
  const nextCli = path.join(
    CACHE_DIR,
    "node_modules",
    "next",
    "dist",
    "bin",
    "next",
  );
  // Check if node_modules already satisfies deps (skip npm install if so)
  const lockFile = path.join(CACHE_DIR, "node_modules", ".package-lock.json");
  const hasModules = fs.existsSync(lockFile);
  const needsSetup = cachedVersion !== pkg.version || !fs.existsSync(nextCli);
  const needsInstall = needsSetup && !hasModules;

  const isDev = process.argv.includes("--dev");
  const buildMarker = path.join(CACHE_DIR, ".next", "BUILD_ID");
  const hasBuild = fs.existsSync(buildMarker);

  if (needsSetup) {
    // Copy all source files into ~/.cc-lens/ so Next.js runs entirely within
    // that directory — no symlinks, no Turbopack root violations.
    syncSource(pkg);

    if (needsInstall) {
      console.log(`  ${DIM}Setting up (first run, may take a minute)…${R}\n`);
      await new Promise((resolve, reject) => {
        const install = spawn("npm", ["install", "--prefer-offline"], {
          cwd: CACHE_DIR,
          stdio: "inherit",
          shell: true,
        });
        install.on("exit", (code) =>
          code === 0
            ? resolve()
            : reject(new Error(`npm install failed (exit ${code})`)),
        );
      });
    } else {
      console.log(`  ${DIM}Updating source files…${R}\n`);
    }

    // Build for production (one-time per version, ~30-60s)
    if (!isDev) {
      console.log(`  ${DIM}Building for production…${R}\n`);
      await new Promise((resolve, reject) => {
        const build = spawn("npx", ["next", "build"], {
          cwd: CACHE_DIR,
          stdio: "inherit",
          shell: true,
        });
        build.on("exit", (code) =>
          code === 0
            ? resolve()
            : reject(new Error(`next build failed (exit ${code})`)),
        );
      });
    }

    fs.writeFileSync(versionFile, pkg.version);
  } else if (!isDev && !hasBuild) {
    // Source already synced but no production build exists (e.g. previously ran with --dev)
    console.log(`  ${DIM}Building for production…${R}\n`);
    await new Promise((resolve, reject) => {
      const build = spawn("npx", ["next", "build"], {
        cwd: CACHE_DIR,
        stdio: "inherit",
        shell: true,
      });
      build.on("exit", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`next build failed (exit ${code})`)),
      );
    });
  }

  const port = await findFreePort(
    parseInt(process.env.CC_LENS_PORT, 10) || 33033,
  );
  const host = process.env.CC_LENS_HOST || "127.0.0.1";
  const url = `http://localhost:${port}`;

  if (host !== "127.0.0.1" && host !== "::1" && host !== "localhost") {
    console.log(
      `  \x1b[33m⚠  WARNING: binding to ${host} — dashboard accessible on network\x1b[0m\n`,
    );
  }
  const mode = isDev ? "dev" : "start";
  console.log(
    `  ${DIM}Starting server on${R} ${O2}${B}${url}${R}${isDev ? ` ${DIM}(dev mode)${R}` : ""}\n`,
  );

  // On Windows, mixing 'inherit' + 'pipe' in stdio causes EINVAL. Use 'ignore'
  // for stdin — Next.js server doesn't need user input from stdin.
  const child = spawn(
    process.execPath,
    [nextCli, mode, "--port", String(port), "--hostname", host],
    {
      cwd: CACHE_DIR,
      stdio: [
        process.platform === "win32" ? "ignore" : "inherit",
        "pipe",
        "pipe",
      ],
      env: { ...process.env, PORT: String(port) },
    },
  );

  let opened = false;

  function checkReady(text) {
    if (!opened && /Local:|ready|started server/i.test(text)) {
      opened = true;
      console.log(`\n  ${O}✓${R}  Opening ${B}${url}${R} in your browser…\n`);
      openBrowser(url);
    }
  }

  child.stdout.on("data", (d) => {
    process.stdout.write(d);
    checkReady(d.toString());
  });
  child.stderr.on("data", (d) => {
    process.stderr.write(d);
    checkReady(d.toString());
  });

  child.on("exit", (code) => process.exit(code ?? 0));

  // Windows doesn't support SIGINT/SIGTERM — child.kill() (no arg) works cross-platform.
  process.on("SIGINT", () => {
    child.kill();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    child.kill();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
