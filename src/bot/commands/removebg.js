const { normalizeMessageContent } = require('@whiskeysockets/baileys')
const config = require('../../config')
const logger = require('../../logger')
const { downloadQuotedMedia, stickerToImage } = require('../../utils/sticker')

module.exports = {
  name: 'removebg',
  aliases: ['rmbg'],
  desc: 'Remove the background from a quoted or attached image',
  async run({ sock, jid, msg, reply }) {
    try {
      try {
        await sock.sendMessage(jid, { react: { text: '🪄', key: msg.key } })
      } catch (error) {
        logger.debug({ jid, err: error.message }, 'unable to react to removebg command')
      }

      if (!config.removeBgApiKey) {
        return reply('> ❌ 𝐑ᴇᴍᴏᴠᴇ ʙᴀᴄᴋɢʀᴏᴜɴᴅ ɪs ɴᴏᴛ ᴄᴏɴғɪɢᴜʀᴇᴅ. 𝐀ᴅᴅ ʀᴇᴍᴏᴠᴇ.ʙɢ ᴀᴘɪ ᴋᴇʏ ᴀs 𝐑𝐄𝐌𝐎𝐕𝐄_𝐁𝐆_𝐀𝐏𝐈_𝐊𝐄𝐘 ᴛᴏ ʏᴏᴜʀ .ᴇɴᴠ ғɪʟᴇ.')
      }

      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
      const currentContent = normalizeMessageContent(msg.message)
      const quotedContent = quotedMessage ? normalizeMessageContent(quotedMessage) : null
      const imageMessage = currentContent?.imageMessage || quotedContent?.imageMessage
      const stickerMessage = quotedContent?.stickerMessage

      let imageBuffer
      if (imageMessage) {
        imageBuffer = await downloadQuotedMedia(imageMessage, 'image')
      } else if (stickerMessage) {
        const stickerBuffer = await downloadQuotedMedia(stickerMessage, 'sticker')
        imageBuffer = await stickerToImage(stickerBuffer)
      } else {
        return reply('> ❌ 𝐀ᴛᴛᴀᴄʜ ᴀɴ ɪᴍᴀɢᴇ ᴏʀ ʀᴇᴘʟʏ ᴛᴏ ᴀɴ ɪᴍᴀɢᴇ ᴏʀ sᴛɪᴄᴋᴇʀ ᴡɪᴛʜ .ʀᴇᴍᴏᴠᴇʙɢ.')
      }

      const form = new FormData()
      form.append('image_file', new Blob([imageBuffer]), 'image')
      form.append('size', 'auto')
      form.append('format', 'png')

      const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: { 'X-Api-Key': config.removeBgApiKey },
        body: form,
        signal: AbortSignal.timeout(60_000),
      })

      if (!response.ok) {
        const details = (await response.text()).slice(0, 300)
        throw new Error(`remove.bg returned ${response.status}${details ? `: ${details}` : ''}`)
      }

      const result = Buffer.from(await response.arrayBuffer())
      if (!result.length) throw new Error('remove.bg returned an empty image.')

      return sock.sendMessage(jid, {
        image: result,
        mimetype: 'image/png',
        fileName: 'background-removed.png',
        caption: '> 𝐁ᴀᴄᴋɢʀᴏᴜɴᴅ ʀᴇᴍᴏᴠᴇᴅ ᴡɪᴛʜ sᴜᴄᴄᴇss.',
      }, { quoted: msg })
    } catch (error) {
      logger.warn({ jid, err: error.message }, 'removebg command failed')
      return reply(`> ❌ 𝐂ᴏᴜʟᴅ ɴᴏᴛ ʀᴇᴍᴏᴠᴇ ᴛʜᴇ ʙᴀᴄᴋɢʀᴏᴜɴᴅ: ${error.message}`)
    }
  },
}
