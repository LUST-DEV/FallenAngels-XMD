const { welcome } = require('../groupCommands')

module.exports = {
  name: 'welcome',
  desc: 'Eɴᴀʙʟᴇ ᴏʀ ᴅɪsᴀʙʟᴇ ᴡᴇʟᴄᴏᴍᴇ ᴍᴇssᴀɢᴇs (ɢʀᴏᴜᴘ ᴀᴅᴍɪɴ)',
  run: welcome,
}
