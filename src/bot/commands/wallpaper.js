const logger = require('../../logger')

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
const MAX_QUERY_LENGTH = 100

function cleanMetadata(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

module.exports = {
  name: 'wallpaper',
  aliases: ['wp'],
  desc: 'Search Wikimedia Commons for a landscape wallpaper',
  async run({ sock, jid, msg, args, reply, prefix }) {
    const query = args.join(' ').trim()
    if (!query || query.length > MAX_QUERY_LENGTH) {
      return reply(`> ❌ 𝐔sᴀɢᴇ: ${prefix}wallpaper <sᴇᴀʀᴄʜ ᴛᴇʀᴍ>`)
    }

    try {
      try {
        await sock.sendMessage(jid, { react: { text: '🖼️', key: msg.key } })
      } catch (error) {
        logger.debug({ jid, err: error.message }, 'unable to react to wallpaper command')
      }

      const searchUrl = new URL(COMMONS_API)
      searchUrl.searchParams.set('action', 'query')
      searchUrl.searchParams.set('generator', 'search')
      searchUrl.searchParams.set('gsrsearch', `${query} wallpaper`)
      searchUrl.searchParams.set('gsrnamespace', '6')
      searchUrl.searchParams.set('gsrlimit', '10')
      searchUrl.searchParams.set('prop', 'imageinfo')
      searchUrl.searchParams.set('iiprop', 'url|extmetadata')
      searchUrl.searchParams.set('iiurlwidth', '1600')
      searchUrl.searchParams.set('format', 'json')
      searchUrl.searchParams.set('formatversion', '2')

      const response = await fetch(searchUrl, {
        headers: {
          accept: 'application/json',
          'user-agent': 'FallenAngelsXMD/1.0 (wallpaper search)',
        },
        signal: AbortSignal.timeout(20_000),
      })
      if (!response.ok) throw new Error(`Wikimedia Commons returned HTTP ${response.status}.`)

      const result = await response.json()
      const pages = result.query?.pages || []
      const images = pages
        .map((page) => ({ page, info: page.imageinfo?.[0] }))
        .filter(({ info }) => info?.thumburl || info?.url)
      const selected = images.find(({ info }) => info.width >= info.height) || images[0]
      if (!selected) {
        return reply(`> ❌ 𝐍ᴏ ᴡᴀʟʟᴘᴀᴘᴇʀs ғᴏᴜɴᴅ ғᴏʀ *${query}*.`)
      }

      const { page, info } = selected
      const metadata = info.extmetadata || {}
      const title = cleanMetadata(metadata.ObjectName?.value) || page.title.replace(/^File:/, '')
      const artist = cleanMetadata(metadata.Artist?.value) || 'Unknown'
      const license = cleanMetadata(metadata.LicenseShortName?.value) || 'See source page'
      const caption = [
        '╭─❮ 𓆩 𝐖ᴀʟʟᴘᴀᴘᴇʀ 𓆪 ❯',
        `│ ✦ 𝐓ɪᴛʟᴇ ➪ ${title}`,
        `│ 𓆩 𝐒ᴇᴀʀᴄʜ ➪ ${query}`,
        `│ 📷 𝐂ʀᴇᴀᴛᴏʀ ➪ ${artist}`,
        `│ ©️ 𝐋ɪᴄᴇɴsᴇ ➪ ${license}`,
        `│ 🔗 𝐒ᴏᴜʀᴄᴇ ➪ ${info.descriptionurl}`,
        '╰─────────────────────────',
      ].join('\n')

      return sock.sendMessage(jid, {
        image: { url: info.thumburl || info.url },
        caption,
      }, { quoted: msg })
    } catch (error) {
      logger.error({ jid, query, err: error.message }, 'wallpaper search failed')
      return reply('> ❌ 𝐂ᴏᴜʟᴅ ɴᴏᴛ ғᴇᴛᴄʜ ᴀ ᴡᴀʟʟᴘᴀᴘᴇʀ. 𝐏ʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ.')
    }
  },
}
