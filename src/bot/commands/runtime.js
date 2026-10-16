const os = require('node:os')
const stats = require('../../utils/stats')

function formatDuration(seconds) {
  const totalSeconds = Math.floor(seconds)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainingSeconds = totalSeconds % 60
  const parts = []

  if (days) parts.push(`${days}d`)
  if (hours || days) parts.push(`${hours}h`)
  parts.push(`${minutes}m`, `${remainingSeconds}s`)
  return parts.join(' ')
}

module.exports = {
  name: 'runtime',
  desc: 'Show the bot runtime environment and server uptime',
  async run({ reply }) {
    return reply([
      '> ╭┈⊷┈⊷┈⊷┈⊷┈⊷┈⊷╮',
      '> ┃ ⚙ 𝐑ᴜɴᴛɪᴍᴇ',
      '> ┃',
      `> ┃ ✦ 𝐍ᴏᴅᴇ.ᴊs: ${process.version}`,
      `> ┃ ✦ 𝐏ʟᴀᴛғᴏʀᴍ: ${process.platform} (${process.arch})`,
      `> ┃ ⏱ 𝐁ᴏᴛ ᴜᴘᴛɪᴍᴇ: ${stats.uptime()}`,
      `> ┃ ⏱ 𝐒ᴇʀᴠᴇʀ ᴜᴘᴛɪᴍᴇ: ${formatDuration(os.uptime())}`,
      '> ╰┈⊷┈⊷┈⊷┈⊷┈⊷┈⊷╯',
    ].join('\n'))
  },
}
