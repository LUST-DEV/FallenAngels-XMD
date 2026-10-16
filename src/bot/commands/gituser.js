const logger = require('../../logger')

const GITHUB_API = 'https://api.github.com/users/'

module.exports = {
  name: 'gituser',
  aliases: ['github', 'git'],
  desc: 'Show a GitHub developer profile',
  async run({ sock, msg, jid, args, reply }) {
    const username = args[0]?.trim()
    if (!username || !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) {
      return reply('> ❌ 𝐔sᴀɢᴇ: .gituser <ɢɪᴛʜᴜʙ_ᴜsᴇʀɴᴀᴍᴇ>')
    }

    try {
      const response = await fetch(`${GITHUB_API}${encodeURIComponent(username)}`, {
        headers: {
          accept: 'application/vnd.github+json',
          'user-agent': 'Fallen-Angels-XMD',
        },
        signal: AbortSignal.timeout(15_000),
      })

      if (response.status === 404) {
        return reply(`> ❌ 𝐔sᴇʀ *${username}* ɴᴏᴛ ғᴏᴜɴᴅ ᴏɴ 𝐆ɪᴛ𝐇ᴜʙ.`)
      }
      if (!response.ok) {
        throw new Error(`GitHub API returned HTTP ${response.status}.`)
      }

      const user = await response.json()
      if (typeof user.login !== 'string' || typeof user.avatar_url !== 'string') {
        throw new Error('GitHub API returned an invalid profile.')
      }

      const avatarUrl = new URL(user.avatar_url)
      if (avatarUrl.protocol !== 'https:' || avatarUrl.hostname !== 'avatars.githubusercontent.com') {
        throw new Error('GitHub API returned an unsupported avatar URL.')
      }

      const createdAt = typeof user.created_at === 'string'
        ? user.created_at.split('T')[0]
        : 'Unknown'
      const caption = [
        '╭─❮ ❍ 𝐅ᴀʟʟᴇɴ 𝐗 𝐀ɴɢᴇʟs ❍ ❯',
        '│ 𖤐 𝐆ɪᴛ𝐇ᴜʙ 𝐈ɴᴛᴇʟʟɪɢᴇɴᴄᴇ',
        '│',
        `│ ✦ 𝐔sᴇʀ: ${user.login}`,
        `│ ✦ 𝐍ᴀᴍᴇ: ${user.name || 'None'}`,
        `│ ✦ 𝐁ɪᴏ: ${user.bio || 'No bio available'}`,
        `│ ✦ 𝐑ᴇᴘᴏs: ${Number.isInteger(user.public_repos) ? user.public_repos : 0}`,
        `│ ✦ 𝐅ᴏʟʟᴏᴡᴇʀs: ${Number.isInteger(user.followers) ? user.followers : 0} | 𝐅ᴏʟʟᴏᴡɪɴɢ: ${Number.isInteger(user.following) ? user.following : 0}`,
        `│ ✦ 𝐂ᴏᴍᴘᴀɴʏ: ${user.company || 'Independent'}`,
        `│ ✦ 𝐂ʀᴇᴀᴛᴇᴅ: ${createdAt}`,
        '╰┄┄┄┄┄┄┄┄┄┄┄⪼',
      ].join('\n')

      await sock.sendMessage(jid, {
        image: { url: avatarUrl.toString() },
        caption,
      }, { quoted: msg })
    } catch (error) {
      logger.warn({ jid, username, err: error.message }, 'GitHub profile lookup failed')
      await reply('> ❌ 𝐅ᴀɪʟᴇᴅ ᴛᴏ ғᴇᴛᴄʜ 𝐆ɪᴛ𝐇ᴜʙ ɪɴғᴏ.')
    }
  },
}
