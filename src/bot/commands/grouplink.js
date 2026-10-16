const { grouplink } = require('../groupCommands')

module.exports = {
  name: 'grouplink',
  desc: 'Get the current group invitation link (group admin and bot admin)',
  run: grouplink,
}
