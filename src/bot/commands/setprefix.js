const { User } = require('../../database')
const { setCachedPrefix } = require('../userCache')

module.exports = {
  name: 'setprefix',
  desc: 'Change the bot command prefix',
  ownerOnly: true,
  async run({ args, numero, reply, prefix }) {
    const newPrefix = args[0]
    if (args.length !== 1 || !newPrefix || !/^[^\s\p{L}\p{N}]{1,3}$/u.test(newPrefix)) {
      return reply([
        '╭─❮ 𓆩 𝐏ʀᴇғɪx 𝐒ᴇᴛᴛɪɴɢs 𓆪 ❯',
        `│ ✠ 𝐔sᴀɢᴇ ➪ ${prefix}setprefix <symbol>`,
        '│ ✠ 𝐑ᴜʟᴇs ➪ 1–3 symbols only; no letters or numbers.',
        `│ ✠ 𝐄xᴀᴍᴘʟᴇ ➪ ${prefix}setprefix !`,
        '╰─────────────────────────',
      ].join('\n'))
    }

    const [updatedUsers] = await User.update(
      { prefix: newPrefix },
      { where: { numero } },
    )
    if (updatedUsers === 0) {
      throw new Error(`Nᴏ ᴜsᴇʀ ғᴏᴜɴᴅ ғᴏʀ ᴛʜᴇ ɴᴜᴍʙᴇʀ: ${numero}.`)
    }

    setCachedPrefix(numero, newPrefix)
    return reply([
      '╭─❮ 𓆩 𝐏ʀᴇғɪx 𝐔ᴘᴅᴀᴛᴇᴅ 𓆪 ❯',
      `│ ✠ 𝐍ᴇᴡ 𝐏ʀᴇғɪx ➪ 『 ${newPrefix} 』`,
      `│ ✠ 𝐄xᴀᴍᴘʟᴇ ➪ ${newPrefix}menu`,
      '╰─────────────────────────',
    ].join('\n'))
  },
}