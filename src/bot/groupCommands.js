const fs = require('node:fs/promises')
const path = require('node:path')
const { GroupSetting, GroupWarning } = require('../database')
const { getGroupContext, mentionedParticipants, participantJid, participantNumber, sameJid } = require('./groupUtils')
const { clearGroupSlowmode } = require('./slowmode')
const logger = require('../logger')
const config = require('../config')

function phoneToJid(input) {
  const digits = input.replace(/\D/g, '')
  return /^\d{7,15}$/.test(digits) ? `${digits}@s.whatsapp.net` : null
}

function requestedParticipantJid(request) {
  return request?.jid || request?.id || request?.participant
}

function commandTargets(msg, args) {
  const mentioned = mentionedParticipants(msg)
  if (mentioned.length) return mentioned
  const target = args.find((arg) => /\d/.test(arg))
  const jid = target && phoneToJid(target)
  return jid ? [jid] : []
}

async function withAdmin(sock, msg, reply, options, action) {
  const context = await getGroupContext(sock, msg, options)
  if (context.error) return reply(`> ❌ ${context.error}`)
  return action(context)
}

async function participantAction(action, { sock, msg, args, reply }) {
  return withAdmin(sock, msg, reply, { requireBotAdmin: true }, async ({ groupJid }) => {
    const targets = commandTargets(msg, args)
    if (!targets.length) {
      return reply(`> ❌ 𝗠ᴇɴᴛɪᴏɴ ᴀ ᴍᴇᴍʙᴇʀ ᴏʀ ᴇɴᴛᴇʀ ᴛʜᴇɪʀ ɴᴜᴍʙᴇʀ.\nE.x.: .${action === 'add' ? 'add' : 'kick'} 50912345678`)
    }

    const results = await sock.groupParticipantsUpdate(groupJid, targets, action)
    const successes = results.filter((result) => Number(result.status) >= 200 && Number(result.status) < 300)
    const failures = results.length - successes.length
    return reply(
      `${action === 'add' ? '➕ Aᴅᴅᴇᴅ' : '👢 Rᴇᴍᴏᴠᴇᴅ'}: ${successes.length}/${targets.length}.` +
      (failures ? `\n> ❌ 𝗪ʜᴀᴛsAᴘᴘ ʀᴇᴊᴇᴄᴛᴇᴅ ${failures} ᴀᴄᴛɪᴏɴ(s).` : ''),
    )
  })
}

async function add({ sock, msg, args, reply }) {
  return participantAction('add', { sock, msg, args, reply })
}

async function kick({ sock, msg, args, reply }) {
  return participantAction('remove', { sock, msg, args, reply })
}

async function updateAdminStatus(action, { sock, msg, args, reply }) {
  return withAdmin(sock, msg, reply, { requireBotAdmin: true }, async ({
    groupJid,
    participants,
  }) => {
    const targets = commandTargets(msg, args)
    if (!targets.length) {
      return reply(`> ❌ 𝗠ᴇɴᴛɪᴏɴ ᴀ ɢʀᴏᴜᴘ ᴍᴇᴍʙᴇʀ ᴏʀ ᴇɴᴛᴇʀ ᴛʜᴇɪʀ ɴᴜᴍʙᴇʀ.\nE.x.: .${action} 50912345678`)
    }

    const memberJids = new Set(participants.map(participantJid).filter(Boolean))
    const members = targets.filter((jid) => memberJids.has(jid))
    const notMembers = targets.length - members.length
    if (!members.length) {
      return reply('> ❌ 𝗧ʜᴇ ᴛᴀʀɢᴇᴛ ᴍᴜsᴛ ʙᴇ ᴀ ᴍᴇᴍʙᴇʀ ᴏғ ᴛʜɪs ɢʀᴏᴜᴘ.')
    }

    const results = await sock.groupParticipantsUpdate(groupJid, members, action)
    const succeeded = results.filter((result) =>
      Number(result.status) >= 200 && Number(result.status) < 300,
    ).length
    const failed = results.length - succeeded
    const verb = action === 'promote' ? '𝐏ʀᴏᴍᴏᴛᴇᴅ' : '𝐃ᴇᴍᴏᴛᴇᴅ'

    return reply(
      `✅ ${verb}: ${succeeded}/${members.length}.` +
      (failed || notMembers ? `\n > ❌ 𝐅ᴀɪʟᴇᴅ: ${failed + notMembers}.` : ''),
    )
  })
}

async function promote({ sock, msg, args, reply }) {
  return updateAdminStatus('promote', { sock, msg, args, reply })
}

