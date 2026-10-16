const logger = require('../../logger')

const COUNTRY_API = 'https://restcountries.com/v3.1/name/'

module.exports = {
  name: 'country',
  desc: 'Show a country flag and public country details',
  async run({ sock, jid, msg, args, reply }) {
    const countryName = args.join(' ').trim()
    if (!countryName || countryName.length > 100) {
      return reply('> ❌ 𝐔sᴀɢᴇ: .country <ᴄᴏᴜɴᴛʀʏ>')
    }

    try {
      const endpoint = new URL(encodeURIComponent(countryName), COUNTRY_API)
      endpoint.searchParams.set('fields', 'name,capital,region,subregion,population,currencies,languages,timezones,flags,cca2')
      const response = await fetch(endpoint, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(12_000),
      })
      if (response.status === 404) return reply(`> ❌ 𝐂ᴏᴜɴᴛʀʏ *${countryName}* ɴᴏᴛ ғᴏᴜɴᴅ.`)
      if (!response.ok) throw new Error(`REST Countries returned HTTP ${response.status}.`)

      const countries = await response.json()
      const country = Array.isArray(countries) ? countries[0] : null
      if (!country || typeof country.name?.common !== 'string') {
        throw new Error('REST Countries returned an invalid country record.')
      }

      const currencies = Object.values(country.currencies || {})
        .map((currency) => [currency.name, currency.symbol].filter(Boolean).join(' '))
        .filter(Boolean)
      const languages = Object.values(country.languages || {})
      const flagUrl = country.flags?.png
      const caption = [
        '╭─❮ ❍ 𝐅ᴀʟʟᴇɴ 𝐗 𝐀ɴɢᴇʟs ❍ ❯',
        '│ 𖤐 𝐂ᴏᴜɴᴛʀʏ 𝐑ᴀᴅᴀʀ',
        '│',
        `│ ✦ 𝐂ᴏᴜɴᴛʀʏ: ${country.name.common}${country.flag ? ` ${country.flag}` : ''}`,
        `│ ✦ 𝐂ᴀᴘɪᴛᴀʟ: ${(country.capital || ['Unavailable']).join(', ')}`,
        `│ ✦ 𝐂ᴏɴᴛɪɴᴇɴᴛ: ${(country.continents || [country.region || 'Unavailable']).join(', ')}`,
        `│ ✦ 𝐏ᴏᴘᴜʟᴀᴛɪᴏɴ: ${Number.isFinite(country.population) ? new Intl.NumberFormat('en-US').format(country.population) : 'Unavailable'}`,
        `│ ✦ 𝐂ᴜʀʀᴇɴᴄɪᴇs: ${currencies.length ? currencies.join(', ') : 'Unavailable'}`,
        `│ ✦ 𝐋ᴀɴɢᴜᴀɢᴇs: ${languages.length ? languages.join(', ') : 'Unavailable'}`,
        `│ ✦ 𝐓ɪᴍᴇ 𝐙ᴏɴᴇs: ${(country.timezones || ['Unavailable']).join(', ')}`,
        '╰┄┄┄┄┄┄┄┄┄┄┄⪼',
      ].join('\n')

      if (typeof flagUrl === 'string') {
        const parsedFlag = new URL(flagUrl)
        if (parsedFlag.protocol !== 'https:') throw new Error('REST Countries returned an unsupported flag URL.')
        return await sock.sendMessage(jid, { image: { url: parsedFlag.toString() }, caption }, { quoted: msg })
      }
      return await reply(caption)
    } catch (error) {
      logger.warn({ countryName, err: error.message }, 'country lookup failed')
      return await reply('> ❌ 𝐅ᴀɪʟᴇᴅ ᴛᴏ ғᴇᴛᴄʜ ᴄᴏᴜɴᴛʀʏ ɪɴғᴏʀᴍᴀᴛɪᴏɴ.')
    }
  },
}
