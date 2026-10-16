const config = require('../../config')
const stats = require('../../utils/stats')
const sendBanner = require('../../utils/media')
const logger = require('../../logger')

function formatCpuTime(microseconds) {
  const seconds = Math.floor(microseconds / 1_000_000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  return `${hours}h ${minutes}m ${remainingSeconds}s`
}

module.exports = {
  name: 'alive',
  desc: 'Show bot status, response speed, current time and CPU statistics',
  async run({ sock, jid, msg }) {
    const start = process.hrtime.bigint()
    let speedText = 'Unavailable'
    try {
      await sock.sendMessage(jid, { react: { text: '🖤', key: msg.key } })
      const speedMs = Number(process.hrtime.bigint() - start) / 1e6
      speedText = `${speedMs.toFixed(1)} ms`
    } catch (error) {
      logger.debug({ jid, err: error.message }, 'unable to measure WhatsApp response speed')
    }

    const uptime = stats.uptime()
    const cpuTime = process.cpuUsage()
    const cpuUsage = await stats.cpuUsage()
    const usageText = Number.isFinite(cpuUsage) ? `${cpuUsage.toFixed(1)}%` : 'Unavailable'
    const time = new Intl.DateTimeFormat('en-US', { timeStyle: 'medium' }).format(new Date())

    const caption = [
      '╭─❮ 𓆩 𝐅ᴀʟʟᴇɴ 𝐗 𝐀ɴɢᴇʟs 𓆪 ❯',
      '│',
      '│ 🟢 𝐒ᴛᴀᴛᴜs      ➤ 𝐎ɴʟɪɴᴇ',
      `│ ⚡ 𝐑ᴇsᴘᴏɴsᴇ   ➤ ${speedText}`,
      `│ ⏱️ 𝐔ᴘᴛɪᴍᴇ      ➤ ${uptime}`,
      `│ 🕒 𝐋ᴏᴄᴀʟ 𝐓ɪᴍᴇ ➤ ${time}`,
      '├────────────────────────',
      `│ 🖥️ 𝐂ᴘᴜ 𝐔sᴀɢᴇ  ➤ ${usageText}`,
      `│ ⌛ 𝐂ᴘᴜ 𝐓ɪᴍᴇ   ➤ ${formatCpuTime(cpuTime.user + cpuTime.system)}`,
      `│ ✦ 𝐁ᴏᴛ     ➤ ${config.botName}`,
      '│',
      '╰─❮ 𝐒ʏsᴛᴇᴍ 𝐎ᴘᴇʀᴀᴛɪᴏɴᴀʟ ❯',
    ].join('\n')

    return sendBanner(sock, jid, msg, caption, 'alive')
  },
}