async function demote({ sock, msg, args, reply }) {
  return updateAdminStatus('demote', { sock, msg, args, reply })
}

async function close({ sock, msg, reply }) {
  return withAdmin(sock, msg, reply, { requireBotAdmin: true }, async ({ groupJid }) => {
    await sock.groupSettingUpdate(groupJid, 'announcement')
    return reply('> 🔒 𝗚ʀᴏᴜᴘ ᴄʟᴏsᴇᴅ: ᴏɴʟʏ ᴀᴅᴍɪɴs ᴄᴀɴ sᴇɴᴅ ᴍᴇssᴀɢᴇs.')
  })
}

async function setGroupMetadata(field, { sock, msg, args, prefix, reply }) {
  return withAdmin(sock, msg, reply, { requireBotAdmin: true }, async ({ groupJid }) => {
    const value = args.join(' ').trim()
    const isName = field === 'name'
    const maxLength = isName ? 25 : 2048
    const command = isName ? 'setname' : 'setdesc'
    if (!value) return reply(`> 𝐔ꜱᴀɢᴇ: ${prefix}${command} <${isName ? 'ɴᴇᴡ ɴᴀᴍᴇ' : 'ɴᴇᴡ ᴅᴇsᴄʀɪᴘᴛɪᴏɴ'}>`)
    if (value.length > maxLength) {
      return reply(`> ❌ 𝐓ʜᴇ ${isName ? 'ɢʀᴏᴜᴘ ɴᴀᴍᴇ' : 'ᴅᴇsᴄʀɪᴘᴛɪᴏɴ'} ᴄᴀɴɴᴏᴛ ᴇxᴄᴇᴇᴅ ${maxLength} ᴄʜᴀʀᴀᴄᴛᴇʀs.`)
    }

    try {
      if (isName) await sock.groupUpdateSubject(groupJid, value)
      else await sock.groupUpdateDescription(groupJid, value)
    } catch (error) {
      logger.warn({ groupJid, field, err: error.message }, 'failed to update group metadata')
      return reply(`> ❌ 𝐔ɴᴀʙʟᴇ ᴛᴏ ᴜᴘᴅᴀᴛᴇ ᴛʜᴇ ɢʀᴏᴜᴘ ${isName ? 'ɴᴀᴍᴇ' : 'ᴅᴇsᴄʀɪᴘᴛɪᴏɴ'}. Cʜᴇᴄᴋ ᴛʜᴇ ʙᴏᴛ’s ᴀᴅᴍɪɴ ᴘᴇʀᴍɪssɪᴏɴs.`)
    }
    return reply(`> ✅ 𝐆ʀᴏᴜᴘ ${isName ? 'ɴᴀᴍᴇ' : 'ᴅᴇsᴄʀɪᴘᴛɪᴏɴ'} ᴜᴘᴅᴀᴛᴇᴅ.`)
  })
}

async function setname(context) {
  return setGroupMetadata('name', context)
}

async function setdesc(context) {
  return setGroupMetadata('description', context)
}

async function open({ sock, msg, reply }) {
  return withAdmin(sock, msg, reply, { requireBotAdmin: true }, async ({ groupJid }) => {
    await sock.groupSettingUpdate(groupJid, 'not_announcement')
    return reply('> 🔓 Gʀᴏᴜᴘ ᴏᴘᴇɴᴇᴅ: ᴀʟʟ ᴍᴇᴍʙᴇʀs ᴄᴀɴ sᴇɴᴅ ᴍᴇssᴀɢᴇs.')
  })
}

async function slowmode({ sock, msg, args, reply, prefix }) {
  return withAdmin(sock, msg, reply, {}, async ({ groupJid, botIsAdmin }) => {
    const value = args[0]?.toLowerCase()
    if (value !== 'off' && (!/^\d+$/.test(value || '') || Number(value) < 1 || Number(value) > 3600)) {
      return reply(`> 𝐔ꜱᴀɢᴇ: ${prefix}slowmode <1-3600|off> seconds`)
    }

    const seconds = value === 'off' ? 0 : Number(value)
    if (seconds && !botIsAdmin) {
      return reply('> ❌ 𝐓ʜᴇ ʙᴏᴛ ᴍᴜsᴛ ʙᴇ ᴀ ɢʀᴏᴜᴘ ᴀᴅᴍɪɴ ᴛᴏ ᴇɴғᴏʀᴄᴇ sʟᴏᴡᴍᴏᴅᴇ.')
    }

    const [settings] = await GroupSetting.findOrCreate({ where: { groupJid } })
    await settings.update({ slowmodeSeconds: seconds })
    if (!seconds) clearGroupSlowmode(groupJid)
    return reply(seconds
      ? `> ✅ 𝐒ʟᴏᴡᴍᴏᴅᴇ ᴇɴᴀʙʟᴇᴅ: ᴍᴇᴍʙᴇʀs ᴍᴀʏ sᴇɴᴅ ᴏɴᴇ ᴍᴇssᴀɢᴇ ᴇᴠᴇʀʏ ${seconds} sᴇᴄᴏɴᴅs.`
      : '> ✅ 𝐒ʟᴏᴡᴍᴏᴅᴇ ᴅɪsᴀʙʟᴇᴅ ғᴏʀ ᴛʜɪs ɢʀᴏᴜᴘ.')
  })
}

