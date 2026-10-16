const { slowmode } = require('../groupCommands')

module.exports = {
  name: 'slowmode',
  desc: 'Set the message delay in this group (admin)',
  run: slowmode,
}
