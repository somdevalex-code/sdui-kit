import { spawn } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const packagesDir = path.join(rootDir, 'packages')
const dryRun = process.argv.includes('--dry-run')

const packages = await readPublishablePackages()
const packDir = await mkdtemp(path.join(tmpdir(), 'sdui-publish-'))
const published = []
const skipped = []

try {
  console.log(
    `${dryRun ? 'Dry-run publishing' : 'Publishing'} ${packages.length} package versions`,
  )

  for (const packageInfo of packages) {
    const spec = `${packageInfo.name}@${packageInfo.version}`

    if (await isPublished(packageInfo)) {
      skipped.push(spec)
      console.log(`skip ${spec}: already published`)
      continue
    }

    const tarball = await packPackage(packageInfo)
    await publishTarball(tarball)
    published.push(spec)
  }

  console.log('')
  console.log(
    `${dryRun ? 'would publish' : 'published'}: ${
      published.length ? published.join(', ') : 'none'
    }`,
  )
  console.log(`skipped: ${skipped.length ? skipped.join(', ') : 'none'}`)
} finally {
  await rm(packDir, { recursive: true, force: true })
}

async function readPublishablePackages() {
  const entries = await readdir(packagesDir, { withFileTypes: true })
  const packageInfos = []

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }

    const packageDir = path.join(packagesDir, entry.name)
    const manifestPath = path.join(packageDir, 'package.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))

    if (manifest.private || !manifest.name || !manifest.version) {
      continue
    }

    packageInfos.push({
      directoryName: entry.name,
      manifest,
      name: manifest.name,
      packageDir,
      version: manifest.version,
    })
  }

  return packageInfos.sort((left, right) => {
    if (left.name === '@sdui-kit/core') {
      return -1
    }

    if (right.name === '@sdui-kit/core') {
      return 1
    }

    return left.name.localeCompare(right.name)
  })
}

async function isPublished(packageInfo) {
  const result = await run(
    'npm',
    ['view', `${packageInfo.name}@${packageInfo.version}`, 'version', '--json'],
    { cwd: packDir, capture: true, allowFailure: true },
  )

  if (result.exitCode === 0) {
    return true
  }

  if (isNotFound(result.stderr) || isNotFound(result.stdout)) {
    return false
  }

  throw new Error(
    [
      `Could not check whether ${packageInfo.name}@${packageInfo.version} is published.`,
      result.stderr.trim() || result.stdout.trim(),
    ].filter(Boolean).join('\n'),
  )
}

async function packPackage(packageInfo) {
  const result = await run(
    'pnpm',
    ['pack', '--pack-destination', packDir, '--json'],
    { cwd: packageInfo.packageDir, capture: true },
  )
  const output = JSON.parse(result.stdout)

  if (!output.filename) {
    throw new Error(
      `pnpm pack did not return a tarball filename for ${packageInfo.name}`,
    )
  }

  return output.filename
}

async function publishTarball(tarball) {
  const args = ['publish', tarball, '--access', 'public']

  if (dryRun) {
    args.push('--dry-run')
  }

  await run('npm', args, { cwd: packDir })
}

function isNotFound(value) {
  return value.includes('E404') || value.includes('404 Not Found')
}

function run(command, args, options = {}) {
  const cwd = options.cwd ?? rootDir
  const stdio = options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit'

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio,
    })
    let stdout = ''
    let stderr = ''

    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        stdout += String(chunk)
      })
    }

    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        stderr += String(chunk)
      })
    }

    child.on('error', reject)
    child.on('close', (exitCode) => {
      const result = {
        exitCode,
        stdout,
        stderr,
      }

      if (exitCode === 0 || options.allowFailure) {
        resolve(result)
        return
      }

      reject(
        new Error(
          [
            `Command failed: ${command} ${args.join(' ')}`,
            stderr.trim() || stdout.trim(),
          ].filter(Boolean).join('\n'),
        ),
      )
    })
  })
}
