const config = require('../config')

const NEWSLETTER_INFO = {
  newsletterJid: config.whatsappNewsletterJid,
  newsletterName: 'Fallen X Angels',
  serverMessageId: 1,
}

function withNewsletterContext(sock) {
  return new Proxy(sock, {
    get(target, property) {
      const value = Reflect.get(target, property, target)
      if (property === 'sendMessage') {
        return (jid, content, options) => {
          if (!content || typeof content !== 'object' || content.react || content.delete || content.sticker) {
            return target.sendMessage(jid, content, options)
          }

          return target.sendMessage(jid, {
            ...content,
            contextInfo: {
              ...(content.contextInfo || {}),
              forwardingScore: 999,
              isForwarded: true,
              forwardedNewsletterMessageInfo: { ...NEWSLETTER_INFO },
            },
          }, options)
        }
      }
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

module.exports = { withNewsletterContext }
