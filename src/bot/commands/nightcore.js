const logger = require('../../logger')
const { applyAudioEffect } = require('../../utils/audioEffects')

module.exports = {
  name: 'nightcore',
  desc: 'Apply a nightcore effect to a quoted audio file',
  async run({ sock, jid, msg, reply }) {
    try {
      try {
        await sock.sendMessage(jid, { react: { text: '🎵', key: msg.key } })
      } catch (error) {
        logger.debug({ jid, err: error.message }, 'unable to react to nightcore command')
      }
      const audio = await applyAudioEffect(msg, 'aresample=44100,asetrate=44100*1.25,aresample=44100')
      return sock.sendMessage(jid, { audio, mimetype: 'audio/mpeg', ptt: false }, { quoted: msg })
    } catch (error) {
      logger.warn({ jid, err: error.message }, 'nightcore audio effect failed')
      if (error.message === 'No quoted audio file was found.') {
        return reply('> ❌ Rᴇᴘʟʏ ᴛᴏ ᴀɴ ᴀᴜᴅɪᴏ ғɪʟᴇ ᴛᴏ ᴜsᴇ .nightcore.')
      }
      return reply(`> ❌ Cᴏᴜʟᴅ ɴᴏᴛ ᴀᴘᴘʟʏ ᴛʜᴇ ɴɪɢʜᴛᴄᴏʀᴇ ᴇғғᴇᴄᴛ: ${error.message}`)
    }
  },
}
