const logger = require('../../logger')

module.exports = {
  name: 'npm',
  desc: 'Show metadata for a package in the npm registry',
  async run({ args, reply }) {
    const packageName = args[0]?.trim()
    const packagePattern = /^(?:@[a-z\d._~-]+\/)?[a-z\d._~-]+$/i
    if (!packageName || packageName.length > 214 || !packagePattern.test(packageName)) {
      return reply('> ❌ 𝐔sᴀɢᴇ: .npm <ᴘᴀᴄᴋᴀɢᴇ_ɴᴀᴍᴇ>')
    }

    try {
      const endpoint = new URL(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`)
      const response = await fetch(endpoint, {
        headers: { accept: 'application/vnd.npm.install-v1+json' },
        signal: AbortSignal.timeout(15_000),
      })
      if (response.status === 404) return reply(`> ❌ 𝐍𝐏𝐌 ᴘᴀᴄᴋᴀɢᴇ *${packageName}* ɴᴏᴛ ғᴏᴜɴᴅ.`)
      if (!response.ok) throw new Error(`npm registry returned HTTP ${response.status}.`)

      const data = await response.json()
      const version = data['dist-tags']?.latest
      const latest = version ? data.versions?.[version] : null
      if (!latest) throw new Error('npm registry returned no latest stable package version.')

      const author = typeof latest.author === 'string'
        ? latest.author
        : latest.author?.name || latest.maintainers?.[0]?.name || 'Unknown'
      const clean = (value, limit) => String(value || 'Not specified')
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, limit)
      const text = [
        '╭─❮ ❍ 𝐅ᴀʟʟᴇɴ 𝐗 𝐀ɴɢᴇʟs ❍ ❯',
        '│ 𖤐 𝐍𝐏𝐌 𝐏ᴀᴄᴋᴀɢᴇ 𝐑ᴀᴅᴀʀ',
        '│',
        `│ ✦ 𝐏ᴀᴄᴋᴀɢᴇ: ${clean(data.name || packageName, 100)}`,
        `│ ✦ 𝐕ᴇʀsɪᴏɴ: ${clean(version, 50)}`,
        `│ ✦ 𝐃ᴇsᴄʀɪᴘᴛɪᴏɴ: ${clean(latest.description, 350)}`,
        `│ ✦ 𝐋ɪᴄᴇɴsᴇ: ${clean(latest.license, 80)}`,
        `│ ✦ 𝐀ᴜᴛʜᴏʀ: ${clean(author, 100)}`,
        `│ ✦ 𝐈ɴsᴛᴀʟʟ: npm i ${packageName}`,
        '╰┄┄┄┄┄┄┄┄┄┄┄⪼',
      ].join('\n')
      return await reply(text)
    } catch (error) {
      logger.warn({ packageName, err: error.message }, 'npm package lookup failed')
      return await reply('> ❌ 𝐅ᴀɪʟᴇᴅ ᴛᴏ ʟᴏᴏᴋ ᴜᴘ 𝐍𝐏𝐌 ᴘᴀᴄᴋᴀɢᴇ.')
    }
  },
}
