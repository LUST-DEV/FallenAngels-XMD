const { User } = require('../../database')

module.exports = {
  name: 'autotyping',
  desc: 'Active ou désactive l’indicateur de saisie',
  ownerOnly: true,
  async run({ args, numero, reply, prefix }) {
    const status = args[0]?.toLowerCase()
    if (!['on', 'off'].includes(status)) {
      return reply(`> ❌ 𝗨ꜱᴀɢᴇ :  ${prefix}ᴀᴜᴛᴏᴛʏᴘɪɴɢ ᴏɴ ᴏʀ ${prefix}ᴀᴜᴛᴏᴛʏᴘɪɴɢ ᴏꜰꜰ`)
    }

    const [updatedUsers] = await User.update(
      { autotyping: status === 'on' },
      { where: { numero } },
    )

    if (updatedUsers === 0) {
      throw new Error(`𝗡ᴏ ᴜsᴇʀ ғᴏᴜɴᴅ ғᴏʀ ᴛʜᴇ ɴᴜᴍʙᴇʀ :  ${numero}.`)
    }

    await reply(`> ⌨️ ᴀᴜᴛᴏ-ᴛʏᴘɪɴɢ : ${status === 'on' ? '𝗘ɴᴀʙʟᴇᴅ  ✅' : '𝗗ɪꜱᴀʙʟᴇᴅ ❌'}`)
  },
}
