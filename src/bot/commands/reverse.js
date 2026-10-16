const logger = require('../../logger')
const { applyAudioEffect } = require('../../utils/audioEffects')

module.exports = {
  name: 'reverse',
  desc: 'Reverse a quoted audio file',
  async run({ sock, jid, msg, reply }) {
    try {
      try {
        await sock.sendMessage(jid, { react: { text: '⏪', key: msg.key } })
      } catch (error) {
        logger.debug({ jid, err: error.message }, 'unable to react to reverse command')
      }
      const audio = await applyAudioEffect(msg, 'areverse')
      return sock.sendMessage(jid, { audio, mimetype: 'audio/mpeg', ptt: false }, { quoted: msg })
    } catch (error) {
      logger.warn({ jid, err: error.message }, 'reverse audio effect failed')
      if (error.message === 'No quoted audio file was found.') {
        return reply('> ❌ Rᴇᴘʟʏ ᴛᴏ ᴀɴ ᴀᴜᴅɪᴏ ғɪʟᴇ ᴛᴏ ᴜsᴇ .reverse.')
      }
      return reply(`> ❌ Cᴏᴜʟᴅ ɴᴏᴛ ʀᴇᴠᴇʀsᴇ ᴛʜᴇ ᴀᴜᴅɪᴏ: ${error.message}`)
    }
  },
}
