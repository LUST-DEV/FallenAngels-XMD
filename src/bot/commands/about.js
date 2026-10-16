const os = require('node:os')
const config = require('../../config')
const stats = require('../../utils/stats')
const sendBanner = require('../../utils/media')
const logger = require('../../logger')

module.exports = {
  name: 'about',
  aliases: ['botinfo'],
  desc: 'Show bot information and system metadata',
  async run({ jid, msg, sock }) {
    const start = process.hrtime.bigint()
    let speedText = 'Uɴᴀᴠᴀɪʟᴀʙʟᴇ'
    try {
      await sock.sendMessage(jid, { react: { text: '⚙️', key: msg.key } })
      speedText = `${(Number(process.hrtime.bigint() - start) / 1e6).toFixed(1)} ᴍs`
    } catch (error) {
      logger.debug({ jid, err: error.message }, 'unable to measure botinfo response speed')
    }

    const cpuUsage = await stats.cpuUsage()
    const caption = [
      '╭┈⊷┈⊷┈⊷┈⊷┈⊷┈⊷╮',
      `┃ ✦ 𝐍ᴀᴍᴇ: ${config.botName}`,
      '┃',
      '┃ ⚙ 𝐒ᴛᴀᴄᴋ: Nᴏᴅᴇ.ᴊs · Bᴀɪʟᴇʏs · sᴇǫᴜᴇʟɪᴢᴇ',
      '┃ ♧ 𝐃ᴇᴠ: Sᴇɴɪᴏʀ’s Aɴɢᴇʟs Dᴇᴠ',
      `┃ ✦ 𝐂ᴘᴜ: ${Number.isFinite(cpuUsage) ? `${cpuUsage.toFixed(1)}%` : 'Uɴᴀᴠᴀɪʟᴀʙʟᴇ'}`,
      `┃ ↯ 𝐒ᴘᴇᴇᴅ: ${speedText}`,
      `┃ ◈ 𝐎s: ${os.type()} ${os.release()} (${os.arch()})`,
      `┃ ⬡ 𝐍ᴏᴅᴇ.ᴊs: ${process.version}`,
      '╰┈⊷┈⊷┈⊷┈⊷┈⊷┈⊷╯',
    ].join('\n')

    return sendBanner(sock, jid, msg, caption, 'botinfo')
  },
}
