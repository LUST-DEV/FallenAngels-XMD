const { mentionedParticipants } = require('../groupUtils')
const logger = require('../../logger')

function targetJid(msg, args, sock) {
  const mentioned = mentionedParticipants(msg)
  if (mentioned.length) return mentioned[0]

  if (args.length) {
    const number = args[0].replace(/^\+/, '')
    if (!/^\d{7,15}$/.test(number)) return null
    return `${number}@s.whatsapp.net`
  }

  return sock.user?.id
}

async function downloadPicture(url) {
  const pictureUrl = new URL(url)
  if (pictureUrl.protocol !== 'https:') {
    throw new Error('WhatsApp returned an unsupported profile photo URL.')
  }

  const response = await fetch(pictureUrl, { signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`Profile picture download failed with HTTP ${response.status}.`)

  const declaredLength = Number(response.headers.get('content-length') || 0)
  if (declaredLength > 10 * 1024 * 1024) throw new Error('Profile picture exceeds the 10 MB limit.')

  const chunks = []
  let totalBytes = 0
  for await (const chunk of response.body) {
    totalBytes += chunk.length
    if (totalBytes > 10 * 1024 * 1024) {
      await response.body.cancel()
      throw new Error('Profile picture exceeds the 10 MB limit.')
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

module.exports = {
  name: 'getpp',
  aliases: ['getpic', 'pp'],
  desc: 'Télécharge la photo de profil d’un contact',
  async run({ sock, msg, args, jid, reply }) {
    const contactJid = targetJid(msg, args, sock)
    if (!contactJid) return reply('> ❌ 𝐂ᴏᴜʟᴅ ɴᴏᴛ ᴅᴇᴛᴇʀᴍɪɴᴇ ᴛʜᴇ ᴄᴏɴᴛᴀᴄᴛ. Rᴇᴘʟʏ, ᴍᴇɴᴛɪᴏɴ, ᴏʀ ᴇɴᴛᴇʀ ᴀ ɴᴜᴍʙᴇʀ.')

    try {
      const pictureUrl = await sock.profilePictureUrl(contactJid, 'image')
      if (!pictureUrl) return reply('> ❌ 𝐓ʜɪs ᴄᴏɴᴛᴀᴄᴛ ʜᴀs ɴᴏ ᴘᴜʙʟɪᴄ ᴘʀᴏғɪʟᴇ ᴘɪᴄᴛᴜʀᴇ, ᴏʀ ᴘʀɪᴠᴀᴄʏ sᴇᴛᴛɪɴɢs ʙʟᴏᴄᴋ ɪᴛ.')

      const image = await downloadPicture(pictureUrl)
      await sock.sendMessage(jid, { image, caption: '📸 Pʀᴏғɪʟᴇ ᴘɪᴄᴛᴜʀᴇ' }, { quoted: msg })
    } catch (error) {
      logger.warn({ jid, contactJid, err: error.message }, 'échec de récupération de photo de profil')
      await reply(`> ❌ 𝐂ᴏᴜʟᴅ ɴᴏᴛ ɢᴇᴛ ᴛʜɪs ᴘʀᴏғɪʟᴇ ᴘɪᴄᴛᴜʀᴇ: ${error.message}`)
    }
  },
}
