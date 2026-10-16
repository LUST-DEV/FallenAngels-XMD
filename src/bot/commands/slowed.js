const logger = require('../../logger')
const { applyAudioEffect } = require('../../utils/audioEffects')

module.exports = {
  name: 'slowed',
  desc: 'Slow down a quoted audio file',
  async run({ sock, jid, msg, reply }) {
    try {
      try {
        await sock.sendMessage(jid, { react: { text: '🐢', key: msg.key } })
      } catch (error) {
        logger.debug({ jid, err: error.message }, 'unable to react to slowed command')
      }
      const audio = await applyAudioEffect(msg, 'atempo=0.8')
      return sock.sendMessage(jid, { audio, mimetype: 'audio/mpeg', ptt: false }, { quoted: msg })
    } catch (error) {
      logger.warn({ jid, err: error.message }, 'slowed audio effect failed')
      if (error.message === 'No quoted audio file was found.') {
        return reply('> ❌ Rᴇᴘʟʏ ᴛᴏ ᴀɴ ᴀᴜᴅɪᴏ ғɪʟᴇ ᴛᴏ ᴜsᴇ .slowed.')
      }
      return reply(`> ❌ Cᴏᴜʟᴅ ɴᴏᴛ sʟᴏᴡ ᴅᴏᴡɴ ᴛʜᴇ ᴀᴜᴅɪᴏ: ${error.message}`)
    }
  },
}
