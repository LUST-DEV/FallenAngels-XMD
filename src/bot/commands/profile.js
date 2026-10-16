const { mentionedParticipants, participantNumber } = require('../groupUtils')

module.exports = {
  name: 'profile',
  aliases: ['me'],
  desc: 'Show your profile or a mentioned group member',
  async run({ sock, msg, jid, reply }) {
    const targets = mentionedParticipants(msg)
    const target = targets[0] || (msg.key.fromMe ? sock.user?.id : msg.key.participant || jid)
    if (!target) return reply('> Cᴏᴜʟᴅ ɴᴏᴛ ᴅᴇᴛᴇʀᴍɪɴᴇ ᴛʜᴇ ᴘʀᴏғɪʟᴇ ᴜsᴇʀ.')

    let role = 'Dɪʀᴇᴄᴛ ᴄᴏɴᴛᴀᴄᴛ'
    if (jid.endsWith('@g.us')) {
      const metadata = await sock.groupMetadata(jid)
      const participant = (metadata.participants || []).find((entry) =>
        entry.id === target || entry.jid === target || entry.lid === target,
      )
      if (participant?.admin === 'admin' || participant?.admin === 'superadmin') role = 'Gʀᴏᴜᴘ ᴀᴅᴍɪɴ'
      else if (participant) role = 'Gʀᴏᴜᴘ ᴍᴇᴍʙᴇʀ'
    }

    const name = target === (msg.key.participant || jid) && msg.pushName
      ? msg.pushName
      : participantNumber(target)
    await sock.sendMessage(jid, {
      text: `👤 𝐏ʀᴏғɪʟᴇ\n✦ Nᴀᴍᴇ: ${name}\n✦ 𝐍ᴜᴍʙᴇʀ: +${participantNumber(target)}\n✦ 𝐑ᴏʟᴇ: ${role}`,
      mentions: targets.length ? [target] : [],
    }, { quoted: msg })
  },
}
