#!/usr/bin/env node
'use strict'

const eol = require('eol')
const { glob } = require('glob')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const USAGE = 'Usage: eolConverter <lf|crlf|warmup> <glob>'
const MODES = new Set(['lf', 'crlf', 'warmup'])
const MAX_BYTES = 256 * 1024 * 1024
const IGNORE = ['**/node_modules/**', '**/.git/**']

function parseArgs(args) {
  if (args.length !== 2 || !MODES.has(args[0]) || !args[1]) throw new Error(USAGE)
  return { mode: args[0], pattern: args[1] }
}

// Only accept files that survive a lossless UTF-8 round-trip and contain no NUL byte.
function isUtf8Text(buf) {
  if (buf.includes(0)) return false
  return Buffer.from(buf.toString('utf8'), 'utf8').equals(buf)
}

function writeAtomic(file, content, mode) {
  const tmp = path.join(path.dirname(file),
    `.${path.basename(file)}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`)
  try {
    fs.writeFileSync(tmp, content, { mode, flag: 'wx' })
    fs.renameSync(tmp, file)
  } catch (err) {
    try { fs.unlinkSync(tmp) } catch { /* nothing to clean */ }
    throw err
  }
}

async function run() {
  const { mode, pattern } = parseArgs(process.argv.slice(2))
  const cwd = process.cwd()
  const convert = mode === 'crlf' ? eol.crlf : eol.lf
  const dryRun = mode === 'warmup'

  console.log(`cwd: ${cwd}`)
  console.log(`pattern: ${pattern}`)
  console.log(dryRun ? 'mode: warmup (dry run, nothing written)' : `mode: convert to ${mode.toUpperCase()}`)

  const files = (await glob(pattern, { cwd, nodir: true, absolute: true, ignore: IGNORE })).sort()
  if (files.length === 0) throw new Error('no files matched')

  const stats = { changed: 0, unchanged: 0, skipped: 0, failed: 0 }
  for (const file of files) {
    try {
      const st = fs.lstatSync(file)
      if (!st.isFile()) { stats.skipped++; console.log(`SKIP not a regular file: ${file}`); continue }
      if (st.size > MAX_BYTES) { stats.skipped++; console.log(`SKIP too large: ${file}`); continue }
      const input = fs.readFileSync(file)
      if (!isUtf8Text(input)) { stats.skipped++; console.log(`SKIP not UTF-8 text: ${file}`); continue }
      const output = Buffer.from(convert(input.toString('utf8')), 'utf8')
      if (output.equals(input)) { stats.unchanged++; continue }
      if (!dryRun) writeAtomic(file, output, st.mode)
      stats.changed++
      console.log(`${dryRun ? 'WOULD CHANGE' : 'CHANGED'}: ${file}`)
    } catch (err) {
      stats.failed++
      console.error(`FAIL: ${file}: ${err.message}`)
    }
  }
  console.log(`changed=${stats.changed} unchanged=${stats.unchanged} skipped=${stats.skipped} failed=${stats.failed}`)
  if (stats.failed > 0) process.exitCode = 1
}

run().catch(err => {
  console.error(`ERROR: ${err.message}`)
  process.exitCode = 2
})