async function warn({ sock, msg, args, reply }) {
  return withAdmin(sock, msg, reply, { requireBotAdmin: true }, async ({ groupJid, participants }) => {
    const targets = commandTargets(msg, args)
    if (!targets.length) return reply('> ❌ 𝐌ᴇɴᴛɪᴏɴ ᴀ ɴᴏɴ-ᴀᴅᴍɪɴ ᴍᴇᴍʙᴇʀ ᴏʀ ᴜsᴇ .warn <number>.')

    let warningsIssued = 0
    let removed = 0
    let failed = 0
    for (const target of targets) {
      const participant = participants.find((entry) => sameJid(participantJid(entry), target))
      const targetJid = participant && participantJid(participant)
      if (!targetJid || participant.admin === 'admin' || participant.admin === 'superadmin') {
        failed++
        continue
      }

      const [warning] = await GroupWarning.findOrCreate({
        where: { groupJid, participantJid: targetJid },
        defaults: { count: 0 },
      })
      const count = warning.count + 1
      if (count < 3) {
        await warning.update({ count })
        warningsIssued++
        continue
      }

      const results = await sock.groupParticipantsUpdate(groupJid, [targetJid], 'remove')
      if (results.some((result) => Number(result.status) >= 200 && Number(result.status) < 300)) {
        await warning.destroy()
        removed++
      } else {
        await warning.update({ count })
        failed++
      }
    }

    return reply(
      `> ⚠️ 𝐖ᴀʀɴɪɴɢs ɪssᴜᴇᴅ: ${warningsIssued}. Rᴇᴍᴏᴠᴇᴅ ᴀғᴛᴇʀ 3 ᴡᴀʀɴɪɴɢs: ${removed}.` +
      (failed ? ` > ❌ 𝐅ᴀɪʟᴇᴅ ᴏʀ ɪɴᴠᴀʟɪᴅ ᴛᴀʀɢᴇᴛs: ${failed}.` : ''),
    )
  })
}

async function warnings({ sock, msg, args, reply }) {
  return withAdmin(sock, msg, reply, {}, async ({ groupJid }) => {
    const targets = commandTargets(msg, args)
    if (!targets.length) return reply('> ❌ Mᴇɴᴛɪᴏɴ ᴀ ᴍᴇᴍʙᴇʀ ᴏʀ ᴜsᴇ .warnings <number>.')
    const records = await GroupWarning.findAll({ where: { groupJid } })
    const lines = targets.map((target) => {
      const record = records.find((entry) => sameJid(entry.participantJid, target))
      return `@${participantNumber(target)}: ${record?.count || 0}/3`
    })
    return sock.sendMessage(groupJid, {
      text: `>⚠️ 𝐖ᴀʀɴɪɴɢs\n${lines.join('\n')}`,
      mentions: targets,
    }, { quoted: msg })
  })
}

async function resetwarn({ sock, msg, args, reply }) {
  return withAdmin(sock, msg, reply, {}, async ({ groupJid }) => {
    const targets = commandTargets(msg, args)
    if (!targets.length) return reply('> ❌ 𝐌ᴇɴᴛɪᴏɴ ᴀ ᴍᴇᴍʙᴇʀ ᴏʀ ᴜsᴇ .resetwarn <number>.')
    await GroupWarning.destroy({ where: { groupJid, participantJid: targets } })
    return reply(`> ✅ 𝐖ᴀʀɴɪɴɢs ʀᴇsᴇᴛ ғᴏʀ ${targets.length} ᴛᴀʀɢᴇᴛ(s).`)
  })
}

