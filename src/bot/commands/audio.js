const yts = require('yt-search')
const logger = require('../../logger')

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return 'Unknown'
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return hrs
    ? `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${mins}:${String(secs).padStart(2, '0')}`
}

async function fetchAudioBuffer(youtubeUrl) {
  // 1. Premier essai : API Cobalt (Ultra rapide & HD)
  try {
    const res = await fetch('https://cobalt.api.scip.dev/', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: youtubeUrl,
        downloadMode: 'audio',
        audioFormat: 'mp3'
      })
    })
    const data = await res.json()
    if (data && data.url) {
      const audioRes = await fetch(data.url)
      if (audioRes.ok) return Buffer.from(await audioRes.arrayBuffer())
    }
  } catch (e) {
    console.log('Cobalt primary API failed, trying fallback 1...')
  }

  // 2. Deuxième essai : API Vreden YTmp3
  try {
    const res = await fetch(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(youtubeUrl)}`)
    if (res.ok) {
      const data = await res.json()
      const downloadUrl = data?.result?.download?.url || data?.result?.url
      if (downloadUrl) {
        const audioRes = await fetch(downloadUrl)
        if (audioRes.ok) return Buffer.from(await audioRes.arrayBuffer())
      }
    }
  } catch (e) {
    console.log('Fallback 1 failed, trying fallback 2...')
  }

  // 3. Troisième essai : API SaveTube
  try {
    const res = await fetch(`https://api.dreaded.site/api/ytdl/video?url=${encodeURIComponent(youtubeUrl)}`)
    if (res.ok) {
      const data = await res.json()
      const downloadUrl = data?.result?.downloadUrl || data?.result?.audio
      if (downloadUrl) {
        const audioRes = await fetch(downloadUrl)
        if (audioRes.ok) return Buffer.from(await audioRes.arrayBuffer())
      }
    }
  } catch (e) {
    console.log('Fallback 2 failed.')
  }

  return null
}

module.exports = {
  name: 'audio',
  desc: 'Download audio from YouTube with high velocity',
  async run({ sock, msg, jid, args, reply }) {
    const query = args.join(' ').trim()
    if (!query) {
      return reply('> ❌ 𝐔sᴀɢᴇ: .audio <song name or YouTube link>')
    }

    try {
      let videoUrl = query
      let videoInfo = null

      // Détection : Lien direct ou Recherche textuelle
      if (query.includes('youtube.com') || query.includes('youtu.be')) {
        const search = await yts({ videoId: query.split('v=')[1]?.split('&')[0] || query.split('/').pop() })
        videoInfo = search
        videoUrl = query
      } else {
        const search = await yts(query)
        if (!search || !search.videos || search.videos.length === 0) {
          return reply('> ❌ 𝐍ᴏ ʀᴇsᴜʟᴛs ғᴏᴜɴᴅ.')
        }
        videoInfo = search.videos[0]
        videoUrl = videoInfo.url
      }

      const title = videoInfo?.title || 'Unknown Title'
      const duration = formatDuration(videoInfo?.seconds || videoInfo?.duration?.seconds)
      const author = videoInfo?.author?.name || videoInfo?.channel || 'Unknown Artist'
      const thumbnail = videoInfo?.thumbnail || videoInfo?.image

      // Réaction visuelle immédiate
      try {
        await sock.sendMessage(jid, { react: { text: '🎧', key: msg.key } })
      } catch (e) {}

      // Téléchargement du buffer audio
      const audioBuffer = await fetchAudioBuffer(videoUrl)

      if (!audioBuffer) {
        return reply('> ❌ 𝐅ᴀɪʟᴇᴅ ᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ ᴀᴜᴅɪᴏ. 𝐏ʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ.')
      }

      const caption = [
        '╭┈⊷┈⊷┈⊷┈⊷┈⊷┈⊷╮',
        '┃ ♫ 𝐀ᴜᴅɪᴏ 𝙳𝚘𝚠𝚗𝚕𝚘𝚊𝚍𝚎𝚛',
        '┃',
        `┃ ✦ 𝐓ɪᴛʟᴇ: ${title}`,
        `┃ ⏱️ 𝐃ᴜʀᴀᴛɪᴏɴ: ${duration}`,
        `┃ ♧ 𝐂ʜᴀɴɴᴇʟ: ${author}`,
        '╰┈⊷┈⊷┈⊷┈⊷┈⊷┈⊷╯',
      ].join('\n')

      const targetJid = jid || msg.key.remoteJid

      // 1. Envoi de la miniature avec le résumé
      if (thumbnail) {
        await sock.sendMessage(targetJid, {
          image: { url: thumbnail },
          caption: caption
        }, { quoted: msg })
      } else {
        await reply(caption)
      }

      // 2. Envoi du fichier Audio MP3
      await sock.sendMessage(targetJid, {
        audio: audioBuffer,
        mimetype: 'audio/mpeg',
        ptt: false,
        contextInfo: {
          externalAdReply: {
            title: title,
            body: author,
            mediaType: 1,
            sourceUrl: videoUrl,
            thumbnailUrl: thumbnail
          }
        }
      }, { quoted: msg })

    } catch (error) {
      if (logger && logger.error) {
        logger.error({ jid, query, err: error.message }, 'Audio download error')
      }
      return reply(`> ❌ 𝐀ᴜᴅɪᴏ ᴅᴏᴡɴʟᴏᴀᴅ ғᴀɪʟᴇᴅ: ${error.message.slice(0, 100)}`)
    }
  }
}