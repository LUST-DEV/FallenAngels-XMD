const { spawn } = require('node:child_process')
const ffmpegPath = require('ffmpeg-static')
const { normalizeMessageContent } = require('@whiskeysockets/baileys')
const { downloadQuotedMedia } = require('./sticker')

const MAX_OUTPUT_BYTES = 16 * 1024 * 1024

function getQuotedAudio(msg) {
  const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
  const quotedContent = quotedMessage ? normalizeMessageContent(quotedMessage) : null
  return quotedContent?.audioMessage || null
}

function convertAudio(input, filter) {
  if (!ffmpegPath) throw new Error('FFmpeg is not available on this system.')

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, [
      '-hide_banner',
      '-loglevel', 'error',
      '-i', 'pipe:0',
      '-vn',
      '-af', filter,
      '-ac', '2',
      '-codec:a', 'libmp3lame',
      '-b:a', '192k',
      '-f', 'mp3',
      'pipe:1',
    ], { stdio: ['pipe', 'pipe', 'pipe'] })

    const chunks = []
    const errors = []
    let outputBytes = 0
    let settled = false

    const timeout = setTimeout(() => {
      ffmpeg.kill()
      if (!settled) {
        settled = true
        reject(new Error('Audio conversion timed out after 60 seconds.'))
      }
    }, 60_000)

    const fail = (error) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      ffmpeg.kill()
      reject(error)
    }

    ffmpeg.stdout.on('data', (chunk) => {
      outputBytes += chunk.length
      if (outputBytes > MAX_OUTPUT_BYTES) {
        fail(new Error('Converted audio exceeds the 16 MB limit.'))
        return
      }
      chunks.push(chunk)
    })
    ffmpeg.stderr.on('data', (chunk) => errors.push(chunk))
    ffmpeg.on('error', (error) => fail(error))
    ffmpeg.on('close', (code) => {
      clearTimeout(timeout)
      if (settled) return
      settled = true
      if (code !== 0) {
        reject(new Error(`Audio conversion failed: ${Buffer.concat(errors).toString('utf8').trim()}`))
      } else if (chunks.length === 0) {
        reject(new Error('Audio conversion produced an empty file.'))
      } else {
        resolve(Buffer.concat(chunks))
      }
    })
    ffmpeg.stdin.on('error', (error) => {
      if (error.code !== 'EPIPE') fail(error)
    })
    ffmpeg.stdin.end(input)
  })
}

async function applyAudioEffect(msg, filter) {
  const audioMessage = getQuotedAudio(msg)
  if (!audioMessage) throw new Error('No quoted audio file was found.')

  const input = await downloadQuotedMedia(audioMessage, 'audio')
  return convertAudio(input, filter)
}

module.exports = { applyAudioEffect }
