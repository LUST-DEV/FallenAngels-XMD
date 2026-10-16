const logger = require('../../logger')

const API_URL = 'https://www.1secmail.com/api/v1/'

module.exports = {
  name: 'tempmail',
  aliases: ['mail', 'disposable'],
  desc: 'Generate a disposable temporary email address',
  async run({ reply }) {
    try {
      const endpoint = new URL(API_URL)
      endpoint.searchParams.set('action', 'genRandomMailbox')
      endpoint.searchParams.set('count', '1')

      const response = await fetch(endpoint, { signal: AbortSignal.timeout(15_000) })
      if (!response.ok) throw new Error(`1secmail API returned HTTP ${response.status}.`)

      const mailboxes = await response.json()
      const email = Array.isArray(mailboxes) ? mailboxes[0] : null
      if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+$/.test(email)) {
        throw new Error('1secmail API returned an invalid mailbox.')
      }

      const [login, domain] = email.split('@')
      const text = [
        '╭─❮ ❍ 𝐅ᴀʟʟᴇɴ 𝐗 𝐀ɴɢᴇʟs ❍ ❯',
        '│ 𖤐 𝐃ɪsᴘᴏsᴀʙʟᴇ 𝐈ɴʙᴏx',
        '│',
        `│ ✦ 𝐄ᴍᴀɪʟ: ${email}`,
        '│',
        '│ ✦ 𝐂ʜᴇᴄᴋ ɪɴʙᴏx:',
        `│ .checkmail ${login} ${domain}`,
        '│',
        '│ ⚠️ 𝐍ᴏᴛ ᴘʀɪᴠᴀᴛᴇ: ᴅᴏ ɴᴏᴛ ᴜsᴇ ғᴏʀ sᴇɴsɪᴛɪᴠᴇ ᴀᴄᴄᴏᴜɴᴛs.',
        '╰┄┄┄┄┄┄┄┄┄┄┄⪼',
      ].join('\n')

      return await reply(text)
    } catch (error) {
      logger.warn({ err: error.message }, 'temporary email generation failed')
      return await reply('> ❌ 𝐅ᴀɪʟᴇᴅ ᴛᴏ ɢᴇɴᴇʀᴀᴛᴇ ᴇᴍᴀɪʟ.')
    }
  },
}
