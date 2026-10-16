const { User } = require('../../database')

module.exports = {
  name: 'autoread',
  desc: 'Marque automatiquement comme lus les messages privés reçus',
  ownerOnly: true,
  async run({ args, numero, reply, prefix }) {
    const action = args[0]?.toLowerCase()
    const currentUser = await User.findByPk(numero, { attributes: ['autoread'] })
    if (!currentUser) {
      throw new Error(`Nᴏ ᴜsᴇʀ ғᴏᴜɴᴅ ғᴏʀ ᴛʜᴇ ɴᴜᴍʙᴇʀ: ${numero}.`)
    }

    let enabled
    if (action === 'on' || action === 'enable') enabled = true
    else if (action === 'off' || action === 'disable') enabled = false
    else if (action === undefined) enabled = !currentUser.autoread
    else return reply(`> ❌ 𝗨sᴀɢᴇ: ${prefix}autoread on/off`)

    await currentUser.update({ autoread: enabled })

    await reply(`> 👁️ ᴀᴜᴛᴏ-ʀᴇᴀᴅ: ${enabled ? '𝗘ɴᴀʙʟᴇᴅ ✅' : '𝗗ɪsᴀʙʟᴇᴅ ❌'}`)
  },
}
