const fs = require('node:fs')
const path = require('node:path')
const config = require('../../config')
const { User } = require('../../database')

const groupCommands = new Set([
  'accept', 'acceptall', 'add', 'admins', 'antilink', 'autoaccept', 'close',
  'demote', 'goodbye', 'groupinfo', 'grouplink', 'hidetag', 'kick', 'kickall', 'open',
  'poll', 'promote', 'reject', 'rejectall', 'resetwarn', 'rules', 'setdesc',
  'setgoodbye', 'setname', 'setrules', 'setwelcome', 'slowmode', 'tagadmin',
  'tagall', 'warn', 'warnings', 'welcome',
])

const funCommands = new Set(['8ball', 'animequote', 'fact', 'joke', 'profile', 'quote', 'ship'])
const ownerMenuCommands = new Set(['leave', 'slowmode'])
const mediaCommands = new Set(['8d', 'audio', 'nightcore', 'removebg', 'reverse', 'slowed', 'song', 'speedup', 'wallpaper'])
const otherCommands = new Set([
  'about', 'afk', 'alive', 'anime', 'bin', 'calc', 'checkmail', 'country', 'crypto', 'devinfo',
  'cross', 'dns', 'getpp', 'gituser', 'id', 'lyrics', 'npm', 'ping', 'qr', 'runtime',
  'shorten', 'stickers', 'techfact', 'tempmail', 'tiktok', 'translate', 'uptime',
  'weather', 'wiki', 'toimg', 'tovideo'
])
const quickCommands = [
  'ping', 'about', 'runtime', 'groupinfo', 'admins', 'tagall', 'welcome', 'tiktok',
]

const menuCategories = {
  group: { title: '𝗚ʀᴏᴜᴘ', commandNames: groupCommands },
  owner: { title: '𝗢ᴡɴᴇʀ', commandNames: ownerMenuCommands, ownerOnly: true },
  ai: { title: '𝗔ɪ', commandNames: new Set(['ai']) },
  fun: { title: '𝗙ᴜɴ', commandNames: funCommands },
  media: { title: '𝗠ᴇᴅɪᴀ', commandNames: mediaCommands },
  others: { title: '𝗢ᴛʜᴇʀs' },
}

function uniqueCommands(commands) {
  return [...new Set(commands.values())]
}

function getCategoryCommands(categoryKey, commands, isOwner) {
  const allCommands = uniqueCommands(commands)
  const category = menuCategories[categoryKey]
  let entries

  if (categoryKey === 'others') {
    const categorizedNames = new Set([
      ...groupCommands,
      ...funCommands,
      ...ownerMenuCommands,
      ...mediaCommands,
      'ai',
      'menu',
    ])
    entries = allCommands.filter((command) => (
      !command.ownerOnly &&
      (otherCommands.has(command.name) || !categorizedNames.has(command.name))
    ))
  } else if (categoryKey === 'owner') {
    entries = allCommands.filter((command) => command.ownerOnly || category.commandNames.has(command.name))
  } else {
    entries = allCommands.filter((command) => category.commandNames.has(command.name))
  }

  return entries
    .filter((command) => isOwner || !command.ownerOnly)
    .sort((left, right) => left.name.localeCompare(right.name))
}

function formatMenuUptime() {
  const totalSeconds = Math.floor(process.uptime())
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const parts = []

  if (days) parts.push(`${days}ᴅ`)
  if (hours || days) parts.push(`${hours}ʜ`)
  parts.push(`${minutes}ᴍ`)
  return parts.join(', ')
}

