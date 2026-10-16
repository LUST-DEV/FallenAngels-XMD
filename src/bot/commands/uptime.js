const stats = require('../../utils/stats')

module.exports = {
  name: 'uptime',
  desc: 'Show how long the bot has been running',
  async run({ reply }) {
    return reply(`> ⏱ 𝐔ᴘᴛɪᴍᴇ: ${stats.uptime()}`)
  },
}
