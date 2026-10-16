const answers = [
  '𝐘ᴇs, ᴅᴇғɪɴɪᴛᴇʟʏ.',
  '𝐈ᴛ ʟᴏᴏᴋs ᴘʀᴏᴍɪsɪɴɢ.',
  '𝐖ɪᴛʜᴏᴜᴛ ᴀ ᴅᴏᴜʙᴛ.',
  '𝐀sᴋ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ.',
  '𝐁ᴇᴛᴛᴇʀ ɴᴏᴛ ᴛᴏ ᴛᴇʟʟ ʏᴏᴜ ɴᴏᴡ.',
  '𝐃ᴏɴ’ᴛ ᴄᴏᴜɴᴛ ᴏɴ ɪᴛ.',
  '𝐌ʏ ʀᴇᴘʟʏ ɪs ɴᴏ.',
  '𝐓ʜᴇ ᴏᴜᴛʟᴏᴏᴋ ɪs ᴜɴᴄʟᴇᴀʀ.',
]

module.exports = {
  name: '8ball',
  desc: 'Ask the magic 8-ball a question',
  async run({ args, reply }) {
    if (!args.join(' ').trim()) return reply('> 𝐔ꜱᴀɢᴇ: .8ball <ʏᴏᴜʀ ǫᴜᴇsᴛɪᴏɴ>')
    const answer = answers[Math.floor(Math.random() * answers.length)]
    return reply(`> 🎱 ${answer}`)
  },
}
