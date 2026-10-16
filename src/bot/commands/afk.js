const { setAfkStatus, clearAfkStatus } = require('../afk')

module.exports = {
  name: 'afk',
  desc: 'Set or clear your away status',
  async run({ sock, msg, numero, args, reply }) {
    const senderJids = msg.key.fromMe
      ? [sock.user?.id, sock.user?.lid].filter(Boolean)
      : msg.key.remoteJid?.endsWith('@g.us')
        ? [...new Set([msg.key.participant, msg.key.participantAlt].filter(Boolean))]
        : [msg.key.remoteJid].filter(Boolean)
    if (senderJids.length === 0) {
      throw new Error('Could not determine the sender for the AFK status.')
    }

    if (args[0]?.toLowerCase() === 'off') {
      const cleared = await clearAfkStatus(numero, senderJids)
      return reply(cleared
        ? '> ✅ 𝐘ᴏᴜ ᴀʀᴇ ɴᴏ ʟᴏɴɢᴇʀ ᴀᴡᴀʏ.'
        : '> ℹ️ 𝐘ᴏᴜ ᴡᴇʀᴇ ɴᴏᴛ ᴍᴀʀᴋᴇᴅ ᴀs ᴀᴡᴀʏ.')
    }

    const reason = args.join(' ').trim().slice(0, 300) || 'No reason given'
    await setAfkStatus(numero, senderJids, reason)
    return reply(`> 🌙 𝐀ғᴋ ᴇɴᴀʙʟᴇᴅ. 𝐑ᴇᴀsᴏɴ: ${reason}\n𝐘ᴏᴜ’ʟʟ ʙᴇ ᴍᴀʀᴋᴇᴅ ʙᴀᴄᴋ ᴡʜᴇɴ ʏᴏᴜ sᴇɴᴅ ᴀ ᴍᴇssᴀɢᴇ.`)
  },
}
