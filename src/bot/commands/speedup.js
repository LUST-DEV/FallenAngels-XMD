const logger = require('../../logger')
const { applyAudioEffect } = require('../../utils/audioEffects')

module.exports = {
  name: 'speedup',
  desc: 'Speed up a quoted audio file',
  async run({ sock, jid, msg, reply }) {
    try {
      try {
        await sock.sendMessage(jid, { react: { text: '⚡', key: msg.key } })
      } catch (error) {
        logger.debug({ jid, err: error.message }, 'unable to react to speedup command')
      }
      const audio = await applyAudioEffect(msg, 'atempo=1.5')
      return sock.sendMessage(jid, { audio, mimetype: 'audio/mpeg', ptt: false }, { quoted: msg })
    } catch (error) {
      logger.warn({ jid, err: error.message }, 'speedup audio effect failed')
      if (error.message === 'No quoted audio file was found.') {
        return reply('> ❌ Rᴇᴘʟʏ ᴛᴏ ᴀɴ ᴀᴜᴅɪᴏ ғɪʟᴇ ᴛᴏ ᴜsᴇ .speedup.')
      }
      return reply(`> ❌ Cᴏᴜʟᴅ ɴᴏᴛ sᴘᴇᴇᴅ ᴜᴘ ᴛʜᴇ ᴀᴜᴅɪᴏ: ${error.message}`)
    }
  },
}
