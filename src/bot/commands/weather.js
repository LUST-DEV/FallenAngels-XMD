const logger = require('../../logger')

const GEOCODING_API = 'https://nominatim.openstreetmap.org/search'
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast'

const WEATHER_CODES = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  80: 'Rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Thunderstorm with heavy hail',
}

module.exports = {
  name: 'weather',
  desc: 'Get current weather conditions for a city',
  async run({ args, reply }) {
    const city = args.join(' ').trim()
    if (!city || city.length > 100) {
      return reply('> ❌ 𝐔sᴀɢᴇ: .weather <ᴄɪᴛʏ>')
    }

    try {
      const locationUrl = new URL(GEOCODING_API)
      locationUrl.searchParams.set('q', city)
      locationUrl.searchParams.set('limit', '1')
      locationUrl.searchParams.set('format', 'jsonv2')
      const locationResponse = await fetch(locationUrl, {
        headers: {
          accept: 'application/json',
          'user-agent': 'FallenAngelsXMD/1.0 (weather lookup)',
        },
        signal: AbortSignal.timeout(12_000),
      })
      if (!locationResponse.ok) throw new Error(`OpenStreetMap Nominatim returned HTTP ${locationResponse.status}.`)

      const locations = await locationResponse.json()
      const location = Array.isArray(locations) ? locations[0] : null
      if (!location || !Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lon))) {
        return reply(`> ❌ 𝐍ᴏ ʟᴏᴄᴀᴛɪᴏɴ ғᴏᴜɴᴅ ғᴏʀ *${city}*.`)
      }

      const weatherUrl = new URL(WEATHER_API)
      weatherUrl.searchParams.set('latitude', String(Number(location.lat)))
      weatherUrl.searchParams.set('longitude', String(Number(location.lon)))
      weatherUrl.searchParams.set('current', 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code')
      weatherUrl.searchParams.set('timezone', 'auto')
      const weatherResponse = await fetch(weatherUrl, { signal: AbortSignal.timeout(12_000) })
      if (!weatherResponse.ok) throw new Error(`Open-Meteo forecast returned HTTP ${weatherResponse.status}.`)

      const data = await weatherResponse.json()
      const current = data?.current
      if (!current || !Number.isFinite(current.temperature_2m)) {
        throw new Error('Open-Meteo returned incomplete current conditions.')
      }

      const address = location.address || {}
      const locationName = [
        location.name || address.city || address.town || address.village || address.county,
        address.state || address.region,
        address.country,
      ].filter(Boolean).join(', ')
      const text = [
        '╭─❮ ❍ 𝐅ᴀʟʟᴇɴ 𝐗 𝐀ɴɢᴇʟs ❍ ❯',
        '│ 𖤐 𝐖ᴇᴀᴛʜᴇʀ 𝐓ᴇʟᴇᴍᴇᴛʀʏ',
        '│',
        `│ ✦ 𝐋ᴏᴄᴀᴛɪᴏɴ: ${locationName}`,
        `│ ✦ 𝐂ᴏɴᴅɪᴛɪᴏɴ: ${WEATHER_CODES[current.weather_code] || 'Unknown'}`,
        `│ ✦ 𝐓ᴇᴍᴘᴇʀᴀᴛᴜʀᴇ: ${current.temperature_2m} ${data.current_units?.temperature_2m || '°C'}`,
        `│ ✦ 𝐅ᴇᴇʟs ʟɪᴋᴇ: ${Number.isFinite(current.apparent_temperature) ? current.apparent_temperature : 'Unavailable'} ${data.current_units?.apparent_temperature || '°C'}`,
        `│ ✦ 𝐇ᴜᴍɪᴅɪᴛʏ: ${Number.isFinite(current.relative_humidity_2m) ? `${current.relative_humidity_2m}%` : 'Unavailable'}`,
        `│ ✦ 𝐖ɪɴᴅ: ${Number.isFinite(current.wind_speed_10m) ? `${current.wind_speed_10m} ${data.current_units?.wind_speed_10m || 'km/h'}` : 'Unavailable'}`,
        '╰┄┄┄┄┄┄┄┄┄┄┄⪼',
        '',
        '𝐃ᴀᴛᴀ: 𝐎ᴘᴇɴ-𝐌ᴇᴛᴇᴏ',
      ].join('\n')
      return await reply(text)
    } catch (error) {
      logger.warn({ city, err: error.message }, 'weather lookup failed')
      return await reply('> ❌ 𝐅ᴀɪʟᴇᴅ ᴛᴏ ғᴇᴛᴄʜ ᴡᴇᴀᴛʜᴇʀ ᴅᴀᴛᴀ.')
    }
  },
}
