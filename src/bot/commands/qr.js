const logger = require('../../logger')

const MAX_QR_BYTES = 2 * 1024 * 1024

async function readQrImage(response) {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.toLowerCase().startsWith('image/png')) {
    throw new Error(`QR service returned an unexpected content type: ${contentType || 'unknown'}.`)
  }

  const declaredLength = Number(response.headers.get('content-length') || 0)
  if (declaredLength > MAX_QR_BYTES) throw new Error('QR image exceeds the 2 MB limit.')
  if (!response.body) throw new Error('QR service returned an empty response.')

  const chunks = []
  let totalBytes = 0
  for await (const chunk of response.body) {
    totalBytes += chunk.length
    if (totalBytes > MAX_QR_BYTES) {
      await response.body.cancel()
      throw new Error('QR image exceeds the 2 MB limit.')
    }
    chunks.push(chunk)
  }

  const image = Buffer.concat(chunks)
  if (image.length < 8 || !image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    throw new Error('QR service did not return a valid PNG image.')
  }
  return image
}

module.exports = {
  name: 'qr',
  desc: 'Generate a QR code image from text or a link',
  async run({ sock, jid, msg, args, reply }) {
    const text = args.join(' ').trim()
    if (!text || text.length > 1500) {
      return reply('> ❌ 𝐔sᴀɢᴇ: .qr <ᴛᴇxᴛ ᴏʀ ʟɪɴᴋ> (ᴍᴀx 𝟣𝟧𝟢𝟢 ᴄʜᴀʀᴀᴄᴛᴇʀs)')
    }

    try {
      const endpoint = new URL('https://api.qrserver.com/v1/create-qr-code/')
      endpoint.searchParams.set('size', '512x512')
      endpoint.searchParams.set('format', 'png')
      endpoint.searchParams.set('data', text)
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(20_000) })
      if (!response.ok) throw new Error(`QR service returned HTTP ${response.status}.`)

      const image = await readQrImage(response)
      return await sock.sendMessage(jid, {
        image,
        caption: '𖤐 𝐐𝐑 𝐂ᴏᴅᴇ 𝐆ᴇɴᴇʀᴀᴛᴇᴅ',
      }, { quoted: msg })
    } catch (error) {
      logger.warn({ jid, err: error.message }, 'QR code generation failed')
      return await reply('> ❌ 𝐅ᴀɪʟᴇᴅ ᴛᴏ ɢᴇɴᴇʀᴀᴛᴇ 𝐐𝐑 ᴄᴏᴅᴇ.')
    }
  },
}
