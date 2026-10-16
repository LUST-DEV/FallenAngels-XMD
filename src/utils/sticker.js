const { spawn } = require('child_process')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const ffmpegPath = require('ffmpeg-static')
const sharp = require('sharp')

const MAX_MEDIA_BYTES = 16 * 1024 * 1024
const MAX_STATIC_STICKER_BYTES = 100 * 1024
const MAX_STICKER_BYTES = 500 * 1024

async function downloadQuotedMedia(message, type) {
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys')
  const stream = await downloadContentFromMessage(message, type)
  const chunks = []
  let totalBytes = 0

  for await (const chunk of stream) {
    totalBytes += chunk.length
    if (totalBytes > MAX_MEDIA_BYTES) {
      throw new Error('Media exceeds the 16 MB download limit.')
    }
    chunks.push(chunk)
  }

  if (totalBytes === 0) throw new Error('The quoted media is empty.')
  return Buffer.concat(chunks)
}

async function imageToSticker(buffer) {
  const image = sharp(buffer, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })

  for (const quality of [80, 65, 50, 35]) {
    const sticker = await image.clone().webp({ quality, effort: 6 }).toBuffer()
    if (sticker.length <= MAX_STATIC_STICKER_BYTES) return sticker
  }
  throw new Error('Image cannot be compressed below WhatsApp’s 100 KB static sticker limit.')
}

async function videoToSticker(buffer) {
  if (!ffmpegPath) throw new Error('FFmpeg is not available on this system.')

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fallen-video-sticker-'))
  const inputPath = path.join(workDir, 'input.mp4')
  const outputPath = path.join(workDir, 'sticker.webp')

  try {
    await fs.writeFile(inputPath, buffer)
    const errors = []
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn(ffmpegPath, [
        '-hide_banner',
        '-loglevel', 'error',
        '-y',
        '-i', inputPath,
        '-vf', 'fps=12,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
        '-t', '3',
        '-loop', '0',
        '-an',
        '-c:v', 'libwebp_anim',
        '-quality', '55',
        '-compression_level', '6',
        '-f', 'webp',
        outputPath,
      ], { stdio: ['ignore', 'ignore', 'pipe'] })

      let timedOut = false
      const timeout = setTimeout(() => {
        timedOut = true
        ffmpeg.kill()
      }, 30_000)

      ffmpeg.stderr.on('data', (chunk) => errors.push(chunk))
      ffmpeg.on('error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })
      ffmpeg.on('close', (code) => {
        clearTimeout(timeout)
        if (timedOut) {
          reject(new Error('Video conversion timed out after 30 seconds.'))
        } else if (code !== 0) {
          reject(new Error(`Video conversion failed: ${Buffer.concat(errors).toString('utf8').trim()}`))
        } else {
          resolve()
        }
      })
    })

    const sticker = await fs.readFile(outputPath)
    if (sticker.length === 0) throw new Error('Video conversion produced an empty sticker.')
    if (sticker.length > MAX_STICKER_BYTES) {
      throw new Error('Converted sticker exceeds WhatsApp’s 500 KB limit.')
    }
    return sticker
  } finally {
    await fs.rm(workDir, { recursive: true, force: true })
  }
}

