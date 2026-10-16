const logger = require('../../logger')

module.exports = {
  name: 'bin',
  desc: 'Look up public card issuer information from a six-digit BIN',
  async run({ args, reply }) {
    const bin = args[0]?.trim()
    if (!/^\d{6}$/.test(bin || '')) {
      return reply('> ❌ 𝐔sᴀɢᴇ: .bin <𝟨-ᴅɪɢɪᴛ 𝐁𝐈𝐍>')
    }

    try {
      const response = await fetch(`https://lookup.binlist.net/${bin}`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(15_000),
      })
      if (response.status === 404) return reply('> ❌ 𝐍ᴏ ᴘᴜʙʟɪᴄ 𝐁𝐈𝐍 ɪɴғᴏʀᴍᴀᴛɪᴏɴ ғᴏᴜɴᴅ.')
      if (!response.ok) throw new Error(`BIN lookup returned HTTP ${response.status}.`)

      const data = await response.json()
      const country = [data.country?.name, data.country?.emoji].filter(Boolean).join(' ')
      const lines = [
        '╭─❮ ❍ 𝐅ᴀʟʟᴇɴ 𝐗 𝐀ɴɢᴇʟs ❍ ❯',
        '│ 𖤐 𝐁𝐈𝐍 𝐈ɴᴛᴇʟʟɪɢᴇɴᴄᴇ',
        '│',
        `│ ✦ 𝐁𝐈𝐍: ${bin}`,
        `│ ✦ 𝐒ᴄʜᴇᴍᴇ: ${data.scheme || 'Unknown'}`,
        `│ ✦ 𝐓ʏᴘᴇ: ${data.type || 'Unknown'}`,
        `│ ✦ 𝐁ᴀɴᴋ: ${data.bank?.name || 'Unknown'}`,
        `│ ✦ 𝐂ᴏᴜɴᴛʀʏ: ${country || 'Unknown'}`,
        `│ ✦ 𝐂ᴜʀʀᴇɴᴄʏ: ${data.country?.currency || 'Unknown'}`,
        '╰┄┄┄┄┄┄┄┄┄┄┄⪼',
        '',
        '⚠️ 𝐏ᴜʙʟɪᴄ 𝐁𝐈𝐍 ᴅᴀᴛᴀ ᴏɴʟʏ — ɴᴇᴠᴇʀ sᴇɴᴅ ғᴜʟʟ ᴄᴀʀᴅ ᴅᴇᴛᴀɪʟs.',
      ]
      return await reply(lines.join('\n'))
    } catch (error) {
      logger.warn({ bin, err: error.message }, 'BIN lookup failed')
      return await reply('> ❌ 𝐅ᴀɪʟᴇᴅ ᴛᴏ ʟᴏᴏᴋ ᴜᴘ 𝐁𝐈𝐍 ɪɴғᴏʀᴍᴀᴛɪᴏɴ.')
    }
  },
}
