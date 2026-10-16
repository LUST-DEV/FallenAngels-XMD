const logger = require('../../logger')

const MAX_TEXT_LENGTH = 4000

module.exports = {
  name: 'translate',
  aliases: ['tr'],
  desc: 'Translate text into another language',
  async run({ args, jid, prefix, reply }) {
    const targetLanguage = args[0]?.trim()
    const text = args.slice(1).join(' ').trim()
    if (!targetLanguage || !text) {
      return reply(`> 𝐔ꜱᴀɢᴇ: ${prefix}translate <ʟᴀɴɢᴜᴀɢᴇ_ᴄᴏᴅᴇ> <ᴛᴇxᴛ>\n𝐄.ɢ.: ${prefix}translate en Bonjour, comment vas-tu ?\nᴄᴏᴅᴇs: fr, en, es, pt, ar, de...`)
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return reply(`> ❌ 𝐓ʜᴇ ᴛᴇxᴛ ɪs ᴛᴏᴏ ʟᴏɴɢ (ᴍᴀxɪᴍᴜᴍ ${MAX_TEXT_LENGTH} ᴄʜᴀʀᴀᴄᴛᴇʀs).`)
    }
    if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/i.test(targetLanguage)) {
      return reply('> ❌ 𝐔sᴇ ᴀ ʟᴀɴɢᴜᴀɢᴇ ᴄᴏᴅᴇ, ғᴏʀ ᴇxᴀᴍᴘʟᴇ: fr, en, es, zh-CN.')
    }

    try {
      const query = new URLSearchParams({
        client: 'gtx',
        sl: 'auto',
        tl: targetLanguage,
        dt: 't',
        q: text,
      })
      const response = await fetch(
        `https://translate.googleapis.com/translate_a/single?${query}`,
        { signal: AbortSignal.timeout(20_000) },
      )
      if (!response.ok) {
        logger.warn({ jid, status: response.status }, 'Google Translate rejected a translation request')
        return reply(`> ❌ 𝐓ʀᴀɴsʟᴀᴛɪᴏɴ ᴇʀʀᴏʀ (HTTP ${response.status}). Tʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ.`)
      }

      const result = await response.json()
      const translation = Array.isArray(result?.[0])
        ? result[0].map((segment) => segment?.[0] || '').join('').trim()
        : ''
      if (!translation) {
        logger.warn({ jid, targetLanguage }, 'Google Translate returned an empty translation')
        return reply('> ❌ 𝐍ᴏ ᴛʀᴀɴsʟᴀᴛɪᴏɴ ᴡᴀs ʀᴇᴛᴜʀɴᴇᴅ. Pʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ.')
      }
      return reply(`> ${translation}`)
    } catch (error) {
      logger.warn({ jid, err: error.message }, 'failed to translate text with Google Translate')
      return reply('> ❌ 𝐓ʀᴀɴsʟᴀᴛɪᴏɴ ᴜɴᴀᴠᴀɪʟᴀʙʟᴇ ʀɪɢʜᴛ ɴᴏᴡ. Pʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ.')
    }
  },
}