async function groupinfo({ sock, msg, reply }) {
  const groupJid = msg.key.remoteJid
  if (!groupJid?.endsWith('@g.us')) return reply('> Tʜɪs ᴄᴏᴍᴍᴀɴᴅ ᴍᴜsᴛ ʙᴇ ᴜsᴇᴅ ɪɴ ᴀ ɢʀᴏᴜᴘ.')
  const metadata = await sock.groupMetadata(groupJid)
  return reply(
    `✦ 𝐆ʀᴏᴜᴘ: ${metadata.subject || 'Unknown'}\n` +
    `✦ 𝐌ᴇᴍʙᴇʀs: ${metadata.participants?.length || 0}\n` +
    `✦ 𝐂ʀᴇᴀᴛᴇᴅ: ${metadata.creation ? new Date(metadata.creation * 1000).toLocaleDateString('en-US') : 'Unknown'}\n` +
    `✦ 𝐃ᴇsᴄʀɪᴘᴛɪᴏɴ: ${metadata.desc || '𝐍o description.'}`,
  )
}

async function admins({ sock, msg, reply }) {
  const groupJid = msg.key.remoteJid
  if (!groupJid?.endsWith('@g.us')) return reply('> Tʜɪs ᴄᴏᴍᴍᴀɴᴅ ᴍᴜsᴛ ʙᴇ ᴜsᴇᴅ ɪɴ ᴀ ɢʀᴏᴜᴘ.')
  const metadata = await sock.groupMetadata(groupJid)
  const targets = (metadata.participants || [])
    .filter((participant) => participant.admin === 'admin' || participant.admin === 'superadmin')
    .filter((participant) => participantJid(participant))
  if (!targets.length) return reply('> ✠ 𝐍ᴏ ɢʀᴏᴜᴘ ᴀᴅᴍɪɴs ғᴏᴜɴᴅ.')

  const groupName = metadata.subject || 'Unknown Group'
  const adminLines = targets.map((participant) => {
    const role = participant.admin === 'superadmin' ? '𝐎ᴡɴᴇʀ' : '𝐀ᴅᴍɪɴ'
    return `│ ✠ @${participantNumber(participantJid(participant))} 〔${role}〕`
  })

  return sock.sendMessage(groupJid, {
    text: [
      '╭─❮ 𓆩 𝐆ʀᴏᴜᴘ 𝐀ᴅᴍɪɴs 𓆪 ❯',
      `│ ✦ 𝐆ʀᴏᴜᴘ ➪ ${groupName}`,
      `│ ✦ 𝐂ᴏᴜɴᴛ ➪ ${targets.length}`,
      '├───────────────────────',
      ...adminLines,
      '╰───────────────────────',
    ].join('\n'),
    mentions: targets.map(participantJid),
  }, { quoted: msg })
}

async function grouplink({ sock, msg, reply }) {
  return withAdmin(sock, msg, reply, { requireBotAdmin: true }, async ({ groupJid }) => {
    try {
      const inviteCode = await sock.groupInviteCode(groupJid)
      if (!inviteCode) {
        logger.warn({ groupJid }, 'WhatsApp returned an empty group invite code')
        return reply('> ❌ Cᴏᴜʟᴅ ɴᴏᴛ ɢᴇᴛ ᴛʜᴇ ɢʀᴏᴜᴘ ɪɴᴠɪᴛᴇ ʟɪɴᴋ.')
      }

      return reply(`> 🔗 𝐆ʀᴏᴜᴘ 𝐈ɴᴠɪᴛᴇ 𝐋ɪɴᴋ\nhttps://chat.whatsapp.com/${inviteCode}`)
    } catch (error) {
      logger.warn({ groupJid, err: error.message }, 'failed to get group invite link')
      return reply('> ❌ Cᴏᴜʟᴅ ɴᴏᴛ ɢᴇᴛ ᴛʜᴇ ɢʀᴏᴜᴘ ɪɴᴠɪᴛᴇ ʟɪɴᴋ. Cʜᴇᴄᴋ ᴛʜᴇ ʙᴏᴛ’s ᴀᴅᴍɪɴ ᴘᴇʀᴍɪssɪᴏɴs ᴀɴᴅ ᴛʀʏ ᴀɢᴀɪɴ.')
    }
  })
}

