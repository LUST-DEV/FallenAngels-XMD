const fs = require('node:fs/promises')
const path = require('node:path')
const { randomUUID } = require('node:crypto')

async function setEnvValue(envPath, key, value) {
  let content = ''
  let fileMode = 0o600
  try {
    const [file, stats] = await Promise.all([
      fs.readFile(envPath, 'utf8'),
      fs.stat(envPath),
    ])
    content = file
    fileMode = stats.mode
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  const newline = content.includes('\r\n') ? '\r\n' : '\n'
  const lines = content ? content.split(/\r?\n/) : []
  if (content.endsWith('\n')) lines.pop()

  const keyLine = `${key}=${JSON.stringify(value)}`
  let replaced = false
  const updatedLines = []
  for (const line of lines) {
    if (new RegExp(`^\\s*${key}\\s*=`).test(line)) {
      if (!replaced) {
        updatedLines.push(keyLine)
        replaced = true
      }
      continue
    }
    updatedLines.push(line)
  }
  if (!replaced) updatedLines.push(keyLine)

  const temporaryPath = path.join(
    path.dirname(envPath),
    `.env-${process.pid}-${randomUUID()}.tmp`,
  )

  try {
    await fs.writeFile(temporaryPath, updatedLines.join(newline) + newline, {
      encoding: 'utf8',
      mode: fileMode,
      flag: 'wx',
    })
    await fs.rename(temporaryPath, envPath)
  } finally {
    try {
      await fs.unlink(temporaryPath)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
}

module.exports = { setEnvValue }
