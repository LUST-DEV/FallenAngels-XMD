const logger = require('../../logger')

const API_URL = 'https://www.1secmail.com/api/v1/'

function addApiParams(endpoint, params) {
  for (const [key, value] of Object.entries(params)) {
    endpoint.searchParams.set(key, value)
  }
  return endpoint
}

module.exports = {
  name: 'checkmail',
  desc: 'Check messages in a disposable email inbox',
  async run({ args, reply }) {
    const login = args[0]?.trim()
    const domain = args[1]?.trim()
    if (!login || !domain || !/^[a-z\d._+-]{1,64}$/i.test(login) || !/^[a-z\d.-]{1,253}$/i.test(domain)) {
      return reply('> ❌ 𝐔sᴀɢᴇ: .checkmail <ʟᴏɢɪɴ> <ᴅᴏᴍᴀɪɴ>')
    }

    try {
      const inboxEndpoint = addApiParams(new URL(API_URL), {
        action: 'getMessages',
        login,
        domain,
      })
      const response = await fetch(inboxEndpoint, { signal: AbortSignal.timeout(15_000) })
      if (!response.ok) throw new Error(`1secmail API returned HTTP ${response.status}.`)

      const messages = await response.json()
      if (!Array.isArray(messages)) throw new Error('1secmail API returned an invalid inbox.')
      if (!messages.length) {
        return reply('> 📭 𝐈ɴʙᴏx ɪs ᴇᴍᴘᴛʏ. 𝐍ᴏ ᴍᴇssᴀɢᴇs ʀᴇᴄᴇɪᴠᴇᴅ ʏᴇᴛ.')
      }

      const latest = messages[0]
      if (!latest || !Number.isInteger(Number(latest.id))) {
        throw new Error('1secmail API returned an invalid message identifier.')
      }

      const messageEndpoint = addApiParams(new URL(API_URL), {
        action: 'readMessage',
        login,
        domain,
        id: String(latest.id),
      })
      const mailResponse = await fetch(messageEndpoint, { signal: AbortSignal.timeout(15_000) })
      if (!mailResponse.ok) throw new Error(`1secmail API returned HTTP ${mailResponse.status}.`)

      const fullMail = await mailResponse.json()
      const body = typeof fullMail.textBody === 'string'
        ? fullMail.textBody
        : typeof fullMail.body === 'string'
          ? fullMail.body.replace(/<[^>]*>/g, ' ')
          : 'No text content'
      const cleanBody = body.replace(/\s+/g, ' ').trim().slice(0, 500) || 'No text content'
      const text = [
        '╭─❮ ❍ 𝐅ᴀʟʟᴇɴ 𝐗 𝐀ɴɢᴇʟs ❍ ❯',
        '│ 𖤐 𝐈ɴʙᴏx 𝐌ᴇssᴀɢᴇ 𝐑ᴇᴄᴇɪᴠᴇᴅ',
        '│',
        `│ ✦ 𝐅ʀᴏᴍ: ${String(fullMail.from || 'Unknown').slice(0, 200)}`,
        `│ ✦ 𝐒ᴜʙᴊᴇᴄᴛ: ${String(fullMail.subject || 'No Subject').slice(0, 200)}`,
        `│ ✦ 𝐃ᴀᴛᴇ: ${String(fullMail.date || 'Unknown').slice(0, 100)}`,
        '│',
        '│ ✦ 𝐂ᴏɴᴛᴇɴᴛ:',
        `│ ${cleanBody}`,
        '│',
        '│ ⚠️ 𝐓ʜɪs ᴅɪsᴘᴏsᴀʙʟᴇ ɪɴʙᴏx ɪs ɴᴏᴛ ᴘʀɪᴠᴀᴛᴇ.',
        '╰┄┄┄┄┄┄┄┄┄┄┄⪼',
      ].join('\n')

      return await reply(text)
    } catch (error) {
      logger.warn({ login, domain, err: error.message }, 'temporary email inbox check failed')
      return await reply('> ❌ 𝐅ᴀɪʟᴇᴅ ᴛᴏ ᴄʜᴇᴄᴋ ɪɴʙᴏx.')
    }
  },
}
