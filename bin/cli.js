#!/usr/bin/env node

const { spawn, exec } = require('child_process')
const net  = require('net')
const os   = require('os')
const path = require('path')
const fs   = require('fs')

const PKG_DIR   = path.join(__dirname, '..')
const CACHE_DIR = path.join(os.homedir(), '.cc-lens')

// ANSI helpers — Claude's warm orange palette
const O   = '\x1b[38;5;208m'  // orange
const O2  = '\x1b[38;5;214m'  // amber
const DIM = '\x1b[2m'
const B   = '\x1b[1m'
const R   = '\x1b[0m'

// OSC 8 terminal hyperlink
function link(text, url) {
  return `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`
}

function printBanner() {
  const art = [
    `${O}${B} ██████╗ ██████╗     ██╗     ███████╗███╗   ██╗███████╗${R}`,
    `${O}${B}██╔════╝██╔════╝     ██║     ██╔════╝████╗  ██║██╔════╝${R}`,
    `${O2}${B}██║     ██║          ██║     █████╗  ██╔██╗ ██║███████╗${R}`,
    `${O2}${B}██║     ██║          ██║     ██╔══╝  ██║╚██╗██║╚════██║${R}`,
    `${O}${B}╚██████╗╚██████╗     ███████╗███████╗██║ ╚████║███████║${R}`,
    `${O}${B} ╚═════╝ ╚═════╝     ╚══════╝╚══════╝╚═╝  ╚═══╝╚══════╝${R}`,
  ]

  const author = link(`${O2}Arindam${R}`, 'https://github.com/Arindam200')

  console.log()
  art.forEach((line) => console.log('  ' + line))
  console.log()
  console.log(`  ${B}${O}Claude Code Lens${R}   ${DIM}—  your ~/.claude/ at a glance${R}`)
  console.log(`  ${DIM}Made with ♥ by ${R}${author}`)
  console.log()
}

function findFreePort(port = 3000) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.unref()
    server.on('error', () => resolve(findFreePort(port + 1)))
    server.listen(port, () => server.close(() => resolve(port)))
  })
}

function openBrowser(url) {
  const cmd =
    process.platform === 'darwin' ? `open "${url}"` :
    process.platform === 'win32'  ? `start "" "${url}"` :
                                    `xdg-open "${url}"`
  exec(cmd)
}

// Source dirs/files to mirror into ~/.cc-lens/
const SRC_DIRS  = ['app', 'components', 'lib', 'types', 'public']
const SRC_FILES = ['next.config.ts', 'tsconfig.json', 'postcss.config.mjs', 'components.json']

function syncSource(pkg) {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  for (const dir of SRC_DIRS) {
    const src = path.join(PKG_DIR, dir)
    if (fs.existsSync(src)) {
      fs.cpSync(src, path.join(CACHE_DIR, dir), { recursive: true, force: true })
    }
  }
  for (const file of SRC_FILES) {
    const src = path.join(PKG_DIR, file)
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(CACHE_DIR, file))
    }
  }
  // Write a minimal package.json with only runtime dependencies —
  // devDependencies (eslint, shadcn, etc.) are not needed and may have
  // pinned versions that don't exist on npm, causing ETARGET errors.
  fs.writeFileSync(path.join(CACHE_DIR, 'package.json'), JSON.stringify({
    name: 'cc-lens-runtime',
    version: pkg.version,
    dependencies: pkg.dependencies,
  }, null, 2))
}

async function main() {
  printBanner()

  const pkg = require(path.join(PKG_DIR, 'package.json'))

  // Check whether ~/.cc-lens/ is up-to-date for this version
  const versionFile = path.join(CACHE_DIR, '.cc-lens-version')
  const cachedVersion = fs.existsSync(versionFile)
    ? fs.readFileSync(versionFile, 'utf8').trim()
    : null

  const nextBin = path.join(CACHE_DIR, 'node_modules', '.bin', process.platform === 'win32' ? 'next.cmd' : 'next')
  const needsSetup = cachedVersion !== pkg.version || !fs.existsSync(nextBin)

  if (needsSetup) {
    console.log(`  ${DIM}Setting up (first run, may take a minute)…${R}\n`)

    // Copy all source files into ~/.cc-lens/ so Next.js runs entirely within
    // that directory — no symlinks, no Turbopack root violations.
    syncSource(pkg)

    await new Promise((resolve, reject) => {
      const install = spawn('npm', ['install', '--prefer-offline', '--no-package-lock'], {
        cwd: CACHE_DIR,
        stdio: 'inherit',
        shell: true,
      })
      install.on('exit', (code) =>
        code === 0 ? resolve() : reject(new Error(`npm install failed (exit ${code})`))
      )
    })

    fs.writeFileSync(versionFile, pkg.version)
  }

  const port = await findFreePort(3000)
  const url  = `http://localhost:${port}`

  console.log(`  ${DIM}Starting server on${R} ${O2}${B}${url}${R}\n`)

  const child = spawn(nextBin, ['dev', '--port', String(port)], {
    cwd: CACHE_DIR,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(port) },
  })

  let opened = false

  function checkReady(text) {
    if (!opened && /Local:|ready|started server/i.test(text)) {
      opened = true
      console.log(`\n  ${O}✓${R}  Opening ${B}${url}${R} in your browser…\n`)
      openBrowser(url)
    }
  }

  child.stdout.on('data', (d) => { process.stdout.write(d); checkReady(d.toString()) })
  child.stderr.on('data', (d) => { process.stderr.write(d); checkReady(d.toString()) })

  child.on('exit', (code) => process.exit(code ?? 0))

  process.on('SIGINT',  () => { child.kill('SIGINT');  process.exit(0) })
  process.on('SIGTERM', () => { child.kill('SIGTERM'); process.exit(0) })
}

main().catch((err) => { console.error(err); process.exit(1) })
