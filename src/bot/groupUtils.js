function sameJid(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false
  const normalize = (jid) => jid.split('@')[0].split(':')[0]
  return normalize(left) === normalize(right)
}

function isGroupJid(jid) {
  return typeof jid === 'string' && jid.endsWith('@g.us')
}

function participantJid(participant) {
  return participant.jid || participant.id || participant.lid || participant.phoneNumber
}

function jidVariants(value) {
  if (!value) return []
  if (typeof value === 'string') return [value]
  return [value.jid, value.id, value.lid, value.phoneNumber].filter(Boolean)
}

function anyJidMatches(left, right) {
  return left.some((leftJid) => right.some((rightJid) => sameJid(leftJid, rightJid)))
}

function isAdminParticipant(participant) {
  return participant?.admin === 'admin' || participant?.admin === 'superadmin' ||
    participant?.isAdmin === true || participant?.isSuperAdmin === true
}

async function getGroupContext(sock, msg, { requireBotAdmin = false } = {}) {
  const groupJid = msg.key.remoteJid
  if (!isGroupJid(groupJid)) {
    return { error: ' 𝗧ʜɪs ᴄᴏᴍᴍᴀɴᴅ ᴍᴜsᴛ ʙᴇ ᴜsᴇᴅ ɪɴ ᴀ WʜᴀᴛsAᴘᴘ ɢʀᴏᴜᴘ.' }
  }

  const metadata = await sock.groupMetadata(groupJid)
  const participants = metadata.participants || []
  const botJids = jidVariants(sock.user)
  const senderJids = msg.key.fromMe
    ? botJids
    : [...jidVariants(msg.key.participant), ...jidVariants(msg.key.participantAlt)]
  const sender = participants.find((participant) =>
    anyJidMatches(jidVariants(participant), senderJids),
  )
  const bot = participants.find((participant) =>
    anyJidMatches(jidVariants(participant), botJids),
  )
  const groupOwnerJids = [...jidVariants(metadata.owner), ...jidVariants(metadata.ownerPn)]
  const isGroupOwner = anyJidMatches(senderJids, groupOwnerJids)
  const isAdmin = msg.key.fromMe || isGroupOwner || isAdminParticipant(sender)
  const botIsAdmin = isAdminParticipant(bot)

  if (!isAdmin) return { error: ' 𝗧ʜɪs ᴄᴏᴍᴍᴀɴᴅ ɪs ʀᴇsᴇʀᴠᴇᴅ ғᴏʀ ɢʀᴏᴜᴘ ᴀᴅᴍɪɴs.' }
  if (requireBotAdmin && !botIsAdmin) {
    return { error: ' 𝗧ʜᴇ ʙᴏᴛ ᴀᴄᴄᴏᴜɴᴛ ᴍᴜsᴛ ᴀʟsᴏ ʙᴇ ᴀ ɢʀᴏᴜᴘ ᴀᴅᴍɪɴ ᴛᴏ ᴘᴇʀғᴏʀᴍ ᴛʜɪs ᴀᴄᴛɪᴏɴ.' }
  }

  return { groupJid, metadata, participants, senderJid: senderJids[0], botJid: botJids[0], isAdmin, botIsAdmin }
}

function mentionedParticipants(msg) {
  const context = msg.message?.extendedTextMessage?.contextInfo
  const mentions = context?.mentionedJid || []
  const quotedParticipant = context?.participant
  return [...new Set([...mentions, ...(quotedParticipant ? [quotedParticipant] : [])])]
}

function participantNumber(jid) {
  return jid?.split('@')[0]?.split(':')[0] || ''
}

module.exports = {
  getGroupContext,
  isGroupJid,
  isAdminParticipant,
  anyJidMatches,
  jidVariants,
  mentionedParticipants,
  participantJid,
  participantNumber,
  sameJid,
}
