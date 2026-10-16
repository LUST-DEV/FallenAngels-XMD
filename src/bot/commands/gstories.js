const { downloadContentFromMessage, normalizeMessageContent } = require('@whiskeysockets/baileys')
const logger = require('../../logger')

async function downloadMedia(message, type) {
  const stream = await downloadContentFromMessage(message, type)
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks)
}

function quotedText(message) {
  return (
    message?.conversation ||
    message?.extendedTextMessage?.text ||
    message?.imageMessage?.caption ||
    message?.videoMessage?.caption ||
    ''
  )
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

module.exports = {
  name: 'gstories',
  aliases: ['gstatut'],
  desc: 'Partage un texte ou un média dans tous les groupes (propriétaire)',
  ownerOnly: true,
  async run({ sock, msg, args, reply }) {
    const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedContent = quotedMessage ? normalizeMessageContent(quotedMessage) : null
    const text = args.join(' ').trim() || quotedText(quotedContent).trim()
    const mediaEntry = quotedContent && [
      ['imageMessage', 'image'],
      ['videoMessage', 'video'],
      ['audioMessage', 'audio'],
    ].find(([key]) => quotedContent[key])

    if (!text && !mediaEntry) {
      return reply('> ❌ 𝐀ᴅᴅ ᴛᴇxᴛ ᴏʀ ʀᴇᴘʟʏ ᴛᴏ ᴀɴ ɪᴍᴀɢᴇ, ᴠɪᴅᴇᴏ, ᴏʀ ᴀᴜᴅɪᴏ ғɪʟᴇ.')
    }

    let media
    let mediaType
    if (mediaEntry) {
      const [messageKey, type] = mediaEntry
      mediaType = type
      media = await downloadMedia(quotedContent[messageKey], mediaType)
    }

    let groups
    try {
      groups = await sock.groupFetchAllParticipating()
    } catch (error) {
      logger.error({ err: error.message }, '𝐔ɴᴀʙʟᴇ ᴛᴏ ʀᴇᴛʀɪᴇᴠᴇ ᴛʜᴇ ɢʀᴏᴜᴘ ʟɪsᴛ.')
      return reply('> ❌ 𝐔ɴᴀʙʟᴇ ᴛᴏ ʀᴇᴛʀɪᴇᴠᴇ ᴛʜᴇ ɢʀᴏᴜᴘ ʟɪsᴛ. ᴘʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ.')
    }

    const groupIds = Object.keys(groups)
    if (groupIds.length === 0) return reply('> 𝐍ᴏ ɢʀᴏᴜᴘs ᴀᴠᴀɪʟᴀʙʟᴇ ғᴏʀ ᴛʜɪs ᴅᴇᴠɪᴄᴇ')

    await reply(`> 🚀 ꜱᴇɴᴅɪɴɢ ᴛʜᴇ ꜱᴛᴏʀʏ ɪɴ ${groupIds.length} ɢʀᴏᴜᴘ…`)

    let successCount = 0
    const failures = []

    for (const groupId of groupIds) {
      try {
        const metadata = await sock.groupMetadata(groupId)
        const participants = metadata.participants.map((participant) => participant.id)
        const contextInfo = {
          mentionedJid: participants,
          isGroupStatus: true,
        }
        const options = { statusJidList: participants }
        let content

        if (!media) {
          content = {
            text,
            backgroundColor: '#000000',
            contextInfo,
          }
        } else if (mediaType === 'image') {
          content = { image: media, caption: text, contextInfo }
        } else if (mediaType === 'video') {
          content = { video: media, caption: text, contextInfo }
        } else {
          content = { audio: media, mimetype: 'audio/mp4', ptt: false, contextInfo }
        }

        await sock.sendMessage(groupId, content, options)
        if (mediaType === 'audio' && text) {
          await sock.sendMessage(groupId, { text, contextInfo }, options)
        }
        successCount++
      } catch (error) {
        failures.push(groupId)
        logger.warn({ groupId, err: error.message }, 'échec de gstories pour un groupe')
      }

      if (successCount + failures.length < groupIds.length) await wait(2000)
    }

    const failureSummary = failures.length
      ? `\n❌ Échecs : ${failures.length} groupe(s).`
      : ''
    await reply(`> ✅ Sᴛᴏʀɪᴇs ꜱᴇɴᴛ ɪɴ  ${successCount}/${groupIds.length} ɢʀᴏᴜᴘꜱ(s).${failureSummary}`)
  },
}