async function menuText({ categoryKey, commands, prefix, msg, numero, isOwner }) {
  const user = await User.findByPk(numero, { attributes: ['botMode'] })
  const commandCount = uniqueCommands(commands).filter((command) => isOwner || !command.ownerOnly).length
  const lines = [
    '╭─❮ 𓆩 𝗙ᴀʟʟᴇɴ 𝗫 𝗔ɴɢᴇʟs 𓆪 ❯',
    '│ 𓆩 `𝗢ᴡɴᴇʀ`    ➪ 𝗙ᴀʟʟᴇɴ x 𝗔ɴɢᴇʟ',
    `│ ⸸ \`𝗣ʀᴇғɪx\`   ➪ [ ${prefix} ]`,
    `│ 🝐 \`𝗠ᴏᴅᴇ\`     ➪ ${user?.botMode === 'private' ? '𝗣ʀɪᴠᴀᴛᴇ' : '𝗣ᴜʙʟɪᴄ'}`,
    `│ ⸸ \`𝗨ᴘᴛɪᴍᴇ\`   ➪ ${formatMenuUptime()}`,
    `│ 🝐 \`𝗖ᴏᴍᴍᴀɴᴅs\` ➪ ${commandCount}`,
    `│ 𓆩 \`𝗨sᴇʀ\`     ➪ 『 ${msg.pushName || 'Unknown'} 』`,
    '╰─────────────────────────',
    '',
    '╭─❮ 🝐 𝗖ᴀᴛᴇɢᴏ𝗿ɪᴇs 🝐 ❯',
    `│ ⸸ \`${prefix}menu\``,
    `│ ⸸ \`${prefix}group\``,
    ...(isOwner ? [`│ ⸸ \`${prefix}owner\``] : []),
    `│ ⸸ \`${prefix}aimenu\``,
    `│ ⸸ \`${prefix}fun\``,
    `│ ⸸ \`${prefix}mediamenu\``,
    `│ ⸸ \`${prefix}others\``,
    '╰─────────────────────────',
  ]

  if (!categoryKey) {
    const availableQuickCommands = quickCommands
      .filter((name) => commands.has(name))
      .map((name) => `│ 🝓 \`${prefix}${name}\``)
    lines.push(
      '',
      '╭─❮ ⸸ 𝗤ᴜɪᴄᴋ 𝗖ᴏᴍᴍᴀɴᴅs ⸸ ❯',
      ...availableQuickCommands,
      '╰─────────────────────────',
    )
  }

  if (categoryKey) {
    const category = menuCategories[categoryKey]
    const entries = getCategoryCommands(categoryKey, commands, isOwner)
    lines.push(
      '',
      `╭─❮ ⸸ ${category.title} 𝗖ᴏᴍᴍᴀɴᴅs ⸸ ❯`,
      ...entries.map((command) => `│ 🝓 \`${prefix}${command.name}\``),
      '╰─────────────────────────',
    )
  }

  lines.push(
    '',
    '╭─❮ 𓆩 𝗧ʜᴇ 𝗗ᴀʀᴋ 𝗖ᴜʀsᴇ 𓆪 ❯',
    '│ 🝐 𝐌ᴀᴅᴇ ʙʏ 𝐒ᴇɴɪᴏʀ\'s 𝐀ɴɢᴇʟs ⸸︎',
    '╰─────────────────────────',
  )
  return lines.join('\n')
}

module.exports = {
  name: 'menu',
  aliases: ['help', 'aide'],
  desc: 'Open the command menu',
  async run({ sock, jid, msg, prefix, commands, args, isOwner, numero }) {
    const categoryKey = args[0]?.toLowerCase()
    if (categoryKey && !menuCategories[categoryKey]) {
      return sock.sendMessage(jid, {
        text: `Use ${prefix}menu, ${prefix}group, ${prefix}owner, ${prefix}aimenu, ${prefix}fun, ${prefix}mediamenu or ${prefix}others.`,
      }, { quoted: msg })
    }

    if (menuCategories[categoryKey]?.ownerOnly && !isOwner) {
      return sock.sendMessage(jid, { text: '× This category is available to the bot owner only.' }, { quoted: msg })
    }

    const text = await menuText({ categoryKey, commands, prefix, msg, numero, isOwner })
    const imagePath = path.join(config.assetsDir, 'main.jpg')
    const image = fs.readFileSync(imagePath)
    return sock.sendMessage(jid, { image, caption: text }, { quoted: msg })
  },
}
