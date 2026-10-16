const { normalizeMessageContent } = require('@whiskeysockets/baileys')
const { User, CommandLog } = require('../database')
const logger = require('../logger')
const commands = require('./commands')
const { handleAfkMessage } = require('./afk')
const { withNewsletterContext } = require('./newsletterContext')
const { getPrefix } = require('./userCache')
const menuCategories = new Set(['group', 'owner', 'aimenu', 'fun', 'mediamenu', 'others'])
const commandReactions = new Map([
    ['accept', '✅'],
    ['acceptall', '✅'],
    ['add', '➕'],
    ['afk', '💤'],
    ['ai', '🤖'],
    ['calc', '🧮'],
    ['country', '🌍'],
    ['crypto', '📈'],
    ['demote', '⬇️'],
    ['devinfo', '📨'],
    ['fact', '💡'],
    ['groupinfo', 'ℹ️'],
    ['grouplink', '🔗'],
    ['id', '🆔'],
    ['joke', '😂'],
    ['kick', '👢'],
    ['lyrics', '🎼'],
    ['poll', '📊'],
    ['profile', '👤'],
    ['promote', '⬆️'],
    ['qr', '🔳'],
    ['quote', '💬'],
    ['reject', '❌'],
    ['rejectall', '❌'],
    ['rules', '📜'],
    ['ship', '💞'],
    ['translate', '🌐'],
    ['warn', '⚠️'],
    ['warnings', '📋'],
    ['weather', '🌦️'],
    ['wiki', '📚'],
])

function getText(content) {
    return (
        content.conversation ||
        content.extendedTextMessage?.text ||
        content.imageMessage?.caption ||
        content.videoMessage?.caption ||
        ''
    )
}

module.exports = async (sock, numero, msg) => {
    const jid = msg.key.remoteJid
    if (!msg.message || jid === 'status@broadcast') return

    const content = normalizeMessageContent(msg.message)
    const text = getText(content).trim()
    const prefix = await getPrefix(numero)
    await handleAfkMessage(sock, numero, msg, content, text, prefix)
    if (!text) return

    if (!text.startsWith(prefix)) return

    const [name, ...commandArgs] = text.slice(prefix.length).trim().split(/\s+/)
    if (!name) return
    const commandName = name.toLowerCase()
    const cmd = menuCategories.has(commandName)
        ? commands.get('menu')
        : commands.get(commandName)
    const args = menuCategories.has(commandName)
        ? [commandName === 'aimenu' ? 'ai' : commandName === 'mediamenu' ? 'media' : commandName, ...commandArgs]
        : commandArgs
    if (!cmd) return

    const isOwner = !!msg.key.fromMe
    if (cmd.ownerOnly && !isOwner) return

    const commandSock = withNewsletterContext(sock)
    const reply = (replyText) => commandSock.sendMessage(jid, { text: replyText }, { quoted: msg })
    const user = await User.findByPk(numero, { attributes: ['autotyping', 'botMode'] })
    if (!isOwner && user?.botMode === 'private') return
    const autotyping = user?.autotyping === true

    if (autotyping) {
        try {
            await sock.presenceSubscribe(jid)
            await sock.sendPresenceUpdate('composing', jid)
            await new Promise((resolve) => setTimeout(resolve, 3000))
        } catch (error) {
            logger.warn({ numero, err: error.message }, 'impossible d’activer l’indicateur de saisie')
        }
    }

    const reaction = commandReactions.get(cmd.name)
    if (reaction) {
        try {
            await sock.sendMessage(jid, { react: { text: reaction, key: msg.key } })
        } catch (error) {
            logger.warn({ numero, command: cmd.name, err: error.message }, 'unable to react to command')
        }
    }

    try {
        await cmd.run({ sock: commandSock, msg, jid, args, prefix, numero, reply, isOwner, commands })
    } finally {
        if (autotyping) {
            try {
                await sock.sendPresenceUpdate('paused', jid)
            } catch (error) {
                logger.warn({ numero, err: error.message }, 'impossible de désactiver l’indicateur de saisie')
            }
        }
    }

    await CommandLog.create({ numero, command: cmd.name })
}