async function rules({ sock, msg, reply }) {
  const groupJid = msg.key.remoteJid
  if (!groupJid?.endsWith('@g.us')) return reply('> Tʜɪs ᴄᴏᴍᴍᴀɴᴅ ᴍᴜsᴛ ʙᴇ ᴜsᴇᴅ ɪɴ ᴀ ɢʀᴏᴜᴘ.')
  const settings = await GroupSetting.findByPk(groupJid, { attributes: ['rules'] })
  return reply(settings?.rules ? `> 📜 𝐆ʀᴏᴜᴘ ʀᴜʟᴇs\n\n${settings.rules}` : '> 📜 𝐍ᴏ ɢʀᴏᴜᴘ ʀᴜʟᴇs ʜᴀᴠᴇ ʙᴇᴇɴ sᴇᴛ.')
}

async function setrules({ sock, msg, args, prefix, reply }) {
  return withAdmin(sock, msg, reply, {}, async ({ groupJid }) => {
    const text = args.join(' ').trim()
    if (!text) return reply(`> ❌ 𝐔ꜱᴀɢᴇ: ${prefix}setrules <rules>`)
    const [settings] = await GroupSetting.findOrCreate({ where: { groupJid } })
    await settings.update({ rules: text })
    return reply('> ✅ 𝐆ʀᴏᴜᴘ ʀᴜʟᴇs sᴀᴠᴇᴅ.')
  })
}

async function poll({ sock, msg, jid, args, reply, prefix }) {
  const [question, ...choices] = args.join(' ').split('|').map((part) => part.trim())
  if (!question || choices.length < 2 || choices.some((choice) => !choice)) {
    return reply(`> ❌ 𝐔ꜱᴀɢᴇ: ${prefix}poll <question> | <choice 1> | <choice 2>`)
  }
  if (choices.length > 12) return reply('> ❌ A ᴘᴏʟʟ ᴄᴀɴ ʜᴀᴠᴇ ᴜᴘ ᴛᴏ 12 ᴄʜᴏɪᴄᴇs.')
  return sock.sendMessage(jid, {
    poll: { name: question, values: choices, selectableCount: 1 },
  }, { quoted: msg })
}

async function tagMembers({ sock, msg, args, reply }, adminsOnly = false) {
  return withAdmin(sock, msg, reply, {}, async ({ groupJid, participants }) => {
    const targets = participants
      .filter((participant) => (
        !adminsOnly || participant.admin === 'admin' || participant.admin === 'superadmin'
      ))
      .map(participantJid)
      .filter(Boolean)
    if (!targets.length) {
      return reply(adminsOnly
        ? '╭─❮ 🝐 𝗔ᴅᴍɪɴs ❯\n│ ⸸ 𝗡ᴏ ɢʀᴏᴜᴘ ᴀᴅᴍɪɴs ғᴏᴜɴᴅ.\n╰─────────────────────────'
        : '╭─❮ 🝐 𝗚ʀᴏᴜᴘ 𝗠ᴇᴍʙᴇʀs ❯\n│ ⸸ 𝗡ᴏ ɢʀᴏᴜᴘ ᴍᴇᴍʙᴇʀs ғᴏᴜɴᴅ.\n╰─────────────────────────')
    }

    const note = args.join(' ').trim()
    if (note.length > 400) {
      return reply('╭─❮ ⸸ 𝗠ᴇssᴀɢᴇ 𝗧ᴏᴏ 𝗟ᴏɴɢ ❯\n│ 🝓 𝗞ᴇᴇᴘ ʏᴏᴜʀ ɴᴏᴛᴇ ᴜɴᴅᴇʀ 𝟰𝟬𝟬 ᴄʜᴀʀᴀᴄᴛᴇʀs.\n╰─────────────────────────')
    }

    const title = adminsOnly ? '𝗔ᴅᴍɪɴ 𝗡ᴏᴛɪᴄᴇ' : '𝗚ʀᴏᴜᴘ 𝗔ɴɴᴏᴜɴᴄᴇᴍᴇɴᴛ'
    const image = await fs.readFile(path.join(config.assetsDir, 'tagall.jpg'))
    const batchSize = 15
    const batches = []
    for (let offset = 0; offset < targets.length; offset += batchSize) {
      batches.push(targets.slice(offset, offset + batchSize))
    }

    for (let index = 0; index < batches.length; index += 1) {
      const batch = batches[index]
      const memberTags = batch
        .map((jid) => `${adminsOnly ? '' : '⸸ '}@${jid.split('@')[0].split(':')[0]}`)
        .join(adminsOnly ? ' ' : '\n')
      const header = index === 0
        ? [
          '╭─❮ 𓆩 𝗙ᴀʟʟᴇɴ 𝗫 𝗔ɴɢᴇʟs 𓆪 ❯',
          `│ 🝐 ${title}`,
          `│ ⸸ 𝗠ᴇᴍʙᴇʀs ➪ ${targets.length}`,
          '╰─────────────────────────',
          note ? `\n𓆩 𝗠ᴇssᴀɢᴇ\n${note}` : '',
        ].join('\n')
        : `╭─❮ 🝐 ${title} ❯\n│ ⸸ 𝗣ᴀʀᴛ ${index + 1}/${batches.length}\n╰─────────────────────────`
      const payload = index === 0
        ? { image, caption: `${header}\n\n${memberTags}`, mentions: batch }
        : { text: `${header}\n\n${memberTags}`, mentions: batch }
      await sock.sendMessage(groupJid, payload, index === 0 ? { quoted: msg } : {})
    }
  })
}

