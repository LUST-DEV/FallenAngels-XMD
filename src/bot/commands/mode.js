const { User } = require('../../database')

module.exports = {
  name: 'mode',
  desc: 'Passe le bot en mode privé ou public',
  ownerOnly: true,
  async run({ args, numero, reply, prefix }) {
    const mode = args[0]?.toLowerCase()
    if (mode && !['private', 'public'].includes(mode)) {
      return reply(`> ❌ 𝐔ꜱᴀɢᴇ: ${prefix}mode private/public`)
    }

    if (!mode) {
      const user = await User.findByPk(numero, { attributes: ['botMode'] })
      if (!user) throw new Error(`Nᴏ ᴜsᴇʀ ғᴏᴜɴᴅ ғᴏʀ ᴛʜᴇ ɴᴜᴍʙᴇʀ: ${numero}.`)
      return reply(`> ✦ 𝐁ᴏᴛ ᴍᴏᴅᴇ: ${user.botMode === 'private' ? 'Pʀɪᴠᴀᴛᴇ' : 'Pᴜʙʟɪᴄ'}`)
    }

    const [updatedUsers] = await User.update({ botMode: mode }, { where: { numero } })
    if (updatedUsers === 0) {
      throw new Error(`Nᴏ ᴜsᴇʀ ғᴏᴜɴᴅ ғᴏʀ ᴛʜᴇ ɴᴜᴍʙᴇʀ: ${numero}.`)
    }

    const description = mode === 'private'
      ? 'ᴏɴʟʏ ʏᴏᴜʀ ᴍᴇssᴀɢᴇs ᴡɪʟʟ ɢᴇᴛ ʀᴇᴘʟɪᴇs.'
      : 'ʏᴏᴜ ᴀɴᴅ ᴇᴠᴇʀʏᴏɴᴇ ᴇʟsᴇ ᴄᴀɴ ɢᴇᴛ ʀᴇᴘʟɪᴇs.'
    await reply(`> ✅ 𝐁ᴏᴛ ᴍᴏᴅᴇ sᴇᴛ ᴛᴏ ${mode === 'private' ? 'Pʀɪᴠᴀᴛᴇ' : 'Pᴜʙʟɪᴄ'}.\n${description}`)
  },
}
