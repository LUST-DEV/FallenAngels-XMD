const { GroupSetting } = require('../database')
const logger = require('../logger')
const { anyJidMatches, isAdminParticipant, jidVariants } = require('./groupUtils')

const messageTimes = new Map()
const noticeTimes = new Map()
const MUTE_NOTICE_INTERVAL_MS = 15_000
const BOT_ADMIN_NOTICE_INTERVAL_MS = 60_000
let checksSinceCleanup = 0

function clearGroupSlowmode(groupJid) {
  for (const key of messageTimes.keys()) {
    if (key.startsWith(`${groupJid}:`)) messageTimes.delete(key)
  }
  for (const key of noticeTimes.keys()) {
    if (key.startsWith(`${groupJid}:`)) noticeTimes.delete(key)
  }
}

function cleanupExpiredEntries(now) {
  if (++checksSinceCleanup < 100) return
  checksSinceCleanup = 0
  for (const [key, timestamp] of messageTimes) {
    if (now - timestamp > 3_600_000) messageTimes.delete(key)
  }
  for (const [key, timestamp] of noticeTimes) {
    if (now - timestamp > 3_600_000) noticeTimes.delete(key)
  }
}

async function sendLimitedNotice(sock, groupJid, key, now, interval, text, mentions) {
  if (now - (noticeTimes.get(key) || 0) < interval) return
  noticeTimes.set(key, now)
  await sock.sendMessage(groupJid, { text, ...(mentions ? { mentions } : {}) })
}

async function enforceGroupSlowmode(sock, msg) {
  const groupJid = msg.key.remoteJid
  if (!groupJid?.endsWith('@g.us') || msg.key.fromMe || !msg.key.participant) return

  const settings = await GroupSetting.findByPk(groupJid, {
    attributes: ['slowmodeSeconds'],
  })
  const seconds = settings?.slowmodeSeconds || 0
  if (!seconds) return

  const now = Date.now()
  cleanupExpiredEntries(now)
  const senderJids = [...jidVariants(msg.key.participant), ...jidVariants(msg.key.participantAlt)]
  const senderJid = senderJids[0] || msg.key.participant
  const metadata = await sock.groupMetadata(groupJid)
  const participants = metadata.participants || []
  const sender = participants.find((participant) =>
    anyJidMatches(jidVariants(participant), senderJids),
  )
  const groupOwnerJids = [...jidVariants(metadata.owner), ...jidVariants(metadata.ownerPn)]
  if (isAdminParticipant(sender) || anyJidMatches(senderJids, groupOwnerJids)) return

  const botJids = jidVariants(sock.user)
  const bot = participants.find((participant) =>
    anyJidMatches(jidVariants(participant), botJids),
  )
  if (!isAdminParticipant(bot)) {
    const noticeKey = `${groupJid}:bot-admin`
    try {
      await sendLimitedNotice(
        sock,
        groupJid,
        noticeKey,
        now,
        BOT_ADMIN_NOTICE_INTERVAL_MS,
        '> ⚠️ 𝐒ʟᴏᴡᴍᴏᴅᴇ ɪs sᴇᴛ, ʙᴜᴛ ᴛʜᴇ ʙᴏᴛ ɴᴇᴇᴅs ɢʀᴏᴜᴘ ᴀᴅᴍɪɴ ᴘᴇʀᴍɪssɪᴏɴs ᴛᴏ ᴇɴғᴏʀᴄᴇ ɪᴛ.',
      )
    } catch (error) {
      logger.warn({ groupJid, err: error.message }, 'unable to notify that slowmode needs bot admin permissions')
    }
    return
  }

  const key = `${groupJid}:${senderJid}`
  const lastMessageAt = messageTimes.get(key)
  if (!lastMessageAt || now - lastMessageAt >= seconds * 1000) {
    messageTimes.set(key, now)
    return
  }

  try {
    await sock.sendMessage(groupJid, { delete: msg.key })
  } catch (error) {
    logger.warn({ groupJid, senderJid, err: error.message }, 'failed to delete a slowmode message')
    await sendLimitedNotice(
      sock,
      groupJid,
      `${key}:delete`,
      now,
      MUTE_NOTICE_INTERVAL_MS,
      `> ⚠️ 𝐏ʟᴇᴀsᴇ ᴡᴀɪᴛ ${seconds} sᴇᴄᴏɴᴅs ʙᴇᴛᴡᴇᴇɴ ᴍᴇssᴀɢᴇs. Tʜᴇ ʙᴏᴛ ᴄᴏᴜʟᴅ ɴᴏᴛ ᴅᴇʟᴇᴛᴇ ʏᴏᴜʀ ᴍᴇssᴀɢᴇ.`,
      [senderJid],
    )
    return
  }

  await sendLimitedNotice(
    sock,
    groupJid,
    `${key}:notice`,
    now,
    MUTE_NOTICE_INTERVAL_MS,
    `> ⚠️ 𝐏ʟᴇᴀsᴇ ᴡᴀɪᴛ ${seconds} sᴇᴄᴏɴᴅs ʙᴇᴛᴡᴇᴇɴ ᴍᴇssᴀɢᴇs.`,
    [senderJid],
  )
}

module.exports = { clearGroupSlowmode, enforceGroupSlowmode }
