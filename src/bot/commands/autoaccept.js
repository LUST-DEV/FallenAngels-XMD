const { autoaccept } = require('../groupCommands')

module.exports = { name: 'autoaccept', desc: 'Toggle automatic approval of group join requests (admin)', run: autoaccept }
