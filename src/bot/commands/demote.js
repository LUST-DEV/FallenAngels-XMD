const { demote } = require('../groupCommands')

module.exports = { name: 'demote', desc: 'Remove admin status from a group member', run: demote }
