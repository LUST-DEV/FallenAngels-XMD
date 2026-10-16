module.exports = {
  name: 'devinfo',
  desc: 'Show the developer Telegram contact',
  async run({ reply }) {
    return reply([
      '╭─❮ 𓆩 𝐃ᴇᴠᴇʟᴏᴘᴇʀ 𝐈ɴғᴏ 𓆪 ❯',
      '│ ✦ 𝐓ᴇʟᴇɢʀᴀᴍ: https://t.me/Seniors_angels',
      '╰───────────────────────',
    ].join('\n'))
  },
}
