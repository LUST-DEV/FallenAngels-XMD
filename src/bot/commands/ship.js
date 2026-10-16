const { mentionedParticipants, participantNumber } = require('../groupUtils')

function compatibilityScore(first, second) {
  const input = [first, second].sort().join(':')
  let hash = 0
  for (const character of input) {
    hash = (hash * 31 + character.charCodeAt(0)) % 101
  }
  return hash
}

module.exports = {
  name: 'ship',
  desc: 'Generate a playful compatibility score for two people',
  async run({ sock, msg, jid, reply }) {
    const targets = mentionedParticipants(msg).slice(0, 2)
    if (targets.length === 1) {
      targets.push(msg.key.fromMe ? sock.user?.id : msg.key.participant || jid)
    } else if (!targets.length) {
      return reply('> 𝐌ᴇɴᴛɪᴏɴ ᴀ ᴘᴇʀsᴏɴ ᴏʀ ᴛᴡᴏ ᴘᴇᴏᴘʟᴇ ᴛᴏ sʜɪᴘ.')
    }

    const score = compatibilityScore(targets[0], targets[1])
    const first = participantNumber(targets[0])
    const second = participantNumber(targets[1])
    await sock.sendMessage(jid, {
      text: `> 💞 𝐂ᴏᴍᴘᴀᴛɪʙɪʟɪᴛʏ: ${score}%\n@${first} ✦ @${second}`,
      mentions: targets,
    }, { quoted: msg })
  },
}