async function stickerToImage(buffer) {
  if (!ffmpegPath) {
    // Fallback to sharp for static webp if ffmpeg is not available
    try {
      return await sharp(buffer, { limitInputPixels: 40_000_000 }).png().toBuffer()
    } catch (err) {
      throw new Error('FFmpeg not available and sharp failed to decode the sticker.')
    }
  }

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, [
      '-hide_banner',
      '-loglevel', 'error',
      '-i', 'pipe:0',
      '-frames:v', '1',
      '-f', 'image2pipe',
      '-vcodec', 'png',
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
        reject(new Error('Image extraction timed out after 15 seconds.'))
      }
    }, 15_000)

    ffmpeg.stdout.on('data', (chunk) => {
      outputBytes += chunk.length
      chunks.push(chunk)
    })
    ffmpeg.stderr.on('data', (chunk) => errors.push(chunk))
    ffmpeg.on('error', (error) => {
      if (!settled) {
        settled = true
        clearTimeout(timeout)
        reject(error)
      }
    })
    ffmpeg.on('close', (code) => {
      clearTimeout(timeout)
      if (settled) return
      settled = true
      if (code !== 0) {
        reject(new Error(`Image extraction failed: ${Buffer.concat(errors).toString('utf8').trim()}`))
      } else if (chunks.length === 0) {
        reject(new Error('Image extraction produced no output.'))
      } else {
        resolve(Buffer.concat(chunks))
      }
    })

    ffmpeg.stdin.on('error', (error) => {
      if (error.code !== 'EPIPE' && !settled) {
        settled = true
        clearTimeout(timeout)
        reject(error)
      }
    })
    ffmpeg.stdin.end(buffer)
  })
}

async function stickerToVideo(buffer) {
  if (!ffmpegPath) throw new Error('FFmpeg is not available on this system.')

  const metadata = await sharp(buffer, {
    animated: true,
    limitInputPixels: 40_000_000,
  }).metadata()
  const pageCount = Math.min(metadata.pages || 1, 36)
  const pageHeight = metadata.pageHeight || Math.floor(metadata.height / pageCount)
  if (!metadata.width || !pageHeight) {
    throw new Error('The quoted sticker does not contain readable animation frames.')
  }

  const frames = await sharp(buffer, {
    animated: true,
    pages: pageCount,
    limitInputPixels: 40_000_000,
  })
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const frameHeight = Math.floor(frames.info.height / pageCount)
  if (!frames.info.width || !frameHeight || frames.info.channels !== 4) {
    throw new Error('Could not decode the sticker animation frames.')
  }

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fallen-sticker-video-'))
  const outputPath = path.join(workDir, 'sticker.mp4')

  try {
    const errors = []
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn(ffmpegPath, [
        '-hide_banner',
        '-loglevel', 'error',
        '-y',
        '-f', 'rawvideo',
        '-pixel_format', 'rgba',
        '-video_size', `${frames.info.width}x${frameHeight}`,
        '-framerate', '12',
        '-i', 'pipe:0',
        '-t', '3',
        '-pix_fmt', 'yuv420p',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '23',
        '-an',
        '-movflags', '+faststart',
        outputPath,
      ], { stdio: ['pipe', 'ignore', 'pipe'] })

      let timedOut = false
      const timeout = setTimeout(() => {
        timedOut = true
        ffmpeg.kill()
      }, 30_000)

      ffmpeg.stderr.on('data', (chunk) => errors.push(chunk))
      ffmpeg.on('error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })
      ffmpeg.on('close', (code) => {
        clearTimeout(timeout)
        if (timedOut) {
          reject(new Error('Video conversion timed out after 30 seconds.'))
        } else if (code !== 0) {
          reject(new Error(`Video conversion failed: ${Buffer.concat(errors).toString('utf8').trim()}`))
        } else {
          resolve()
        }
      })
      ffmpeg.stdin.on('error', (error) => {
        if (error.code !== 'EPIPE') {
          clearTimeout(timeout)
          ffmpeg.kill()
          reject(error)
        }
      })
      ffmpeg.stdin.end(frames.data)
    })

    const output = await fs.readFile(outputPath)
    if (output.length === 0) throw new Error('Video conversion produced an empty file.')
    if (output.length > MAX_MEDIA_BYTES) throw new Error('Converted video exceeds 16 MB limit.')
    return output
  } finally {
    await fs.rm(workDir, { recursive: true, force: true })
  }
}

module.exports = { downloadQuotedMedia, imageToSticker, videoToSticker, stickerToImage, stickerToVideo }
