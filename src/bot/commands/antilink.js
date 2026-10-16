const { GroupSetting } = require('../../database')
const { getGroupContext } = require('../groupUtils')

module.exports = {
  name: 'antilink',
  desc: 'Active ou désactive la suppression des liens dans un groupe',
  async run({ sock, msg, args, reply, prefix }) {
    const status = args[0]?.toLowerCase()
    if (!['on', 'off'].includes(status)) {
      return reply(`> ❌ 𝐔ꜱᴀɢᴇ: ${prefix}antilink on/off`)
    }

    const context = await getGroupContext(sock, msg, { requireBotAdmin: status === 'on' })
    if (context.error) return reply(context.error)

    const [settings] = await GroupSetting.findOrCreate({
      where: { groupJid: context.groupJid },
    })
    const enabled = status === 'on'
    await settings.update({ antilinkEnabled: enabled })

    return reply(`> ${enabled ? '> 🔗 𝐀ɴᴛɪʟɪɴᴋ ᴇɴᴀʙʟᴇᴅ' : '> 🔓 𝐀ɴᴛɪʟɪɴᴋ ᴅɪsᴀʙʟᴇᴅ'} ғᴏʀ ᴛʜɪs ɢʀᴏᴜᴘ.`)
  },
}
