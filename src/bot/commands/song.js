const yts = require('yt-search')
const logger = require('../../logger')

function formatDuration(value) {
  if (!value || Number.isNaN(Number(value))) return 'Unknown'
  const totalSeconds = Math.floor(Number(value))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

async function fetchSongBuffer(videoUrl) {
  const candidates = [
    {
      name: 'Cobalt',
      getter: async () => {
        const response = await fetch('https://cobalt.api.scip.dev/', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: videoUrl,
            downloadMode: 'audio',
            audioFormat: 'mp3',
          }),
        })

        if (!response.ok) throw new Error(`Cobalt failed with ${response.status}`)

        const data = await response.json()
        if (!data?.url) throw new Error('Cobalt returned no download URL')

        const audioResponse = await fetch(data.url)
        if (!audioResponse.ok) throw new Error(`Cobalt download failed with ${audioResponse.status}`)
        return Buffer.from(await audioResponse.arrayBuffer())
      },
    },
    {
      name: 'Vreden',
      getter: async () => {
        const response = await fetch(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(videoUrl)}`)
        if (!response.ok) throw new Error(`Vreden failed with ${response.status}`)

        const data = await response.json()
        const downloadUrl = data?.result?.download?.url || data?.result?.url
        if (!downloadUrl) throw new Error('Vreden returned no download URL')

        const audioResponse = await fetch(downloadUrl)
        if (!audioResponse.ok) throw new Error(`Vreden download failed with ${audioResponse.status}`)
        return Buffer.from(await audioResponse.arrayBuffer())
      },
    },
    {
      name: 'Dreaded',
      getter: async () => {
        const response = await fetch(`https://api.dreaded.site/api/ytdl/video?url=${encodeURIComponent(videoUrl)}`)
        if (!response.ok) throw new Error(`Dreaded failed with ${response.status}`)

        const data = await response.json()
        const downloadUrl = data?.result?.downloadUrl || data?.result?.audio
        if (!downloadUrl) throw new Error('Dreaded returned no download URL')

        const audioResponse = await fetch(downloadUrl)
        if (!audioResponse.ok) throw new Error(`Dreaded download failed with ${audioResponse.status}`)
        return Buffer.from(await audioResponse.arrayBuffer())
      },
    },
  ]

  for (const candidate of candidates) {
    try {
      return await candidate.getter()
    } catch (error) {
      logger.debug({ videoUrl, source: candidate.name, err: error.message }, 'song source failed')
    }
  }

  return null
}

module.exports = {
  name: 'song',
  aliases: ['play', 'music', 'ytmp3', 'downloadsong'],
  desc: 'Download a YouTube song with metadata, cover image, and audio',
  async run({ sock, msg, jid, args, reply }) {
    const query = args.join(' ').trim()
    if (!query) {
      return reply('> ❌ 𝐔sᴀɢᴇ: .song <song name or YouTube link>')
    }

    try {
      let videoUrl = query
      let videoInfo = null

      if (query.includes('youtube.com') || query.includes('youtu.be')) {
        const videoId = query.split('v=')[1]?.split('&')[0] || query.split('/').pop()
        const result = await yts({ videoId })
        videoInfo = result || null
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
      const artist = videoInfo?.author?.name || videoInfo?.channel || 'Unknown Artist'
      const duration = formatDuration(videoInfo?.seconds || videoInfo?.duration?.seconds)
      const thumbnail = videoInfo?.thumbnail || videoInfo?.image

      try {
        await sock.sendMessage(jid, { react: { text: '🎶', key: msg.key } })
      } catch (error) {
        logger.debug({ jid, err: error.message }, 'unable to react to song command')
      }

      const audioBuffer = await fetchSongBuffer(videoUrl)
      if (!audioBuffer) {
        return reply('> ❌ 𝐅ᴀɪʟᴇᴅ ᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ ᴛʜᴇ sᴏɴɢ. 𝐏ʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ.')
      }

      const caption = [
        '╭─❮ 𓆩 𝐒ᴏɴɢ 𝐃ᴇᴛᴀɪʟs 𓆪 ❯',
        `│ ✦ 𝐓ɪᴛʟᴇ: ${title}`,
        `│ ♬ 𝐀ʀᴛɪsᴛ: ${artist}`,
        `│ ⏱️ 𝐃ᴜʀᴀᴛɪᴏɴ: ${duration}`,
        `│ ⸸ 𝐋ɪɴᴋ: ${videoUrl}`,
        '╰───────────────────────',
      ].join('\n')

      if (thumbnail) {
        await sock.sendMessage(jid, {
          image: { url: thumbnail },
          caption,
        }, { quoted: msg })
      } else {
        await reply(caption)
      }

      await sock.sendMessage(jid, {
        audio: audioBuffer,
        mimetype: 'audio/mpeg',
        ptt: false,
        contextInfo: {
          externalAdReply: {
            title,
            body: artist,
            mediaType: 1,
            sourceUrl: videoUrl,
            thumbnailUrl: thumbnail,
          },
        },
      }, { quoted: msg })
    } catch (error) {
      logger.error({ jid, query, err: error.message }, 'song command failed')
      return reply(`> ❌ 𝐀ᴜᴅɪᴏ ᴅᴏᴡɴʟᴏᴀᴅ ғᴀɪʟᴇᴅ: ${error.message.slice(0, 100)}`)
    }
  },
}