async function tagall(context) {
  return tagMembers(context)
}

async function tagadmin(context) {
  return tagMembers(context, true)
}

async function kickall({ sock, msg, reply }) {
  return withAdmin(sock, msg, reply, { requireBotAdmin: true }, async ({
    groupJid,
    participants,
    senderJid,
    botJid,
  }) => {
    const targets = participants
      .filter((participant) => participant.admin !== 'admin' && participant.admin !== 'superadmin')
      .map(participantJid)
      .filter((jid) => jid && !sameJid(jid, senderJid) && !sameJid(jid, botJid))

    if (!targets.length) {
      return reply('╭─❮ 🝐 𝗞ɪᴄᴋᴀʟʟ ❯\n│ ⸸ 𝗡ᴏ 𝗡ᴏɴ-ᴀᴅᴍɪɴ 𝗠ᴇᴍʙᴇʀs ғᴏᴜɴᴅ.\n╰─────────────────────────')
    }

    const image = await fs.readFile(path.join(config.assetsDir, 'kickal.jpg'))
    const noticeBatchSize = 15
    const noticeBatches = []
    for (let offset = 0; offset < targets.length; offset += noticeBatchSize) {
      noticeBatches.push(targets.slice(offset, offset + noticeBatchSize))
    }

    for (let index = 0; index < noticeBatches.length; index += 1) {
      const batch = noticeBatches[index]
      const memberTags = batch
        .map((jid) => `⸸ @${jid.split('@')[0].split(':')[0]}`)
        .join('\n')
      const heading = index === 0
        ? [
          '╭─❮ 𓆩 𝗙ᴀʟʟᴇɴ 𝗫 𝗔ɴɢᴇʟs 𓆪 ❯',
          '│ 🝐 𝗞ɪᴄᴋᴀʟʟ 𝗡ᴏᴛɪᴄᴇ',
          `│ ⸸ 𝗠ᴇᴍʙᴇʀs ➪ ${targets.length}`,
          '╰─────────────────────────',
        ].join('\n')
        : `╭─❮ 🝐 𝗞ɪᴄᴋᴀʟʟ 𝗡ᴏᴛɪᴄᴇ ❯\n│ ⸸ 𝗣ᴀʀᴛ ${index + 1}/${noticeBatches.length}\n╰─────────────────────────`
      const payload = index === 0
        ? { image, caption: `${heading}\n\n${memberTags}`, mentions: batch }
        : { text: `${heading}\n\n${memberTags}`, mentions: batch }
      await sock.sendMessage(groupJid, payload, index === 0 ? { quoted: msg } : {})
    }

    let removed = 0
    let failed = 0
    for (let offset = 0; offset < targets.length; offset += 10) {
      const batch = targets.slice(offset, offset + 10)
      const results = await sock.groupParticipantsUpdate(groupJid, batch, 'remove')
      removed += results.filter((result) => Number(result.status) >= 200 && Number(result.status) < 300).length
      failed += results.length - results.filter((result) => Number(result.status) >= 200 && Number(result.status) < 300).length
    }

    return reply(
      '╭─❮ ⸸ 𝗞ɪᴄᴋᴀʟʟ 𝗖ᴏᴍᴘʟᴇᴛᴇ ❯\n' +
      `│ 🝐 𝗥ᴇᴍᴏᴠᴇᴅ ➪ ${removed}\n` +
      `│ ⸸ 𝗥ᴇᴊᴇᴄᴛᴇᴅ ➪ ${failed}\n` +
      '│ 𓆩 𝗚ʀᴏᴜᴘ ᴀᴅᴍɪɴs ᴡᴇʀᴇ ᴋᴇᴘᴛ.\n' +
      '╰─────────────────────────',
    )
  })
}

