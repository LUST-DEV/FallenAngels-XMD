const { User } = require('../../database')
const normalizePhone = require('../../utils/phone')
const logger = require('../../logger')
const { startSession, sessions } = require('../sessionManager')

module.exports = {
  name: 'pair',
  desc: 'Génère un code de jumelage WhatsApp',
  ownerOnly: true,
  async run({ sock, msg, args, prefix, reply }) {
    const input = args.join(' ').trim()
    const phone = input.startsWith('+') ? normalizePhone.parse(input) : null
    if (!phone) {
      return reply(`> ❌ Uꜱᴀɢᴇ: ${prefix}pair +<country code> <phone number>\nE.x.: ${prefix}pair +509 (487) 92083`)
    }

    const { numero, country } = phone
    const [user] = await User.findOrCreate({
      where: { numero },
      defaults: { country },
    })
    if (user.country !== country) await user.update({ country })

    const existingSession = sessions.get(numero)
    if (existingSession?.authState.creds.registered) {
      return reply('> ⚠️ Tʜɪs ɴᴜᴍʙᴇʀ ɪs ᴀʟʀᴇᴀᴅʏ ʟɪɴᴋᴇᴅ. Uɴʟɪɴᴋ ɪᴛ ғɪʀsᴛ ɪғ ʏᴏᴜ ᴡᴀɴᴛ ᴛᴏ ᴘᴀɪʀ ɪᴛ ᴀɢᴀɪɴ.')
    }

    try {
      const pairingCode = await startSession(numero)
      if (!pairingCode) {
        return reply('> ⚠️ Nᴏ ᴘᴀɪʀɪɴɢ ᴄᴏᴅᴇ ᴡᴀs ɢᴇɴᴇʀᴀᴛᴇᴅ. Tʜᴇ sᴇssɪᴏɴ ᴍᴀʏ ʙᴇ ʀᴇᴄᴏɴɴᴇᴄᴛɪɴɢ; ᴛʀʏ ᴀɢᴀɪɴ sʜᴏʀᴛʟʏ.')
      }

      await sock.sendMessage(msg.key.remoteJid, {
        text: `🔐 WʜᴀᴛsAᴘᴘ ᴘᴀɪʀɪɴɢ ᴄᴏᴅᴇ ғᴏʀ +${numero}:\n\n*${pairingCode}*\n\nOᴘᴇɴ WʜᴀᴛsAᴘᴘ > Lɪɴᴋᴇᴅ ᴅᴇᴠɪᴄᴇs > Lɪɴᴋ ᴡɪᴛʜ ᴘʜᴏɴᴇ ɴᴜᴍʙᴇʀ ᴀɴᴅ ᴇɴᴛᴇʀ ᴛʜɪs ᴄᴏᴅᴇ.`,
      }, { quoted: msg })
    } catch (error) {
      logger.warn({ numero, err: error.message }, 'échec de génération du code de jumelage via WhatsApp')
      await reply('> ❌ WʜᴀᴛsAᴘᴘ ᴄᴏᴜʟᴅ ɴᴏᴛ ɢᴇɴᴇʀᴀᴛᴇ ᴀ ᴘᴀɪʀɪɴɢ ᴄᴏᴅᴇ. Cʜᴇᴄᴋ ᴛʜᴇ ɴᴇᴛᴡᴏʀᴋ ᴄᴏɴɴᴇᴄᴛɪᴏɴ ᴀɴᴅ ᴛʀʏ ᴀɢᴀɪɴ.')
    }
  },
}
