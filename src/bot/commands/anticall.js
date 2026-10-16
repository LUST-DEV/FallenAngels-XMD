const { User } = require('../../database')

module.exports = {
  name: 'anticall',
  desc: 'Block incoming WhatsApp calls',
  ownerOnly: true,
  async run({ args, numero, reply, prefix }) {
    const status = args[0]?.toLowerCase()
    if (!['on', 'off'].includes(status) || args.length !== 1) {
      return reply(`> ❌ 𝐔sᴀɢᴇ: ${prefix}anticall on/off`)
    }

    const [updatedUsers] = await User.update(
      { anticallEnabled: status === 'on' },
      { where: { numero } },
    )

    if (updatedUsers === 0) {
      throw new Error(`Nᴏ ᴜsᴇʀ ғᴏᴜɴᴅ ғᴏʀ ᴛʜᴇ ɴᴜᴍʙᴇʀ: ${numero}.`)
    }

    return reply(`> 📵 𝐀ɴᴛɪᴄᴀʟʟ ${status === 'on' ? 'ᴇɴᴀʙʟᴇᴅ ✅ — ɪɴᴄᴏᴍɪɴɢ ᴄᴀʟʟs ᴡɪʟʟ ʙᴇ ʀᴇᴊᴇᴄᴛᴇᴅ.' : 'ᴅɪsᴀʙʟᴇᴅ ❌ — ɪɴᴄᴏᴍɪɴɢ ᴄᴀʟʟs ᴀʀᴇ ᴀʟʟᴏᴡᴇᴅ.'}`)
  },
}
