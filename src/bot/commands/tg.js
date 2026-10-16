const config = require('../../config')
const logger = require('../../logger')
const { imageToSticker, videoToSticker } = require('../../utils/sticker')

const MAX_TELEGRAM_FILE_BYTES = 16 * 1024 * 1024
const MAX_STICKER_COUNT = 120
const STICKER_SEND_DELAY_MS = 250

function getStickerSetName(link) {
  let url
  try {
    url = new URL(link)
  } catch {
    throw new Error('Sᴇɴᴅ ᴀ ᴠᴀʟɪᴅ ᴛᴇʟᴇɢʀᴀᴍ sᴛɪᴄᴋᴇʀ ᴘᴀᴄᴋ ʟɪɴᴋ.')
  }

  if (!['t.me', 'www.t.me', 'telegram.me', 'www.telegram.me'].includes(url.hostname.toLowerCase())) {
    throw new Error('Oɴʟʏ ᴘᴜʙʟɪᴄ t.me/addstickers/<pack> ʟɪɴᴋs ᴀʀᴇ sᴜᴘᴘᴏʀᴛᴇᴅ.')
  }

  const match = url.pathname.match(/^\/addstickers\/([A-Za-z0-9_]+)\/?$/)
  if (!match) throw new Error('Oɴʟʏ ᴘᴜʙʟɪᴄ t.me/addstickers/<pack> ʟɪɴᴋs ᴀʀᴇ sᴜᴘᴘᴏʀᴛᴇᴅ.')
  return match[1]
}

async function telegramApi(method, params = {}) {
  const response = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(20_000),
  })

  const result = await response.json()
  if (!response.ok || !result.ok) {
    throw new Error(result.description || `Telegram API returned HTTP ${response.status}.`)
  }
  return result.result
}

async function downloadTelegramFile(filePath) {
  const response = await fetch(
    `https://api.telegram.org/file/bot${config.telegramBotToken}/${filePath}`,
    { signal: AbortSignal.timeout(30_000) },
  )
  if (!response.ok) throw new Error(`Telegram file download returned HTTP ${response.status}.`)

  const declaredLength = Number(response.headers.get('content-length') || 0)
  if (declaredLength > MAX_TELEGRAM_FILE_BYTES) throw new Error('A Telegram sticker exceeds the 16 MB download limit.')

  const chunks = []
  let totalBytes = 0
  for await (const chunk of response.body) {
    totalBytes += chunk.length
    if (totalBytes > MAX_TELEGRAM_FILE_BYTES) {
      await response.body.cancel()
      throw new Error('A Telegram sticker exceeds the 16 MB download limit.')
    }
    chunks.push(chunk)
  }
  if (totalBytes === 0) throw new Error('Telegram returned an empty sticker file.')
  return Buffer.concat(chunks)
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

module.exports = {
  name: 'tg',
  desc: 'Télécharge et envoie un pack de stickers Telegram',
  ownerOnly: true,
  async run({ sock, jid, args, reply }) {
    if (!config.telegramBotToken) {
      return reply('> ❌ Sᴇᴛ TELEGRAM_BOT_TOKEN ɪɴ .env ᴛᴏ ᴇɴᴀʙʟᴇ ᴛʜᴇ Tᴇʟᴇɢʀᴀᴍ sᴛɪᴄᴋᴇʀ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ.')
    }
    if (!args[0]) return reply('> ❌ Uꜱᴀɢᴇ: .tg https://t.me/addstickers/pack_name')

    let pack
    try {
      const name = getStickerSetName(args[0])
      pack = await telegramApi('getStickerSet', { name })
    } catch (error) {
      logger.warn({ err: error.message }, 'impossible de récupérer le pack Telegram')
      return reply(`> ❌ ${error.message}`)
    }

    if (!Array.isArray(pack.stickers) || pack.stickers.length === 0) {
      return reply('> ❌ Tʜɪs Tᴇʟᴇɢʀᴀᴍ ᴘᴀᴄᴋ ᴅᴏᴇs ɴᴏᴛ ᴄᴏɴᴛᴀɪɴ ᴀɴʏ sᴛɪᴄᴋᴇʀs.')
    }

    if (pack.stickers.some((sticker) => sticker.is_animated && !sticker.is_video)) {
      return reply('> ❌ Tʜɪs ᴘᴀᴄᴋ ᴜsᴇs TGS ᴀɴɪᴍᴀᴛᴇᴅ sᴛɪᴄᴋᴇʀs, ᴡʜɪᴄʜ ᴀʀᴇ ɴᴏᴛ sᴜᴘᴘᴏʀᴛᴇᴅ. Sᴛᴀᴛɪᴄ ᴀɴᴅ ᴠɪᴅᴇᴏ ᴘᴀᴄᴋs ᴀʀᴇ sᴜᴘᴘᴏʀᴛᴇᴅ.')
    }

    if (pack.stickers.length > MAX_STICKER_COUNT) {
      return reply(`> ❌ Tʜɪs ᴘᴀᴄᴋ ᴄᴏɴᴛᴀɪɴs ${pack.stickers.length} sᴛɪᴄᴋᴇʀs; ᴛʜᴇ ᴍᴀxɪᴍᴜᴍ ᴘᴀᴄᴋ sɪᴢᴇ ɪs ${MAX_STICKER_COUNT}.`)
    }

    await reply(`> 📦 Dᴏᴡɴʟᴏᴀᴅɪɴɢ ${pack.stickers.length} sᴛɪᴄᴋᴇʀs ғʀᴏᴍ “${pack.title}”…`)
    let sentCount = 0
    const failures = []

    for (const sticker of pack.stickers) {
      try {
        const file = await telegramApi('getFile', { file_id: sticker.file_id })
        if (!file.file_path) throw new Error('Telegram did not return a sticker file path.')
        let buffer = await downloadTelegramFile(file.file_path)

        buffer = sticker.is_video
          ? await videoToSticker(buffer)
          : await imageToSticker(buffer)
        await sock.sendMessage(jid, { sticker: buffer })
        sentCount++
        await wait(STICKER_SEND_DELAY_MS)
      } catch (error) {
        failures.push(error.message)
        logger.warn({ setName: pack.name, fileId: sticker.file_id, err: error.message }, 'échec d’envoi d’un sticker Telegram')
      }
    }

    const failedCount = pack.stickers.length - sentCount
    await reply(
      `> ✅ Sᴛɪᴄᴋᴇʀs sᴇɴᴛ: ${sentCount}/${pack.stickers.length}.${failedCount ? ` Fᴀɪʟᴇᴅ: ${failedCount}. Fɪʀsᴛ ᴇʀʀᴏʀ: ${failures[0].slice(0, 160)}` : ''}`,
    )
  },
}
