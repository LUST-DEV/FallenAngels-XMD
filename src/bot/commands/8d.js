const logger = require('../../logger')
const { applyAudioEffect } = require('../../utils/audioEffects')

module.exports = {
  name: '8d',
  desc: 'Apply an 8D effect to a quoted audio file',
  async run({ sock, jid, msg, reply }) {
    try {
      try {
        await sock.sendMessage(jid, { react: { text: '🎧', key: msg.key } })
      } catch (error) {
        logger.debug({ jid, err: error.message }, 'unable to react to 8d command')
      }
      const audio = await applyAudioEffect(msg, 'apulsator=hz=0.125')
      return sock.sendMessage(jid, { audio, mimetype: 'audio/mpeg', ptt: false }, { quoted: msg })
    } catch (error) {
      logger.warn({ jid, err: error.message }, '8d audio effect failed')
      if (error.message === 'No quoted audio file was found.') {
        return reply('> ❌ Rᴇᴘʟʏ ᴛᴏ ᴀɴ ᴀᴜᴅɪᴏ ғɪʟᴇ ᴛᴏ ᴜsᴇ .8d.')
      }
      return reply(`> ❌ Cᴏᴜʟᴅ ɴᴏᴛ ᴀᴘᴘʟʏ ᴛʜᴇ 8D ᴇғғᴇᴄᴛ: ${error.message}`)
    }
  },
}
