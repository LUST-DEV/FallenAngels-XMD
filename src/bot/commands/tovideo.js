const { normalizeMessageContent } = require('@whiskeysockets/baileys')
const logger = require('../../logger')
const { downloadQuotedMedia, stickerToVideo } = require('../../utils/sticker')

module.exports = {
  name: 'tovideo',
  aliases: ['stikertovideo', 'stikertomp4', 'stov'],
  desc: 'Download and resend a quoted video or convert an animated sticker to MP4',
  async run({ sock, jid, msg, reply }) {
    try {
      try {
        await sock.sendMessage(jid, { react: { text: '🎥', key: msg.key } })
      } catch (error) {
        logger.debug({ jid, err: error.message }, 'unable to react to tovideo command')
      }

      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
      const quotedContent = quotedMessage ? normalizeMessageContent(quotedMessage) : null
      const stickerMsg = quotedContent?.stickerMessage
      const videoMsg = quotedContent?.videoMessage

      if (videoMsg) {
        const video = await downloadQuotedMedia(videoMsg, 'video')
        return sock.sendMessage(jid, {
          video,
          mimetype: videoMsg.mimetype || 'video/mp4',
          fileName: 'video',
        }, { quoted: msg })
      }

      if (!stickerMsg) {
        return reply('> ❌ Rᴇᴘʟʏ ᴛᴏ ᴀ ᴠɪᴅᴇᴏ ᴏʀ ᴀɴ ᴀɴɪᴍᴀᴛᴇᴅ sᴛɪᴄᴋᴇʀ ᴛᴏ sᴇɴᴅ ɪᴛ ᴀs ᴀ ᴠɪᴅᴇᴏ.')
      }

      const webp = await downloadQuotedMedia(stickerMsg, 'sticker')
      const mp4 = await stickerToVideo(webp)

      return sock.sendMessage(jid, {
        video: mp4,
        mimetype: 'video/mp4',
        fileName: 'sticker.mp4',
      }, { quoted: msg })
    } catch (error) {
      logger.warn({ jid, err: error.message }, 'tovideo failed')
      return reply(`> ❌ Cᴏᴜʟᴅ ɴᴏᴛ ᴅᴏᴡɴʟᴏᴀᴅ ᴏʀ sᴇɴᴅ ᴛʜᴇ ᴠɪᴅᴇᴏ: ${error.message}`)
    }
  },
}
