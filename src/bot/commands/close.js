const { closeGroup } = require('../groupCommands')

module.exports = { name: 'close', desc: 'Restrict group messages to admins (admin)', run: closeGroup }
