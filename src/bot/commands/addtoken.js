const config = require('../../config')
const logger = require('../../logger')
const { setEnvValue } = require('../../utils/env')

module.exports = {
  name: 'addtoken',
  desc: 'Add or replace the AI API key (owner only)',
  ownerOnly: true,
  async run({ args, jid, isOwner, reply }) {
    if (!isOwner) return reply('> ❌ 𝐎ɴʟʏ ᴛʜᴇ ʙᴏᴛ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ.')
    if (jid.endsWith('@g.us')) {
      return reply('> 🔒 𝐅ᴏʀ ʏᴏᴜʀ ᴋᴇʏ’s sᴇᴄᴜʀɪᴛʏ, ᴜsᴇ .addtoken ɪɴ ᴀ ᴘʀɪᴠᴀᴛᴇ ᴄʜᴀᴛ, ɴᴇᴠᴇʀ ɪɴ ᴀ ɢʀᴏᴜᴘ.')
    }

    const token = args.join('').trim()
    if (!token) return reply('> 𝐔ꜱᴀɢᴇ: .addtoken <ʏᴏᴜʀ ᴀᴘɪ ᴋᴇʏ>')
    if (token.length < 20 || token.length > 512 || /\s/.test(token)) {
      return reply('> ❌ 𝐈ɴᴠᴀʟɪᴅ ᴋᴇʏ. Sᴇɴᴅ ᴀ ᴄᴏᴍᴘʟᴇᴛᴇ ᴀᴘɪ ᴋᴇʏ ᴡɪᴛʜᴏᴜᴛ sᴘᴀᴄᴇs.')
    }

    try {
      await setEnvValue(config.envPath, 'ANTHROPIC_API_KEY', token)
      process.env.ANTHROPIC_API_KEY = token
      config.claudeApiKey = token
      return reply('> ✅ 𝐀ɪ ᴀᴘɪ ᴋᴇʏ sᴀᴠᴇᴅ ᴀɴᴅ ᴀᴄᴛɪᴠᴀᴛᴇᴅ. Tʜᴇ ᴋᴇʏ ɪs ɴᴏᴛ sʜᴏᴡɴ ɪɴ ᴛʜɪs ᴄᴏɴғɪʀᴍᴀᴛɪᴏɴ.')
    } catch (error) {
      logger.error({ jid, err: error.message }, 'failed to save the AI API key')
      return reply('> ❌ 𝐔ɴᴀʙʟᴇ ᴛᴏ sᴀᴠᴇ ᴛʜᴇ ᴋᴇʏ ɪɴ .env. Cʜᴇᴄᴋ ᴛʜᴇ ғɪʟᴇ ᴘᴇʀᴍɪssɪᴏɴs.')
    }
  },
}
