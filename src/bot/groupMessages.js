const fs = require('node:fs/promises')
const path = require('node:path')
const sharp = require('sharp')
const { GroupSetting } = require('../database')
const config = require('../config')
const logger = require('../logger')
const { participantJid, participantNumber } = require('./groupUtils')

function circleSvg(size, fill, stroke, strokeWidth = 0) {
  const inset = strokeWidth / 2
  const radius = size / 2 - inset
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/></svg>`,
  )
}

function fallbackAvatarSvg(size) {
  const left = size * 0.18
  const right = size * 0.82
  const middle = size / 2
  const shoulderTop = size * 0.58
  const shoulderBottom = size * 0.92
  return Buffer.from(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${middle}" cy="${middle}" r="${middle}" fill="#ededeb"/><circle cx="${middle}" cy="${size * 0.38}" r="${size * 0.17}" fill="#777772"/><path d="M${left} ${shoulderBottom} C${left} ${size * 0.68} ${size * 0.34} ${shoulderTop} ${middle} ${shoulderTop} C${size * 0.66} ${shoulderTop} ${right} ${size * 0.68} ${right} ${shoulderBottom} Z" fill="#777772"/></svg>`,
  )
}

async function fetchProfilePicture(sock, userJid) {
  const pictureUrl = await sock.profilePictureUrl(userJid, 'image')
  if (!pictureUrl) throw new Error('No profile picture URL returned')

  const response = await fetch(pictureUrl, { signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error(`Profile picture download returned HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

async function makeTemplateTransparent(templateBuffer) {
  const { data, info } = await sharp(templateBuffer)
    .removeAlpha()
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const rgba = Buffer.alloc(info.width * info.height * 4)

  for (let pixel = 0; pixel < data.length; pixel++) {
    const alpha = Math.max(0, Math.min(255, (250 - data[pixel]) * 2))
    const offset = pixel * 4
    rgba[offset] = 24
    rgba[offset + 1] = 24
    rgba[offset + 2] = 24
    rgba[offset + 3] = alpha
  }

  return sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png().toBuffer()
}

async function composeParticipantImage(sock, userJid, templateName = 'bienvenue.jpg') {
  const templateBuffer = await fs.readFile(path.join(config.assetsDir, templateName))
  const { width, height } = await sharp(templateBuffer).metadata()
  if (!width || !height) throw new Error('Template has invalid dimensions')

  const avatarSize = Math.round(width * 0.21)
  const avatarX = width - avatarSize - Math.round(width * 0.07)
  const avatarY = Math.round(height * 0.055)
  const ringSize = avatarSize + 14
  const ringX = avatarX - 7
  const ringY = avatarY - 7

  let clippedPicture
  try {
    const pictureBuffer = await fetchProfilePicture(sock, userJid)
    clippedPicture = await sharp(pictureBuffer)
      .rotate()
      .resize(avatarSize, avatarSize, { fit: 'cover', position: 'attention' })
      .composite([{ input: circleSvg(avatarSize, '#fff', '#fff'), blend: 'dest-in' }])
      .png()
      .toBuffer()
  } catch (error) {
    logger.warn({ userJid, err: error.message }, 'unable to load profile picture; using a placeholder avatar')
    clippedPicture = await sharp(fallbackAvatarSvg(avatarSize)).png().toBuffer()
  }

  const layers = [
    { input: circleSvg(ringSize, '#fff', '#fff'), left: ringX, top: ringY },
    { input: clippedPicture, left: avatarX, top: avatarY },
    { input: circleSvg(ringSize, 'none', '#242420', 2), left: ringX, top: ringY },
  ]
  layers.push({ input: await makeTemplateTransparent(templateBuffer), left: 0, top: 0 })
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: '#fff',
    },
  }).composite(layers).jpeg({ quality: 92 }).toBuffer()
}

function renderGroupMessage(template, { userJid, groupName, count, description = '', rules = '' }) {
  const user = `@${participantNumber(userJid)}`
  const now = new Date()
  const time = new Intl.DateTimeFormat('en-US', { timeStyle: 'short' }).format(now)
  const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(now)
  const replacements = {
    '@user': user,
    '{user}': user,
    '@name': user,
    '{name}': user,
    '@group': groupName,
    '{group}': groupName,
    '@count': String(count),
    '{count}': String(count),
    '@time': time,
    '{time}': time,
    '@date': date,
    '{date}': date,
    '@rules': rules || '𝐀ᴠᴀɪʟᴀʙʟᴇ ғʀᴏᴍ ᴀ ɢʀᴏᴜᴘ ᴀᴅᴍɪɴ.',
    '{rules}': rules || '𝐀ᴠᴀɪʟᴀʙʟᴇ ғʀᴏᴍ ᴀ ɢʀᴏᴜᴘ ᴀᴅᴍɪɴ.',
    '@desc': description || '𝐍ᴏ ɢʀᴏᴜᴘ ᴅᴇsᴄʀɪᴘᴛɪᴏɴ sᴇᴛ.',
    '{desc}': description || '𝐍ᴏ ɢʀᴏᴜᴘ ᴅᴇsᴄʀɪᴘᴛɪᴏɴ sᴇᴛ.',
  }

  const pattern = new RegExp(Object.keys(replacements).map((key) =>
    key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  ).join('|'), 'gi')

  const text = template.replace(pattern, (token) => replacements[token.toLowerCase()] ?? token)
  return { text, mentions: [userJid] }
}

async function sendParticipantNotice(sock, groupJid, participant, action) {
  const isWelcome = action === 'add'
  const settings = await GroupSetting.findByPk(groupJid)
  if (!settings || (isWelcome ? !settings.welcomeEnabled : !settings.goodbyeEnabled)) return

  try {
    const metadata = await sock.groupMetadata(groupJid)
    const userJid = typeof participant === 'string' ? participant : participantJid(participant)
    if (!userJid) {
      logger.warn({ groupJid, action }, 'participant sans JID, message de bienvenue ignoré')
      return
    }

    if (isWelcome) {
      const image = await composeParticipantImage(sock, userJid, 'bienvenue.jpg')
      const rendered = renderGroupMessage(settings.welcomeMessage, {
        userJid,
        groupName: metadata.subject || 'this group',
        count: metadata.participants?.length || 0,
        description: metadata.desc || '',
        rules: settings.rules?.trim() || '',
      })
      await sock.sendMessage(groupJid, { image, caption: rendered.text, mentions: rendered.mentions })
      return
    }

    const image = await composeParticipantImage(sock, userJid, 'goodbye.jpg')
    const rendered = renderGroupMessage(settings.goodbyeMessage, {
      userJid,
      groupName: metadata.subject || 'this group',
      count: metadata.participants?.length || 0,
      description: metadata.desc || '',
      rules: settings.rules?.trim() || '',
    })
    await sock.sendMessage(groupJid, { image, caption: rendered.text, mentions: rendered.mentions })
  } catch (error) {
    logger.error({ groupJid, action, err: error.message }, 'échec du message welcome/goodbye')
  }
}

module.exports = { renderGroupMessage, sendParticipantNotice }
