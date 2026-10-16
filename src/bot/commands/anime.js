const logger = require('../../logger')

const MAX_QUERY_LENGTH = 100
const MAX_SYNOPSIS_LENGTH = 650

// Source 1 : Jikan API (MyAnimeList)
async function fetchFromJikan(query) {
  const searchUrl = new URL('https://api.jikan.moe/v4/anime')
  searchUrl.searchParams.set('q', query)
  searchUrl.searchParams.set('limit', '1')
  searchUrl.searchParams.set('sfw', 'true')

  const response = await fetch(searchUrl, {
    signal: AbortSignal.timeout(15_000),
    headers: { Accept: 'application/json' }
  })

  if (!response.ok) throw new Error(`Jikan error ${response.status}`)
  
  const result = await response.json()
  const anime = result.data?.[0]
  if (!anime) return null

  return {
    title: anime.title_english && anime.title_english !== anime.title ? `${anime.title} (${anime.title_english})` : anime.title,
    type: anime.type || 'Unknown',
    episodes: anime.episodes ?? 'Unknown',
    score: anime.score ?? 'Unrated',
    year: anime.year || anime.aired?.prop?.from?.year || 'Unknown',
    genres: anime.genres?.length ? anime.genres.map(g => g.name).join(', ') : 'Unknown',
    url: anime.url || 'Unavailable',
    synopsis: anime.synopsis || 'No synopsis available.',
    imageUrl: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || null
  }
}

// Source 2 : Kitsu API (Secours ultra-rapide)
async function fetchFromKitsu(query) {
  const searchUrl = new URL('https://kitsu.io/api/edge/anime')
  searchUrl.searchParams.set('filter[text]', query)
  searchUrl.searchParams.set('page[limit]', '1')

  const response = await fetch(searchUrl, {
    signal: AbortSignal.timeout(15_000),
    headers: { Accept: 'application/vnd.api+json' }
  })

  if (!response.ok) throw new Error(`Kitsu error ${response.status}`)

  const result = await response.json()
  const anime = result.data?.[0]?.attributes
  if (!anime) return null

  return {
    title: anime.canonicalTitle || anime.titles?.en || 'Unknown Anime',
    type: anime.showType || 'TV',
    episodes: anime.episodeCount ?? 'Unknown',
    score: anime.averageRating ? (Number(anime.averageRating) / 10).toFixed(2) : 'Unrated',
    year: anime.startDate ? anime.startDate.split('-')[0] : 'Unknown',
    genres: 'Unavailable',
    url: `https://kitsu.io/anime/${result.data[0].id}`,
    synopsis: anime.synopsis || 'No synopsis available.',
    imageUrl: anime.posterImage?.original || anime.posterImage?.large || null
  }
}

module.exports = {
  name: 'anime',
  aliases: ['ani', 'animeinfo'],
  desc: 'Search for an anime and display its details with multi-API fallback',

  async run({ sock, jid, msg, args, reply, prefix }) {
    const query = args.join(' ').trim()

    if (!query) {
      return reply(`> ❌ 𝐔sᴀɢᴇ: ${prefix}anime <ᴀɴɪᴍᴇ ᴛɪᴛʟᴇ>`)
    }

    if (query.length > MAX_QUERY_LENGTH) {
      return reply(`> ❌ 𝐓ʜᴇ ᴛɪᴛʟᴇ ᴍᴜsᴛ ʙᴇ ${MAX_QUERY_LENGTH} ᴄʜᴀʀᴀᴄᴛᴇʀs ᴏʀ ғᴇᴡᴇʀ.`)
    }

    try {
      try {
        await sock.sendMessage(jid, { react: { text: '🎌', key: msg.key } })
      } catch {}

      let animeData = null

      // Tentative 1 : Jikan
      try {
        animeData = await fetchFromJikan(query)
      } catch (e) {
        console.log('[ANIME] Jikan API failed, switching to Kitsu fallback...')
      }

      // Tentative 2 : Kitsu (Secours)
      if (!animeData) {
        try {
          animeData = await fetchFromKitsu(query)
        } catch (e) {
          console.log('[ANIME] Kitsu fallback also failed.')
        }
      }

      if (!animeData) {
        return reply('> ❌ 𝐍ᴏ ᴀɴɪᴍᴇ ᴡᴀs ғᴏᴜɴᴅ ғᴏʀ ᴛʜᴀᴛ ᴛɪᴛʟᴇ ᴏɴ ᴀɴʏ sᴇʀᴠᴇʀ.')
      }

      const rawSynopsis = animeData.synopsis
      const synopsis = rawSynopsis.length > MAX_SYNOPSIS_LENGTH
        ? `${rawSynopsis.slice(0, MAX_SYNOPSIS_LENGTH).trim()}…`
        : rawSynopsis

      const caption = [
        '╭─❮ 𓆩 𝐀ɴɪᴍᴇ 𝐃ᴇᴛᴀɪʟs 𓆪 ❯',
        `│ ✦ 𝐓ɪᴛʟᴇ ➪ ${animeData.title}`,
        `│ 🎭 𝐓ʏᴘᴇ ➪ ${animeData.type}`,
        `│ 📺 𝐄ᴘɪsᴏᴅᴇs ➪ ${animeData.episodes}`,
        `│ ⭐ 𝐒ᴄᴏʀᴇ ➪ ${animeData.score}`,
        `│ 📅 𝐘ᴇᴀʀ ➪ ${animeData.year}`,
        `│ 🏷 𝐆ᴇɴʀᴇs ➪ ${animeData.genres}`,
        `│ 🔗 𝐌ᴏʀᴇ ➪ ${animeData.url}`,
        '│',
        `│ 📝 𝐒ʏɴᴏᴘsɪs ➪ ${synopsis}`,
        '╰─────────────────────────'
      ].join('\n')

      if (!animeData.imageUrl) {
        return reply(caption)
      }

      return await sock.sendMessage(
        jid,
        {
          image: { url: animeData.imageUrl },
          caption
        },
        { quoted: msg }
      )

    } catch (error) {
      logger.error({ jid, query, err: error.message }, 'Anime search total failure')
      return reply('> ❌ 𝐂ᴏᴜʟᴅ ɴᴏᴛ ғᴇᴛᴄʜ ᴀɴɪᴍᴇ ɪɴғᴏ. 𝐏ʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇ🇷.')
    }
  }
}