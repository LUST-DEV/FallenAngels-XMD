const logger = require('../../logger')

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

module.exports = {
  name: 'bcgroup',
  desc: 'Diffuser un message dans tous les groupes (propriétaire)',
  ownerOnly: true,
  async run({ sock, jid, args, prefix, reply }) {
    const message = args.join(' ').trim()
    if (!message) {
      return reply(`> 📌 Uꜱᴀɢᴇ: ${prefix}bcgroup your message`)
    }

    let groups
    try {
      groups = await sock.groupFetchAllParticipating()
    } catch (error) {
      logger.error({ jid, err: error.message }, 'échec de récupération des groupes pour le broadcast')
      return reply('> ❌ Impossible de récupérer la liste des groupes. Réessaie plus tard.')
    }

    const groupJids = Object.keys(groups)
    if (!groupJids.length) return reply('> Aucun groupe disponible pour le broadcast.')

    await reply(`> 📢 Diffusion en cours dans ${groupJids.length} groupe(s)…`)

    let sent = 0
    let failed = 0
    for (let index = 0; index < groupJids.length; index++) {
      const groupJid = groupJids[index]
      try {
        await sock.sendMessage(groupJid, {
          text: `📢 Bʀᴏᴀᴅᴄᴀsᴛ\n\n${message}`,
        })
        sent++
      } catch (error) {
        failed++
        logger.warn({ groupJid, err: error.message }, 'échec d’envoi du broadcast dans un groupe')
      }

      if (index < groupJids.length - 1) await wait(1000)
    }

    return reply(
      `> ✅ Dɪғғᴜsɪᴏɴ ᴛᴇʀᴍɪɴᴇ́ᴇ: ${sent}/${groupJids.length} groupe(s).` +
      (failed ? ` Échecs: ${failed}.` : ''),
    )
  },
}
