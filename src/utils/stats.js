const os = require('os')
const fs = require('fs')

function cpuTimes() {
  let idle = 0, total = 0
  for (const c of os.cpus()) {
    for (const t in c.times) total += c.times[t]
    idle += c.times.idle
  }
  return { idle, total }
}

// CPU % mesuré sur 300 ms
async function cpuUsage() {
  const a = cpuTimes()
  await new Promise((r) => setTimeout(r, 300))
  const b = cpuTimes()
  return (1 - (b.idle - a.idle) / (b.total - a.total)) * 100
}

function ramUsage() {
  return (1 - os.freemem() / os.totalmem()) * 100
}

function diskUsage() {
  try {
    const s = fs.statfsSync(process.cwd()) // Node 18.15+
    return (1 - s.bavail / s.blocks) * 100
  } catch {
    return 0
  }
}

function uptime() {
  const s = Math.floor(process.uptime())
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const parts = []
  if (d) parts.push(`${d}d`)
  if (h || d) parts.push(`${h}h`)
  parts.push(`${m}m`, `${s % 60}s`)
  return parts.join(':')
}

module.exports = { cpuUsage, ramUsage, diskUsage, uptime }