async function setGroupMode(mode, { sock, msg, args, reply }) {
  return withAdmin(sock, msg, reply, {}, async ({ groupJid }) => {
    const [settings] = await GroupSetting.findOrCreate({ where: { groupJid } })
    const field = mode === 'welcome' ? 'welcomeEnabled' : 'goodbyeEnabled'
    const status = args[0]?.toLowerCase()
    if (!['on', 'off'].includes(status)) {
      return reply(`> ❌ 𝐔ꜱᴀɢᴇ: .${mode} on / .${mode} off`)
    }
    const enabled = status === 'on'
    await settings.update({ [field]: enabled })
    const label = mode === 'welcome' ? 'Wᴇʟᴄᴏᴍᴇ' : 'Gᴏᴏᴅʙʏᴇ'
    return reply(`✅ ${label} ${enabled ? 'ᴇɴᴀʙʟᴇᴅ' : 'ᴅɪsᴀʙʟᴇᴅ'} ғᴏʀ ᴛʜɪs ɢʀᴏᴜᴘ.`)
  })
}

async function setGroupMessage(type, { sock, args, prefix, reply, msg }) {
  return withAdmin(sock, msg, reply, {}, async ({ groupJid }) => {
    const text = args.join(' ').trim()
    if (!text) {
      return reply(
        `> ❌ 𝗔ᴅᴅ ᴛʜᴇ ᴍᴇssᴀɢᴇ ᴛᴇxᴛ.\nE.x.: ${prefix}set${type} ` +
        (type === 'welcome' ? 'Wᴇʟᴄᴏᴍᴇ @user ᴛᴏ @group ᴀᴛ @time!' : 'Gᴏᴏᴅʙʏᴇ @user — @time.'),
      )
    }

    const [settings] = await GroupSetting.findOrCreate({ where: { groupJid } })
    await settings.update({ [`${type}Message`]: text })
    return reply(
      `✅ ${type === 'welcome' ? '𝐖ᴇʟᴄᴏᴍᴇ' : '𝐆ᴏᴏᴅʙʏᴇ'} ᴍᴇssᴀɢᴇ sᴀᴠᴇᴅ.\n` +
      '𝗩ᴀʀɪᴀʙʟᴇs: @user/@name, @group, @rules, @date, @time, @count, @desc.',
    )
  })
}

async function updateJoinRequests(action, { sock, msg, args, reply }) {
  return withAdmin(sock, msg, reply, { requireBotAdmin: true }, async ({ groupJid }) => {
    const targetJid = args[0] ? phoneToJid(args[0]) : null
    if (args.length && !targetJid) {
      return reply(`> ❌ Uꜱᴀɢᴇ: .${action === 'approve' ? 'accept' : 'reject'} +50912345678`)
    }

    let requests
    try {
      requests = await sock.groupRequestParticipantsList(groupJid)
    } catch (error) {
      logger.warn({ groupJid, err: error.message }, 'failed to list group join requests')
      return reply(`> ❌ Cᴏᴜʟᴅ ɴᴏᴛ ʟɪsᴛ ᴊᴏɪɴ ʀᴇǫᴜᴇsᴛs: ${error.message}`)
    }
    const pendingRequests = Array.isArray(requests) ? requests : []
    const targets = targetJid
      ? pendingRequests.filter((request) => sameJid(requestedParticipantJid(request), targetJid))
      : pendingRequests

    if (!targets.length) {
      return reply(targetJid
        ? '> ❌ Nᴏ ᴘᴇɴᴅɪɴɢ ᴀᴘᴘʀᴏᴠᴀʟ ʀᴇǫᴜᴇsᴛ ғᴏᴜɴᴅ ғᴏʀ ᴛʜᴀᴛ ɴᴜᴍʙᴇʀ.'
        : '> ℹ️ Tʜᴇʀᴇ ᴀʀᴇ ɴᴏ ᴘᴇɴᴅɪɴɢ ᴀᴘᴘʀᴏᴠᴀʟ ʀᴇǫᴜᴇsᴛs.',
      )
    }

    let succeeded = 0
    let failed = 0
    for (let offset = 0; offset < targets.length; offset += 10) {
      const batch = targets.slice(offset, offset + 10)
      const participants = batch.map(requestedParticipantJid).filter(Boolean)
      if (!participants.length) {
        failed += batch.length
        continue
      }
      let results
      try {
        results = await sock.groupRequestParticipantsUpdate(groupJid, participants, action)
      } catch (error) {
        logger.warn({ groupJid, action, participants, err: error.message }, 'failed to process group join requests')
        return reply(`> ❌ Cᴏᴜʟᴅ ɴᴏᴛ ${action === 'approve' ? 'ᴀᴄᴄᴇᴘᴛ' : 'ʀᴇᴊᴇᴄᴛ'} ᴛʜᴇ ʀᴇǫᴜᴇsᴛs: ${error.message}`)
      }
      const batchSucceeded = results.filter((result) => Number(result.status) >= 200 && Number(result.status) < 300).length
      succeeded += batchSucceeded
      failed += batch.length - batchSucceeded
    }

    const verb = action === 'approve' ? 'Aᴄᴄᴇᴘᴛᴇᴅ' : 'Rᴇᴊᴇᴄᴛᴇᴅ'
    return reply(
      `> ✅ ${verb}: ${succeeded}/${targets.length}.` +
      (failed ? `\n> ❌ Fᴀɪʟᴇᴅ: ${failed}.` : ''),
    )
  })
}

