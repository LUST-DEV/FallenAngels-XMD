const logger = require('../../logger')

const ANIMECHAN_API = 'https://api.animechan.io/v1/quotes/random'
const JIKAN_CHARACTER_API = 'https://api.jikan.moe/v4/characters'
const MAX_QUERY_LENGTH = 80
const REQUEST_TIMEOUT = 15_000

function normalizeName(value) {
  return String(value || '').trim().toLocaleLowerCase()
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      accept: 'application/json',
      ...options.headers,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return response.json()
}

async function fetchQuote(mode, query) {
  const url = new URL(ANIMECHAN_API)

  if (mode === 'character') url.searchParams.set('character', query)
  if (mode === 'anime') url.searchParams.set('anime', query)

  const result = await fetchJson(url)

  // Accepte les réponses de forme { data: ... } ou directement { ... }
  const quote = result?.data || result?.quote || result

  if (
    !quote?.content ||
    !quote?.anime?.name ||
    !quote?.character?.name
  ) {
    throw new Error('The quote API returned incomplete data.')
  }

  if (query) {
    const returnedValue = mode === 'anime'
      ? quote.anime.name
      : quote.character.name

    if (!normalizeName(returnedValue).includes(normalizeName(query))) {
      return null
    }
  }

  return quote
}

async function fetchCharacterImage(name) {
  const url = new URL(JIKAN_CHARACTER_API)
  url.searchParams.set('q', name)
  url.searchParams.set('limit', '10')

  const result = await fetchJson(url)
  const characters = Array.isArray(result?.data) ? result.data : []
  const normalizedName = normalizeName(name)

  const character =
    characters.find(entry => normalizeName(entry.name) === normalizedName) ||
    characters.find(entry => normalizeName(entry.name).includes(normalizedName)) ||
    characters[0]

  const imageUrl =
    character?.images?.jpg?.image_url ||
    character?.images?.webp?.image_url

  if (!imageUrl) return null

  return {
    imageUrl,
    profileUrl: character.url || 'Unavailable',
  }
}

module.exports = {
  name: 'animequote',
  aliases: ['aq'],
  desc: 'Send an anime quote with character details',

  async run({ sock, jid, msg, args, reply, prefix }) {
    const input = args.join(' ').trim()
    const isAnimeSearch = args[0]?.toLowerCase() === 'anime'

    const mode = isAnimeSearch
      ? 'anime'
      : input && input.toLowerCase() !== 'random'
        ? 'character'
        : 'random'

    const query = isAnimeSearch
      ? args.slice(1).join(' ').trim()
      : mode === 'character'
        ? input
        : ''

    if ((mode !== 'random' && !query) || query.length > MAX_QUERY_LENGTH) {
      return reply([
        '> ❌ 𝐔sᴀɢᴇ:',
        `• ${prefix}animequote — ʀᴀɴᴅᴏᴍ ǫᴜᴏᴛᴇ`,
        `• ${prefix}animequote <ᴄʜᴀʀᴀᴄᴛᴇʀ>`,
        `• ${prefix}animequote anime <ᴀɴɪᴍᴇ ᴛɪᴛʟᴇ>`,
      ].join('\n'))
    }

    try {
      try {
        await sock.sendMessage(jid, {
          react: { text: '🎌', key: msg.key },
        })
      } catch (error) {
        logger.debug(
          { jid, err: error.message },
          'Unable to react to animequote command'
        )
      }

      const quote = await fetchQuote(mode, query)

      if (!quote) {
        const kind = mode === 'anime' ? 'ᴀɴɪᴍᴇ' : 'ᴄʜᴀʀᴀᴄᴛᴇʀ'
        return reply(`> ❌ 𝐍ᴏ ǫᴜᴏᴛᴇ ғᴏᴜɴᴅ ғᴏʀ ᴛʜᴀᴛ ${kind}: *${query}*.`)
      }

      let characterImage = null

      // L'échec de recherche d'image ne doit pas empêcher l'envoi de la citation.
      try {
        characterImage = await fetchCharacterImage(quote.character.name)
      } catch (error) {
        logger.warn(
          { jid, character: quote.character.name, err: error.message },
          'Character image lookup failed'
        )
      }

      const caption = [
        '╭─❮ 𓆩 𝐀ɴɪᴍᴇ 𝐐ᴜᴏᴛᴇ 𓆪 ❯',
        `│ “${quote.content}”`,
        '│',
        `│ ✦ 𝐂ʜᴀʀᴀᴄᴛᴇʀ ➪ ${quote.character.name}`,
        `│ 🎌 𝐀ɴɪᴍᴇ ➪ ${quote.anime.name}`,
        `│ 𓆩 𝐀ʟᴛ 𝐓ɪᴛʟᴇ ➪ ${quote.anime.altName || 'Unavailable'}`,
        `│ #️⃣ 𝐐ᴜᴏᴛᴇ 𝐈𝐃 ➪ ${quote.id ?? 'Unavailable'}`,
        `│ 🆔 𝐂ʜᴀʀᴀᴄᴛᴇʀ 𝐈𝐃 ➪ ${quote.character.id ?? 'Unavailable'}`,
        `│ 📖 𝐏ʀᴏғɪʟᴇ ➪ ${characterImage?.profileUrl || 'Unavailable'}`,
        '╰─────────────────────────',
      ].join('\n')

      if (!characterImage?.imageUrl) {
        return reply(caption)
      }

      try {
        return await sock.sendMessage(
          jid,
          {
            image: { url: characterImage.imageUrl },
            caption,
          },
          { quoted: msg }
        )
      } catch (error) {
        logger.warn(
          { jid, err: error.message },
          'Character image sending failed; sending quote as text'
        )
        return reply(caption)
      }
    } catch (error) {
      logger.error(
        { jid, mode, query, err: error.message },
        'Anime quote request failed'
      )
      return reply('> ❌ 𝐂ᴏᴜʟᴅ ɴᴏᴛ ғᴇᴛᴄʜ ᴛʜᴇ ǫᴜᴏᴛᴇ. 𝐏ʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ.')
    }
  },
}