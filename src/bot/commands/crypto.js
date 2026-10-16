const logger = require('../../logger')
const sharp = require('sharp')

const COINS = {
  btc: { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC' },
  eth: { id: 'ethereum', name: 'Ethereum', symbol: 'ETH' },
  sol: { id: 'solana', name: 'Solana', symbol: 'SOL' },
  ton: { id: 'the-open-network', name: 'Toncoin', symbol: 'TON' },
}

function formatPrice(value, currency) {
  if (!Number.isFinite(value)) return 'Unavailable'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: value < 1 ? 6 : 2,
  }).format(value)
}

function escapeXml(value) {
  return String(value).replace(/[<>&"']/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&apos;',
  })[character])
}

function createMarketChart({ coin, prices, change }) {
  const width = 1200
  const height = 630
  const left = 90
  const right = width - 70
  const top = 190
  const bottom = height - 100
  const values = prices.map(([, price]) => price).filter(Number.isFinite)
  if (values.length < 2) throw new Error('CoinGecko returned too few chart points.')

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || Math.max(Math.abs(max) * 0.01, 1)
  const points = values.map((value, index) => {
    const x = left + (index / (values.length - 1)) * (right - left)
    const y = bottom - ((value - min) / range) * (bottom - top)
    return [x, y]
  })
  const line = points.map(([x, y], index) => `${index ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const area = `${line} L ${right} ${bottom} L ${left} ${bottom} Z`
  const color = change >= 0 ? '#22835b' : '#bd4a4a'
  const firstPrice = values[0]
  const lastPrice = values.at(-1)
  const changeLabel = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`

  const svg = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.24"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0.01"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="#f8f8f5"/>
      <text x="${left}" y="76" font-family="Arial, sans-serif" font-size="26" fill="#696961" letter-spacing="4">FALLEN ANGELS  /  MARKET TELEMETRY</text>
      <text x="${left}" y="139" font-family="Arial, sans-serif" font-size="48" font-weight="700" fill="#191916">${escapeXml(coin.name)} (${escapeXml(coin.symbol)})</text>
      <text x="${right}" y="136" text-anchor="end" font-family="Arial, sans-serif" font-size="36" font-weight="700" fill="${color}">${changeLabel}</text>
      <text x="${left}" y="180" font-family="Arial, sans-serif" font-size="22" fill="#696961">USD • LAST 24 HOURS</text>
      <path d="${area}" fill="url(#fill)"/>
      <path d="${line}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${right}" cy="${points.at(-1)[1].toFixed(1)}" r="9" fill="${color}"/>
      <text x="${left}" y="${height - 43}" font-family="Arial, sans-serif" font-size="20" fill="#696961">24H AGO  ${escapeXml(formatPrice(firstPrice, 'USD'))}</text>
      <text x="${right}" y="${height - 43}" text-anchor="end" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#191916">NOW  ${escapeXml(formatPrice(lastPrice, 'USD'))}</text>
      <text x="${right}" y="${height - 13}" text-anchor="end" font-family="Arial, sans-serif" font-size="13" fill="#888880">Source: CoinGecko</text>
    </svg>
  `)
  return sharp(svg).png().toBuffer()
}

module.exports = {
  name: 'crypto',
  desc: 'Show live cryptocurrency prices in USD and EUR',
  async run({ args, sock, jid, msg, reply }) {
    const ticker = args[0]?.toLowerCase()
    const coin = COINS[ticker]
    if (!coin) {
      return reply('> ❌ 𝐔sᴀɢᴇ: .crypto <ʙᴛᴄ | ᴇᴛʜ | sᴏʟ | ᴛᴏɴ>')
    }

    try {
      const endpoint = new URL('https://api.coingecko.com/api/v3/simple/price')
      endpoint.searchParams.set('ids', coin.id)
      endpoint.searchParams.set('vs_currencies', 'usd,eur')
      endpoint.searchParams.set('include_24hr_change', 'true')
      const response = await fetch(endpoint, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(15_000),
      })
      if (!response.ok) throw new Error(`CoinGecko returned HTTP ${response.status}.`)

      const data = await response.json()
      const market = data?.[coin.id]
      if (!market || !Number.isFinite(market.usd) || !Number.isFinite(market.eur)) {
        throw new Error('CoinGecko returned incomplete price data.')
      }

      const change = Number.isFinite(market.usd_24h_change)
        ? market.usd_24h_change
        : null
      if (change === null) throw new Error('CoinGecko did not return the 24-hour price change.')

      const chartEndpoint = new URL(`https://api.coingecko.com/api/v3/coins/${coin.id}/market_chart`)
      chartEndpoint.searchParams.set('vs_currency', 'usd')
      chartEndpoint.searchParams.set('days', '1')
      const chartResponse = await fetch(chartEndpoint, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(15_000),
      })
      if (!chartResponse.ok) throw new Error(`CoinGecko chart returned HTTP ${chartResponse.status}.`)

      const chartData = await chartResponse.json()
      if (!Array.isArray(chartData?.prices)) {
        throw new Error('CoinGecko returned invalid chart data.')
      }

      const image = await createMarketChart({ coin, prices: chartData.prices, change })
      const trend = change === null ? 'Unavailable' : `${change >= 0 ? '📈 +' : '📉 '}${change.toFixed(2)}%`
      const text = [
        '╭─❮ 𓆩 𝗙ᴀʟʟᴇɴ 𝗫 𝗔ɴɢᴇʟs 𓆪 ❯',
        '│ 🝐 𝗖ʀʏᴘᴛᴏ 𝗠ᴀʀᴋᴇᴛ 𝗧ʀᴇɴᴅ',
        '│',
        `│ ⸸ 𝗖ᴏɪɴ ➪ ${coin.name} (${coin.symbol})`,
        `│ 🝓 𝗨𝗦𝗗 ➪ ${formatPrice(market.usd, 'USD')}`,
        `│ 🝓 𝗘𝗨𝗥 ➪ ${formatPrice(market.eur, 'EUR')}`,
        `│ ⸸ 𝟮𝟰ʜ 𝗖ʜᴀɴɢᴇ ➪ ${trend}`,
        '╰─────────────────────────',
        '',
        '⚠️ 𝗜ɴғᴏʀᴍᴀᴛɪᴏɴ ᴏɴʟʏ — ɴᴏᴛ ғɪɴᴀɴᴄɪᴀʟ ᴀᴅᴠɪᴄᴇ.',
        '𓆩 𝗦ᴏᴜʀᴄᴇ: 𝗖ᴏɪɴɢᴇᴄᴋᴏ • 𝟮𝟰ʜ',
      ].join('\n')
      return await sock.sendMessage(jid, { image, caption: text }, { quoted: msg })
    } catch (error) {
      logger.warn({ ticker, err: error.message }, 'cryptocurrency price lookup failed')
      return await reply('> ❌ 𝐅ᴀɪʟᴇᴅ ᴛᴏ ғᴇᴛᴄʜ ᴄʀʏᴘᴛᴏ ᴘʀɪᴄᴇs.')
    }
  },
}
