const { User } = require('../../database')

module.exports = {
  name: 'autoreact',
  aliases: ['autoreacr'],
  desc: 'Réagit automatiquement aux statuts des contacts',
  ownerOnly: true,
  async run({ args, numero, reply, prefix }) {
    const status = args[0]?.toLowerCase()
    if (!['on', 'off'].includes(status)) {
      return reply(`> ❌ ᴜsᴀɢᴇ: ${prefix}autoreact on/off`)
    }

    const [updatedUsers] = await User.update(
      { autoreact: status === 'on' },
      { where: { numero } },
    )

    if (updatedUsers === 0) {
      throw new Error(`Nᴏ ᴜsᴇʀ ғᴏᴜɴᴅ ғᴏʀ ᴛʜᴇ ɴᴜᴍʙᴇʀ: ${numero}.`)
    }

    await reply(`> ❤️ ᴀᴜᴛᴏ-ʀᴇᴀᴄᴛ: ${status === 'on' ? 'ᴇɴᴀʙʟᴇᴅ ✅' : 'ᴅɪsᴀʙʟᴇᴅ ❌'}`)
  },
}
