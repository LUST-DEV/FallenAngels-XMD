const { normalizeMessageContent } = require('@whiskeysockets/baileys')
const { GroupSetting } = require('../database')
const logger = require('../logger')
const { participantJid, sameJid } = require('./groupUtils')

const LINK_PATTERN = /(?:https?:\/\/|www\.)[^\s<>()]+|\b(?:[\w-]+\.)+[a-z]{2,}(?:\/[^\s<>()]*)?/i

function messageText(message) {
  const content = normalizeMessageContent(message)
  return content.conversation
    || content.extendedTextMessage?.text
    || content.imageMessage?.caption
    || content.videoMessage?.caption
    || content.documentMessage?.caption
    || ''
}

async function moderateGroupMessage(sock, msg) {
  const groupJid = msg.key.remoteJid
  if (!groupJid?.endsWith('@g.us') || msg.key.fromMe) return

  const text = messageText(msg.message)
  if (!LINK_PATTERN.test(text)) return

  const settings = await GroupSetting.findByPk(groupJid, {
    attributes: ['antilinkEnabled'],
  })
  if (!settings?.antilinkEnabled) return

  const metadata = await sock.groupMetadata(groupJid)
  const participants = metadata.participants || []
  const senderJid = msg.key.participant
  const sender = participants.find((participant) => sameJid(participantJid(participant), senderJid))
  if (sender?.admin === 'admin' || sender?.admin === 'superadmin') return

  const botJid = sock.user?.id
  const bot = participants.find((participant) => sameJid(participantJid(participant), botJid))
  const botIsAdmin = bot?.admin === 'admin' || bot?.admin === 'superadmin'

  if (botIsAdmin) {
    try {
      await sock.sendMessage(groupJid, { delete: msg.key })
    } catch (error) {
      logger.warn({ groupJid, senderJid, err: error.message }, 'échec de suppression du lien interdit')
      await sock.sendMessage(groupJid, {
        text: '🚫 𝐋ɪɴᴋs ᴀʀᴇ ɴᴏᴛ ᴀʟʟᴏᴡᴇᴅ ɪɴ ᴛʜɪs ɢʀᴏᴜᴘ. Tʜᴇ ʙᴏᴛ ᴄᴏᴜʟᴅ ɴᴏᴛ ᴅᴇʟᴇᴛᴇ ᴛʜᴇ ᴍᴇssᴀɢᴇ.',
      })
      return
    }

    await sock.sendMessage(groupJid, {
      text: '🚫 𝐋ɪɴᴋs ᴀʀᴇ ɴᴏᴛ ᴀʟʟᴏᴡᴇᴅ ɪɴ ᴛʜɪs ɢʀᴏᴜᴘ.',
    })
    return
  }

  await sock.sendMessage(groupJid, {
    text: '⚠️ 𝐀ɴᴛɪʟɪɴᴋ ɪs ᴇɴᴀʙʟᴇᴅ, ʙᴜᴛ ᴛʜᴇ ʙᴏᴛ ᴍᴜsᴛ ʙᴇ ᴀɴ ᴀᴅᴍɪɴ ᴛᴏ ᴅᴇʟᴇᴛᴇ ʟɪɴᴋs.',
  })
}

module.exports = { moderateGroupMessage }
