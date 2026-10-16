const { DataTypes } = require('sequelize')

module.exports = (sequelize) => sequelize.define('GroupSetting', {
  groupJid: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  antilinkEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  rules: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '',
  },
  slowmodeSeconds: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0, max: 3600 },
  },
  autoAcceptEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  welcomeEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  welcomeMessage: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '╭─❮ 𓆩 𝗪ᴇʟᴄᴏᴍᴇ 𓆪 ❯\n│ 𓆩 𝗨sᴇʀ ➪ @user\n│ 🝐 𝗚ʀᴏᴜᴘ ➪ @group\n│ ⸸ 𝗠ᴇᴍʙᴇʀs ➪ @count\n│ 🝐 𝗧ɪᴍᴇ ➪ @time\n│ ⸸ 𝗗ᴀᴛᴇ ➪ @date\n│ 𓆩 𝗥ᴜʟᴇs ➪ @rules\n╰─────────────────────────\n\n𓆩 𝗪ᴇ’ʀᴇ ɢʟᴀᴅ ʏᴏᴜ’ʀᴇ ʜᴇʀᴇ.',
  },
  goodbyeEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  goodbyeMessage: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '╭─❮ 𓆩 𝗚ᴏᴏᴅʙʏᴇ 𓆪 ❯\n│ 𓆩 𝗨sᴇʀ ➪ @user\n│ 🝐 𝗚ʀᴏᴜᴘ ➪ @group\n│ ⸸ 𝗟ᴇғᴛ ᴏɴ ➪ @date\n│ 🝐 𝗧ɪᴍᴇ ➪ @time\n╰─────────────────────────\n\n𓆩 𝗪ᴇ ᴡɪsʜ ʏᴏᴜ ᴛʜᴇ ʙᴇsᴛ.',
  },
})
