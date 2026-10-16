const logger = require('../../logger')

module.exports = {
  name: 'leave',
  desc: 'Make the bot leave the current group',
  ownerOnly: true,
  async run({ sock, msg, jid, reply }) {
    if (!jid?.endsWith('@g.us')) {
      return reply('> ❌ 𝐔sᴇ .leave ɪɴsɪᴅᴇ ᴛʜᴇ ɢʀᴏᴜᴘ ᴛʜᴀᴛ ᴛʜᴇ ʙᴏᴛ sʜᴏᴜʟᴅ ʟᴇᴀᴠᴇ.')
    }

    await reply('> † 𝐓ʜᴇ ʙᴏᴛ ɪs ʟᴇᴀᴠɪɴɢ ᴛʜɪs ɢʀᴏᴜᴘ.')
    try {
      return await sock.groupLeave(jid)
    } catch (error) {
      logger.error({ jid, err: error.message }, 'bot failed to leave group')
      return sock.sendMessage(jid, {
        text: '> ❌ 𝐂ᴏᴜʟᴅ ɴᴏᴛ ʟᴇᴀᴠᴇ ᴛʜᴇ ɢʀᴏᴜᴘ. 𝐏ʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ.',
      }, { quoted: msg })
    }
  },
}