async function accept({ sock, msg, args, reply }) {
  if (!args[0]) return reply('> ❌ Uꜱᴀɢᴇ: .accept +50912345678')
  return updateJoinRequests('approve', { sock, msg, args, reply })
}

async function acceptall({ sock, msg, reply }) {
  return updateJoinRequests('approve', { sock, msg, args: [], reply })
}

async function reject({ sock, msg, args, reply }) {
  if (!args[0]) return reply('> ❌ Uꜱᴀɢᴇ: .reject +50912345678')
  return updateJoinRequests('reject', { sock, msg, args, reply })
}

async function rejectall({ sock, msg, reply }) {
  return updateJoinRequests('reject', { sock, msg, args: [], reply })
}

async function autoaccept({ sock, msg, args, reply }) {
  return withAdmin(sock, msg, reply, { requireBotAdmin: true }, async ({ groupJid }) => {
    const status = args[0]?.toLowerCase()
    if (status !== 'on' && status !== 'off') {
      return reply('> ❌ Uꜱᴀɢᴇ: .autoaccept on / .autoaccept off')
    }

    const enabled = status === 'on'
    try {
      if (enabled) await sock.groupJoinApprovalMode(groupJid, 'on')
      const [settings] = await GroupSetting.findOrCreate({ where: { groupJid } })
      await settings.update({ autoAcceptEnabled: enabled })
      return reply(enabled
        ? '> ✅ Aᴜᴛᴏᴀᴄᴄᴇᴘᴛ ᴇɴᴀʙʟᴇᴅ ғᴏʀ ᴛʜɪs ɢʀᴏᴜᴘ.'
        : '> ✅ Aᴜᴛᴏᴀᴄᴄᴇᴘᴛ ᴅɪsᴀʙʟᴇᴅ ғᴏʀ ᴛʜɪs ɢʀᴏᴜᴘ.',
      )
    } catch (error) {
      logger.warn({ groupJid, enabled, err: error.message }, 'failed to update automatic join approvals')
      return reply(`> ❌ Cᴏᴜʟᴅ ɴᴏᴛ ᴜᴘᴅᴀᴛᴇ ᴀᴜᴛᴏᴀᴄᴄᴇᴘᴛ: ${error.message}`)
    }
  })
}

module.exports = {
  accept,
  acceptall,
  add,
  admins,
  autoaccept,
  close,
  demote,
  groupinfo,
  grouplink,
  goodbye: (context) => setGroupMode('goodbye', context),
  hidetag: ({ sock, msg, args, reply }) => withAdmin(sock, msg, reply, {}, ({ groupJid }) => {
    const text = args.join(' ').trim()
    if (!text)     return reply('> ❌ Aᴅᴅ ᴛʜᴇ ᴛᴇxᴛ ᴛᴏ sᴇɴᴅ.\nE.x.: .hidetag Meeting in 5 minutes.')
    return sock.sendMessage(groupJid, { text, mentionAll: true }, { quoted: msg })
  }),
  kick,
  kickall,
  open,
  poll,
  promote,
  resetwarn,
  reject,
  rejectall,
  rules,
  setgoodbye: (context) => setGroupMessage('goodbye', context),
  setdesc,
  setname,
  setrules,
  slowmode,
  setwelcome: (context) => setGroupMessage('welcome', context),
  tagadmin,
  tagall,
  warn,
  warnings,
  welcome: (context) => setGroupMode('welcome', context),
  closeGroup: close,
}
