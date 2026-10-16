const { User } = require('../../database')

module.exports = {
  name: 'autostatus',
  desc: 'Automatically views contact statuses',
  ownerOnly: true,
  async run({ args, numero, reply, prefix }) {
    const user = await User.findByPk(numero, { attributes: ['autostatus', 'autoreact'] })
    if (!user) {
      throw new Error(`Nᴏ ᴜsᴇʀ ғᴏᴜɴᴅ ғᴏʀ ᴛʜᴇ ɴᴜᴍʙᴇʀ: ${numero}.`)
    }

    const [action, value] = args.map((arg) => arg.toLowerCase())
    if (!action) {
      return reply(
        '╭─❮ 𓆩 𝗔ᴜᴛᴏ 𝗦ᴛᴀᴛᴜs 𓆪 ❯\n' +
        `│ 🝐 𝗩ɪᴇᴡ ➪ ${user.autostatus ? '𝗢ɴ' : '𝗢ғғ'}\n` +
        `│ ⸸ 𝗥ᴇᴀᴄᴛ ➪ ${user.autoreact ? '𝗢ɴ' : '𝗢ғғ'}\n` +
        '╰─────────────────────────\n' +
        `\n𓆩 ${prefix}autostatus on/off\n𓆩 ${prefix}autostatus react on/off`,
      )
    }

    if (action === 'on' || action === 'off') {
      const enabled = action === 'on'
      await user.update({ autostatus: enabled })
      return reply(
        `╭─❮ 🝐 𝗔ᴜᴛᴏ 𝗦ᴛᴀᴛᴜs ❯\n` +
        `│ ⸸ 𝗔ᴜᴛᴏ-𝗩ɪᴇᴡ ➪ ${enabled ? '𝗘ɴᴀʙʟᴇᴅ' : '𝗗ɪsᴀʙʟᴇᴅ'}\n` +
        '╰─────────────────────────',
      )
    }

    if (action === 'react' && (value === 'on' || value === 'off') && args.length === 2) {
      const enabled = value === 'on'
      await user.update({ autoreact: enabled })
      return reply(
        `╭─❮ 🝐 𝗔ᴜᴛᴏ 𝗦ᴛᴀᴛᴜs ❯\n` +
        `│ ⸸ 𝗦ᴛᴀᴛᴜs 𝗥ᴇᴀᴄᴛ ➪ ${enabled ? '𝗘ɴᴀʙʟᴇᴅ 💚' : '𝗗ɪsᴀʙʟᴇᴅ'}\n` +
        '╰─────────────────────────',
      )
    }

    return reply(
      `╭─❮ ⸸ 𝗜ɴᴠᴀʟɪᴅ 𝗢ᴘᴛɪᴏɴ ❯\n` +
      `│ 🝓 ${prefix}autostatus on/off\n` +
      `│ 🝓 ${prefix}autostatus react on/off\n` +
      '╰─────────────────────────',
    )
  },
}
