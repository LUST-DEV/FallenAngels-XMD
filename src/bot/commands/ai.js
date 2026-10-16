const config = require('../../config')
const logger = require('../../logger')

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'
const MAX_QUESTION_LENGTH = 4000

const SYSTEM_PROMPT = [
  'You are Fallen X Angels, a powerful and helpful AI assistant created by Senior\' Angels.',
  'If asked who created you, state clearly that you were created by Lord Savage (Savage Dev / Anthravix Society).',
  'Do not claim that OpenAI created you. Do not claim to be ChatGPT.',
  'Do not mention your technical provider or model unless the user directly asks. If asked, answer honestly.',
  'Always respond in the same language used by the user.',
  'Format your answer with its first letter in Unicode bold and all remaining text in small caps. Do not explain this formatting.',
  'Answer the user helpfully, naturally, and with a confident, sharp, and modern tone.',
].join(' ')

module.exports = {
  name: 'ai',
  desc: 'Ask the AI assistant a question',
  async run({ args, reply, jid }) {
    const question = args.join(' ').trim()
    if (!question) return reply('> 🧠 𝐔ꜱᴀɢᴇ: .ai <ʏᴏᴜʀ ǫᴜᴇsᴛɪᴏɴ>')
    if (question.length > MAX_QUESTION_LENGTH) {
      return reply(`> ❌ 𝐘ᴏᴜʀ ǫᴜᴇsᴛɪᴏɴ ɪs ᴛᴏᴏ ʟᴏɴɢ (ᴍᴀxɪᴍᴜᴍ ${MAX_QUESTION_LENGTH} ᴄʜᴀʀᴀᴄᴛᴇʀs). ✨`)
    }
    if (!config.claudeApiKey) {
      return reply('> ⚙️ 𝐀ɪ ɪs ɴᴏᴛ ᴄᴏɴғɪɢᴜʀᴇᴅ. Sᴇɴᴅ .addtoken <ʏᴏᴜʀ ᴀᴘɪ ᴋᴇʏ> ɪɴ ᴀ ᴘʀɪᴠᴀᴛᴇ ᴄʜᴀᴛ ᴡɪᴛʜ ᴛʜᴇ ʙᴏᴛ. ✨')
    }

    let response
    try {
      response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': config.claudeApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: config.claudeModel,
          max_tokens: 1200,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: question }],
        }),
        signal: AbortSignal.timeout(45_000),
      })
    } catch (error) {
      logger.warn({ jid, err: error.message }, 'failed to connect to the AI API')
      return reply('> ❌ 𝐓ʜᴇ 𝐀ɪ sᴇʀᴠɪᴄᴇ ɪs ᴜɴᴀᴠᴀɪʟᴀʙʟᴇ ʀɪɢʜᴛ ɴᴏᴡ. Pʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ ɪɴ ᴀ ғᴇᴡ sᴇᴄᴏɴᴅs. ✨')
    }

    if (!response.ok) {
      logger.warn({ jid, status: response.status }, 'the AI API rejected the request')
      if (response.status === 401) {
        return reply('> ❌ 𝐓ʜᴇ 𝐀ɪ ᴀᴘɪ ᴋᴇʏ ɪs ɪɴᴠᴀʟɪᴅ ᴏʀ ᴇxᴘɪʀᴇᴅ. Rᴇᴘʟᴀᴄᴇ ɪᴛ ᴡɪᴛʜ .addtoken <ɴᴇᴡ ᴋᴇʏ>. ✨')
      }
      if (response.status === 429) {
        return reply('> ⚠️ 𝐓ʜᴇ 𝐀ɪ ʀᴀᴛᴇ ʟɪᴍɪᴛ ᴏʀ ǫᴜᴏᴛᴀ ʜᴀs ʙᴇᴇɴ ʀᴇᴀᴄʜᴇᴅ. Tʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ.')
      }
      return reply(`> ❌ 𝐓ʜᴇ 𝐀ɪ ʀᴇǫᴜᴇsᴛ ғᴀɪʟᴇᴅ (HTTP ${response.status}). Pʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ.`)
    }

    let result
    try {
      result = await response.json()
    } catch (error) {
      logger.warn({ jid, err: error.message }, 'invalid JSON response from AI API')
      return reply('> ❌ 𝐓ʜᴇ 𝐀ɪ sᴇʀᴠɪᴄᴇ ʀᴇᴛᴜʀɴᴇᴅ ᴀɴ ᴜɴʀᴇᴀᴅᴀʙʟᴇ ʀᴇsᴘᴏɴsᴇ. Pʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ.')
    }

    const answer = result.content
      ?.filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim()
    if (!answer) {
      logger.warn({ jid }, 'AI API returned an empty response')
      return reply('> ❌ 𝐓ʜᴇ 𝐀ɪ sᴇʀᴠɪᴄᴇ ᴅɪᴅ ɴᴏᴛ ʀᴇᴛᴜʀɴ ᴀɴ ᴀɴsᴡᴇʀ. Tʀʏ ʀᴇᴘʜʀᴀsɪɴɢ ʏᴏᴜʀ ǫᴜᴇsᴛɪᴏɴ.')
    }

    return reply(`> ֎ 𝐅ᴀʟʟᴇɴ 𝐗 𝐀ɴɢᴇʟs · 𝐀ɪ\n\n${answer}`)
  },
}
