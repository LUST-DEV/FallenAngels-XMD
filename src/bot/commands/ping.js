const sendBanner = require('../../utils/media')
const stats = require('../../utils/stats')
const config = require('../../config')
const { sessions } = require('../sessionManager')

module.exports = {
  name: 'ping',
  aliases: ['p'],
  desc: 'Latence et stats système',
  async run({ sock, jid, msg }) {
    // latence réelle : aller-retour avec WhatsApp
    const start = process.hrtime.bigint()
    await sock.sendMessage(jid, { react: { text: '🏓', key: msg.key } })
    const ms = Number(process.hrtime.bigint() - start) / 1e6

    const cpu = await stats.cpuUsage()

    const caption =
`> 🏓 𝐏ᴏɴɢ : ${ms.toFixed(3)}ᴍs

${config.botName} ♪ sʏsᴛᴇᴍ sᴛᴀᴛs 

↬ \`𝐔ᴩᴛɪᴍᴇ\` : ${stats.uptime()}
↬ \`𝐑ᴀᴍ\`: ${stats.ramUsage().toFixed(1)}%
↬ \`𝐂ᴩᴜ\` : ${cpu.toFixed(1)}%
↬ \`𝐃ɪsᴋ\` : ${stats.diskUsage().toFixed(1)}%
↬ \`𝐒ᴇssɪᴏɴs\` : ${sessions.size}`

    await sendBanner(sock, jid, msg, caption, 'ping')
  },
}

