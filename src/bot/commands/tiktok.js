const logger = require('../../logger')

const TIKTOK_HOSTS = new Set([
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
  'vm.tiktok.com',
  'vt.tiktok.com',
  'link.tiktok.com'
])

function validTikTokUrl(value) {
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:') &&
      TIKTOK_HOSTS.has(url.hostname.toLowerCase())
  } catch {
    return false
  }
}

// Fonction de secours multi-sources qui renvoie DIRECTEMENT un Buffer MP4
async function downloadTikTokBuffer(targetUrl) {
  // Source 1 : TikWM API (La plus stable en 2026)
  try {
    const res = await fetch('https://www.tikwm.com/api/', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: new URLSearchParams({
        url: targetUrl,
        count: '12',
        cursor: '0',
        web: '1',
        hd: '1'
      }),
      signal: AbortSignal.timeout(25000)
    })

    if (res.ok) {
      const data = await res.json()
      const playUrl = data?.data?.play || data?.data?.wmplay
      if (playUrl) {
        // TikWM renvoie parfois des chemins relatifs (/video/...)
        const finalUrl = playUrl.startsWith('http') ? playUrl : `https://www.tikwm.com${playUrl}`
        const vidRes = await fetch(finalUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.tikwm.com/'
          },
          signal: AbortSignal.timeout(45000)
        })

        if (vidRes.ok) {
          const buffer = Buffer.from(await vidRes.arrayBuffer())
          if (buffer.length > 10000) { // Vérifie qu'on a bien un fichier vidéo
            return {
              buffer,
              title: data.data.title || 'TikTok Video',
              author: data.data.author?.nickname || data.data.author?.unique_id || 'TikTok User'
            }
          }
        }
      }
    }
  } catch (e) {
    console.log('[TIKTOK] Source 1 (TikWM) failed:', e.message)
  }

  // Source 2 : Lovetik / Scrape Backup
  try {
    const res = await fetch(`https://api.vreden.my.id/api/tiktok?url=${encodeURIComponent(targetUrl)}`, {
      signal: AbortSignal.timeout(25000)
    })
    if (res.ok) {
      const data = await res.json()
      const streamUrl = data?.result?.nowm || data?.result?.data?.nowatermark || data?.result?.video
      if (streamUrl) {
        const vidRes = await fetch(streamUrl, { signal: AbortSignal.timeout(45000) })
        if (vidRes.ok) {
          const buffer = Buffer.from(await vidRes.arrayBuffer())
          if (buffer.length > 10000) {
            return {
              buffer,
              title: data.result?.title || 'TikTok Video',
              author: data.result?.author?.name || 'TikTok User'
            }
          }
        }
      }
    }
  } catch (e) {
    console.log('[TIKTOK] Source 2 failed:', e.message)
  }

  return null
}

module.exports = {
  name: 'tiktok',
  aliases: ['tt', 'ttdl'],
  desc: 'Download high quality TikTok video without watermark',
  async run({ sock, jid, msg, args, reply }) {
    const targetUrl = args[0]
    if (!targetUrl || !validTikTokUrl(targetUrl)) {
      return reply('> ❌ 𝐔sᴀɢᴇ: .tiktok <ᴠᴀʟɪᴅ ᴛɪᴋᴛᴏᴋ ʟɪɴᴋ>')
    }

    try {
      await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } })
    } catch {}

    try {
      const media = await downloadTikTokBuffer(targetUrl)

      if (!media || !media.buffer) {
        return reply('> ❌ 𝐓ʜᴇ ᴠɪᴅᴇᴏ ᴄᴏᴜʟᴅ ɴᴏᴛ ʙᴇ ʀᴇᴛʀɪᴇᴠᴇᴅ. 𝐂ʜᴇᴄᴋ ᴛʜᴇ ʟɪɴᴋ ᴀɴᴅ ᴛʀʏ ᴀɢᴀɪɴ.')
      }

      const caption = [
        '╭─❮ ❍ 𝐅ᴀʟʟᴇɴ 𝐗 𝐀ɴɢᴇʟs ❍ ❯',
        '│ 𖤐 𝐓ɪᴋ𝐓ᴏᴋ 𝐌ᴇᴅɪᴀ 𝐃ᴏᴡɴʟᴏᴀᴅᴇʀ',
        '│',
        `│ ✦ 𝐓ɪᴛʟᴇ: ${media.title.slice(0, 80)}${media.title.length > 80 ? '...' : ''}`,
        `│ ✦ 𝐀ᴜᴛʜᴏʀ: ${media.author}`,
        '│ ✦ 𝐐ᴜᴀʟɪᴛʏ: HD No Watermark',
        '╰┄┄┄┄┄┄┄┄┄┄┄⪼'
      ].join('\n')

      // ENVOI DU BUFFER DIRECT (ne plante pas contrairement à l'URL distante)
      await sock.sendMessage(jid, {
        video: media.buffer,
        caption,
        mimetype: 'video/mp4'
      }, { quoted: msg })

      try {
        await sock.sendMessage(jid, { react: { text: '🎬', key: msg.key } })
      } catch {}

    } catch (error) {
      if (logger && logger.warn) {
        logger.warn({ jid, err: error.message }, 'TikTok video download failed')
      }
      console.error('Erreur TikTok:', error)
      await reply('> ❌ 𝐀ɴ ᴇʀʀᴏʀ ᴏᴄᴄᴜʀʀᴇᴅ ᴡʜɪʟᴇ ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ ᴛʜᴇ 𝐓ɪᴋ𝐓ᴏᴋ ᴠɪᴅᴇᴏ.')
    }
  }
}