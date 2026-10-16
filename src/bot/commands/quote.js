const quotes = [
  '𝐘ᴏᴜ ᴀʀᴇ ᴍᴏʀᴇ ᴛʜᴀɴ ᴛʜᴇ ᴡᴏʀsᴛ ᴛʜɪɴɢ ᴛʜᴀᴛ ʜᴀᴘᴘᴇɴᴇᴅ ᴛᴏ ʏᴏᴜ.',
  '𝐄ᴠᴇɴ ᴛʜᴇ ᴅᴀʀᴋᴇsᴛ ɴɪɢʜᴛ ᴡɪʟʟ ᴇɴᴅ, ᴀɴᴅ ᴛʜᴇ sᴜɴ ᴡɪʟʟ ʀɪsᴇ.',
  'Sᴍᴀʟʟ sᴛᴇᴘs ᴀʀᴇ sᴛɪʟʟ ᴘʀᴏɢʀᴇss.',
  '𝐘ᴏᴜ ᴅᴏ ɴᴏᴛ ʜᴀᴠᴇ ᴛᴏ ʜᴀᴠᴇ ɪᴛ ᴀʟʟ ғɪɢᴜʀᴇᴅ ᴏᴜᴛ ᴛᴏ ᴋᴇᴇᴘ ɢᴏɪɴɢ.',
  '𝐁ᴇ ᴋɪɴᴅ ᴛᴏ ʏᴏᴜʀ ғᴜᴛᴜʀᴇ sᴇʟғ.',
]

module.exports = {
  name: 'quote',
  desc: 'Share a random uplifting quote',
  async run({ reply }) {
    const quote = quotes[Math.floor(Math.random() * quotes.length)]
    await reply([
      '╭─❮ 𓆩 𝐐ᴜᴏᴛᴇ 𓆪 ❯',
      `│ ✠ “${quote}”`,
      '╰───────────────────────',
    ].join('\n'))
  },
}
