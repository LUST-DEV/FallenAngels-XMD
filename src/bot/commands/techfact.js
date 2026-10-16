const logger = require('../../logger')

module.exports = {
  name: 'techfact',
  desc: 'Share a random verified fact from the Useless Facts API',
  async run({ reply }) {
    try {
      const endpoint = new URL('https://uselessfacts.jsph.pl/api/v2/facts/random')
      endpoint.searchParams.set('language', 'en')
      const response = await fetch(endpoint, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(12_000),
      })
      if (!response.ok) throw new Error(`Useless Facts API returned HTTP ${response.status}.`)

      const data = await response.json()
      if (typeof data.text !== 'string' || !data.text.trim()) {
        throw new Error('Useless Facts API returned an empty fact.')
      }

      return await reply([
        '╭─❮ ❍ 𝐅ᴀʟʟᴇɴ 𝐗 𝐀ɴɢᴇʟs ❍ ❯',
        '│ 𖤐 𝐓ᴇᴄʜ 𝐅ᴀᴄᴛ 𝐀ʀᴄʜɪᴠᴇ',
        '│',
        `│ ✦ ${data.text.trim().slice(0, 1500)}`,
        '╰┄┄┄┄┄┄┄┄┄┄┄⪼',
        '',
        '𝐒ᴏᴜʀᴄᴇ: Useless Facts API',
      ].join('\n'))
    } catch (error) {
      logger.warn({ err: error.message }, 'tech fact lookup failed')
      return await reply('> ❌ 𝐅ᴀɪʟᴇᴅ ᴛᴏ ʟᴏᴀᴅ ᴀ ᴛᴇᴄʜ ғᴀᴄᴛ.')
    }
  },
}
