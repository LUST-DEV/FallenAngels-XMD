const { normalizeMessageContent } = require('@whiskeysockets/baileys')
const logger = require('../../logger')
const { downloadQuotedMedia, stickerToImage } = require('../../utils/sticker')

module.exports = {
  name: 'toimg',
  aliases: ['stickertoimg', 'stimg'],
  desc: 'Download and resend a quoted image or extract an image from a sticker',
  async run({ sock, jid, msg, reply }) {
    try {
      try {
        await sock.sendMessage(jid, { react: { text: '🖼️', key: msg.key } })
      } catch (error) {
        logger.debug({ jid, err: error.message }, 'unable to react to toimg command')
      }

      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
      const quotedContent = quotedMessage ? normalizeMessageContent(quotedMessage) : null
      const stickerMsg = quotedContent?.stickerMessage
      const imageMsg = quotedContent?.imageMessage

      if (imageMsg) {
        const image = await downloadQuotedMedia(imageMsg, 'image')
        return sock.sendMessage(jid, {
          image,
          mimetype: imageMsg.mimetype || 'image/jpeg',
          fileName: 'image',
        }, { quoted: msg })
      }

      if (!stickerMsg) {
        return reply('> ❌ Rᴇᴘʟʏ ᴛᴏ ᴀɴ ɪᴍᴀɢᴇ ᴏʀ sᴛɪᴄᴋᴇʀ ᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ ᴀɴᴅ sᴇɴᴅ ɪᴛ.')
      }

      const webp = await downloadQuotedMedia(stickerMsg, 'sticker')
      const image = await stickerToImage(webp)

      return sock.sendMessage(jid, {
        image,
        mimetype: 'image/png',
        fileName: 'sticker.png',
      }, { quoted: msg })
    } catch (error) {
      logger.warn({ jid, err: error.message }, 'toimg failed')
      return reply(`> ❌ Cᴏᴜʟᴅ ɴᴏᴛ ᴅᴏᴡɴʟᴏᴀᴅ ᴏʀ sᴇɴᴅ ᴛʜᴇ ɪᴍᴀɢᴇ: ${error.message}`)
    }
  },
}
