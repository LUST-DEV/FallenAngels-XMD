const { normalizeMessageContent } = require('@whiskeysockets/baileys')
const logger = require('../../logger')
const { downloadQuotedMedia, imageToSticker, videoToSticker } = require('../../utils/sticker')

module.exports = {
  name: 'stickers',
  aliases: ['sticker', 's'],
  desc: 'Crée un sticker à partir d’une image ou d’une vidéo citée',
  async run({ sock, jid, msg, reply }) {
    try {
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
      const quotedContent = quotedMessage ? normalizeMessageContent(quotedMessage) : null

      if (quotedContent?.imageMessage) {
        const image = await downloadQuotedMedia(quotedContent.imageMessage, 'image')
        const sticker = await imageToSticker(image)
        await sock.sendMessage(jid, { sticker }, { quoted: msg })
        return
      }

      if (quotedContent?.videoMessage) {
        const video = await downloadQuotedMedia(quotedContent.videoMessage, 'video')
        const sticker = await videoToSticker(video)
        await sock.sendMessage(jid, { sticker }, { quoted: msg })
        return
      }

      await reply('> ❌ Rᴇᴘʟʏ ᴛᴏ ᴀɴ ɪᴍᴀɢᴇ ᴏʀ ᴀ ᴠɪᴅᴇᴏ ᴛᴏ ᴄʀᴇᴀᴛᴇ ᴀ sᴛɪᴄᴋᴇʀ.')
    } catch (error) {
      logger.warn({ jid, err: error.message }, 'échec de création du sticker')
      await reply(`> ❌ Cᴏᴜʟᴅ ɴᴏᴛ ᴄʀᴇᴀᴛᴇ ᴛʜᴇ sᴛɪᴄᴋᴇʀ: ${error.message}`)
    }
  },
}
