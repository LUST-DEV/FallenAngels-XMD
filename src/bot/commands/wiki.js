const logger = require('../../logger')

const WIKI_API = 'https://en.wikipedia.org/w/api.php'
const SUMMARY_API = 'https://en.wikipedia.org/api/rest_v1/page/summary/'

module.exports = {
  name: 'wiki',
  desc: 'Search Wikipedia and show an English summary',
  async run({ args, reply }) {
    const subject = args.join(' ').trim()
    if (!subject || subject.length > 150) {
      return reply('> ❌ 𝐔sᴀɢᴇ: .wiki <sᴜʙᴊᴇᴄᴛ>')
    }

    try {
      const searchUrl = new URL(WIKI_API)
      searchUrl.searchParams.set('action', 'query')
      searchUrl.searchParams.set('list', 'search')
      searchUrl.searchParams.set('srsearch', subject)
      searchUrl.searchParams.set('srlimit', '1')
      searchUrl.searchParams.set('format', 'json')
      searchUrl.searchParams.set('utf8', '1')
      const searchResponse = await fetch(searchUrl, {
        headers: { 'user-agent': 'FallenAngelsXMD/1.0 (Wikipedia summary command)' },
        signal: AbortSignal.timeout(12_000),
      })
      if (!searchResponse.ok) throw new Error(`Wikipedia search returned HTTP ${searchResponse.status}.`)

      const searchData = await searchResponse.json()
      const title = searchData?.query?.search?.[0]?.title
      if (typeof title !== 'string' || !title) {
        return reply(`> ❌ 𝐍ᴏ 𝐖ɪᴋɪᴘᴇᴅɪᴀ ᴀʀᴛɪᴄʟᴇ ғᴏᴜɴᴅ ғᴏʀ *${subject}*.`)
      }

      const summaryUrl = new URL(encodeURIComponent(title), SUMMARY_API)
      const summaryResponse = await fetch(summaryUrl, {
        headers: { 'user-agent': 'FallenAngelsXMD/1.0 (Wikipedia summary command)' },
        signal: AbortSignal.timeout(12_000),
      })
      if (!summaryResponse.ok) throw new Error(`Wikipedia summary returned HTTP ${summaryResponse.status}.`)

      const summary = await summaryResponse.json()
      const extract = typeof summary.extract === 'string' ? summary.extract.trim() : ''
      if (!extract) throw new Error('Wikipedia returned an empty article summary.')

      const text = [
        '╭─❮ ❍ 𝐅ᴀʟʟᴇɴ 𝐗 𝐀ɴɢᴇʟs ❍ ❯',
        '│ 𖤐 𝐖ɪᴋɪᴘᴇᴅɪᴀ 𝐄ɴᴄʏᴄʟᴏᴘᴇᴅɪᴀ',
        '│',
        `│ ✦ 𝐓ɪᴛʟᴇ: ${summary.title || title}`,
        '│',
        `│ ${extract.slice(0, 2500)}`,
        '│',
        `│ ✦ 𝐑ᴇᴀᴅ ᴍᴏʀᴇ: ${summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`}`,
        '╰┄┄┄┄┄┄┄┄┄┄┄⪼',
      ].join('\n')
      return await reply(text)
    } catch (error) {
      logger.warn({ subject, err: error.message }, 'Wikipedia lookup failed')
      return await reply('> ❌ 𝐅ᴀɪʟᴇᴅ ᴛᴏ ʟᴏᴏᴋ ᴜᴘ 𝐖ɪᴋɪᴘᴇᴅɪᴀ.')
    }
  },
}
