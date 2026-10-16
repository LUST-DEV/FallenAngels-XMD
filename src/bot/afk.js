const { Op } = require('sequelize')
const { AfkStatus } = require('../database')
const logger = require('../logger')

function getSenderJids(sock, msg) {
  if (msg.key.fromMe) {
    return [sock.user?.id, sock.user?.lid].filter(Boolean)
  }

  if (msg.key.remoteJid?.endsWith('@g.us')) {
    return [...new Set([msg.key.participant, msg.key.participantAlt].filter(Boolean))]
  }

  return [msg.key.remoteJid].filter(Boolean)
}

function getContexts(content) {
  return Object.values(content)
    .map((value) => value?.contextInfo)
    .filter(Boolean)
}

function isAfkCommand(text, prefix) {
  if (!text.startsWith(prefix)) return false
  const [commandName] = text.slice(prefix.length).trim().split(/\s+/)
  return commandName?.toLowerCase() === 'afk'
}

async function setAfkStatus(numero, jids, reason) {
  const since = new Date()
  for (const jid of jids) {
    await AfkStatus.upsert({ numero, jid, reason, since })
  }
}

async function clearAfkStatus(numero, jids) {
  if (jids.length === 0) return 0
  return AfkStatus.destroy({ where: { numero, jid: { [Op.in]: jids } } })
}

async function handleAfkMessage(sock, numero, msg, content, text, prefix) {
  try {
    const chatJid = msg.key.remoteJid
    if (!chatJid || chatJid === 'status@broadcast') return

    const senderJids = getSenderJids(sock, msg)
    const isAfkCommandMessage = isAfkCommand(text, prefix)

    if (!isAfkCommandMessage && senderJids.length > 0) {
      const senderStatus = await AfkStatus.findOne({
        where: { numero, jid: { [Op.in]: senderJids } },
      })
      if (senderStatus) {
        await clearAfkStatus(numero, senderJids)
        const senderJid = senderJids[0]
        const message = msg.key.fromMe
          ? '𝐘ᴏᴜ ᴀʀᴇ ɴᴏ ʟᴏɴɢᴇʀ ᴀᴡᴀʏ.'
          : `𝐖ᴇʟᴄᴏᴍᴇ ʙᴀᴄᴋ, @${senderJid.split('@')[0].split(':')[0]}.`
        await sock.sendMessage(chatJid, {
          text: message,
          ...(chatJid.endsWith('@g.us') && !msg.key.fromMe ? { mentions: [senderJid] } : {}),
        }, { quoted: msg })
      }
    }

    if (!chatJid.endsWith('@g.us')) return
    const mentionedJids = [...new Set(getContexts(content).flatMap((context) => [
      ...(context.mentionedJid || []),
      context.participant,
    ]).filter((jid) => jid && !senderJids.includes(jid)))]
    if (mentionedJids.length === 0) return

    const statuses = await AfkStatus.findAll({
      where: { numero, jid: { [Op.in]: mentionedJids } },
    })
    const uniqueStatuses = [...new Map(
      statuses.map((status) => [`${status.reason}:${status.since.getTime()}`, status]),
    ).values()]
    if (uniqueStatuses.length === 0) return

    const lines = uniqueStatuses.map((status) => {
      const name = status.jid.split('@')[0].split(':')[0]
      const reason = status.reason ? ` — ${status.reason}` : ''
      return `│ 𓆩 @${name} ɪs ᴀᴡᴀʏ${reason}`
    })
    await sock.sendMessage(chatJid, {
      text: ['╭─❮ 𝐀ᴡᴀʏ 𝐍ᴏᴛɪᴄᴇ ❯', ...lines, '╰────────────────────'].join('\n'),
      mentions: uniqueStatuses.map((status) => status.jid),
    }, { quoted: msg })
  } catch (error) {
    logger.error({ numero, jid: msg.key.remoteJid, err: error.message }, 'failed to process AFK status')
  }
}

module.exports = { setAfkStatus, clearAfkStatus, handleAfkMessage }
