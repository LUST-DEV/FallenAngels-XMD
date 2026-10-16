const logger = require('../../logger')

const RECORD_TYPES = ['A', 'AAAA', 'MX', 'NS', 'TXT']

module.exports = {
  name: 'dns',
  desc: 'Look up common DNS records for a domain',
  async run({ args, reply }) {
    const domain = args[0]?.trim().toLowerCase().replace(/\.$/, '')
    if (
      !domain
      || domain.length > 253
      || !domain.includes('.')
      || !domain.split('.').every((label) => /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(label))
    ) {
      return reply('> ❌ 𝐔sᴀɢᴇ: .dns <ᴅᴏᴍᴀɪɴ>')
    }

    try {
      const results = await Promise.all(RECORD_TYPES.map(async (type) => {
        const endpoint = new URL('https://dns.google/resolve')
        endpoint.searchParams.set('name', domain)
        endpoint.searchParams.set('type', type)
        const response = await fetch(endpoint, {
          headers: { accept: 'application/dns-json' },
          signal: AbortSignal.timeout(10_000),
        })
        if (!response.ok) throw new Error(`Google DNS returned HTTP ${response.status} for ${type}.`)
        const data = await response.json()
        if (data.Status !== 0 && data.Status !== 3) {
          throw new Error(`Google DNS returned status ${data.Status} for ${type}.`)
        }
        return { type, answers: (data.Answer || []).filter((answer) => answer.type === ({ A: 1, AAAA: 28, MX: 15, NS: 2, TXT: 16 })[type]) }
      }))

      const records = results
        .filter((result) => result.answers.length)
        .map((result) => `│ ✦ 𝐓ʏᴘᴇ ${result.type}: ${result.answers.slice(0, 4).map((answer) => String(answer.data).replace(/^"|"$/g, '')).join(' | ')}`)
      const text = [
        '╭─❮ ❍ 𝐅ᴀʟʟᴇɴ 𝐗 𝐀ɴɢᴇʟs ❍ ❯',
        '│ 𖤐 𝐃𝐍𝐒 𝐑ᴇsᴏʟᴠᴇʀ',
        '│',
        `│ ✦ 𝐃ᴏᴍᴀɪɴ: ${domain}`,
        ...(records.length ? records : ['│ ✦ 𝐑ᴇsᴜʟᴛ: No common records found']),
        '╰┄┄┄┄┄┄┄┄┄┄┄⪼',
      ].join('\n')
      return await reply(text)
    } catch (error) {
      logger.warn({ domain, err: error.message }, 'DNS lookup failed')
      return await reply('> ❌ 𝐅ᴀɪʟᴇᴅ ᴛᴏ ʟᴏᴏᴋ ᴜᴘ 𝐃𝐍𝐒 ʀᴇᴄᴏʀᴅs.')
    }
  },
}
