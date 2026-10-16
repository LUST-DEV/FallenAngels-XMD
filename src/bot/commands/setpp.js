const { downloadContentFromMessage, normalizeMessageContent } = require('@whiskeysockets/baileys')
const logger = require('../../logger')

async function downloadImage(message) {
  const stream = await downloadContentFromMessage(message, 'image')
  const chunks = []
  let totalBytes = 0

  for await (const chunk of stream) {
    totalBytes += chunk.length
    if (totalBytes > 16 * 1024 * 1024) throw new Error('Image exceeds the 16 MB limit.')
    chunks.push(chunk)
  }

  if (totalBytes === 0) throw new Error('The quoted image is empty.')
  return Buffer.concat(chunks)
}

module.exports = {
  name: 'setpp',
  aliases: ['setpic'],
  desc: 'Change la photo de profil du bot',
  ownerOnly: true,
  async run({ sock, msg, jid, reply }) {
    const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedContent = quotedMessage ? normalizeMessageContent(quotedMessage) : null
    if (!quotedContent?.imageMessage) {
      return reply('> ❌ Rᴇᴘʟʏ ᴛᴏ ᴀɴ ɪᴍᴀɢᴇ ᴡɪᴛʜ .setpp ᴛᴏ ᴄʜᴀɴɢᴇ ᴛʜᴇ ʙᴏᴛs ᴘʀᴏғɪʟ ᴘɪᴄᴛᴜʀᴇ.')
    }

    try {
      const image = await downloadImage(quotedContent.imageMessage)
      await sock.updateProfilePicture(sock.user.id, image)
      await reply('> ✅ Bᴏᴛ ᴘʀᴏғɪʟᴇ ᴘɪᴄᴛᴜʀᴇ ᴜᴘᴅᴀᴛᴇᴅ.')
    } catch (error) {
      logger.warn({ jid, err: error.message }, 'échec de mise à jour de la photo de profil du bot')
      await reply(`> ❌ Cᴏᴜʟᴅ ɴᴏᴛ ᴜᴘᴅᴀᴛᴇ ᴛʜᴇ ᴘʀᴏғɪʟᴇ ᴘɪᴄᴛᴜʀᴇ: ${error.message}`)
    }
  },
}
