const { Sequelize, DataTypes, Op } = require("sequelize");
const path = require('path');
const config = require('../config');
const fs = require('fs');


fs.mkdirSync(path.dirname(config.dbPath), {recursive: true});


const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: config.dbPath,
    logging: false
});

const User = require('./models/User')(sequelize);
const CommandLog = require('./models/CommandLog')(sequelize);
const GroupSetting = require('./models/GroupSetting')(sequelize)
const GroupWarning = require('./models/GroupWarning')(sequelize)
const AfkStatus = require('./models/AfkStatus')(sequelize)


User.hasMany(CommandLog, {
    foreignKey: {name: 'numero', allowNull: false},
    sourceKey: 'numero',
    onDelete: 'CASCADE'
});


CommandLog.belongsTo(User, {
    foreignKey: {name: 'numero', allowNull: false},
    targetKey: 'numero',

});

async function syncDatabase() {
    await sequelize.sync()
    const tableName = User.getTableName()
    const columns = await sequelize.getQueryInterface().describeTable(tableName)

    if (!columns.autotyping) {
        await sequelize.getQueryInterface().addColumn(tableName, 'autotyping', {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        })
    }

    if (!columns.autoreact) {
        await sequelize.getQueryInterface().addColumn(tableName, 'autoreact', {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        })
    }

    if (!columns.autoread) {
        await sequelize.getQueryInterface().addColumn(tableName, 'autoread', {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        })
    }

    if (!columns.autostatus) {
        await sequelize.getQueryInterface().addColumn(tableName, 'autostatus', {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        })
    }

    if (!columns.country) {
        await sequelize.getQueryInterface().addColumn(tableName, 'country', {
            type: DataTypes.STRING(2),
            allowNull: true,
            defaultValue: null
        })
    }

    if (!columns.botMode) {
        await sequelize.getQueryInterface().addColumn(tableName, 'botMode', {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: 'public'
        })
    }

    if (!columns.anticallEnabled) {
        await sequelize.getQueryInterface().addColumn(tableName, 'anticallEnabled', {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        })
    }

    const usersWithoutCountry = await User.findAll({
        attributes: ['numero'],
        where: { country: { [Op.is]: null } },
        raw: true
    })
    const usersByCountry = new Map()
    const parsePhone = require('../utils/phone').parse

    for (const user of usersWithoutCountry) {
        const phone = parsePhone(user.numero)
        if (!phone?.country) continue
        const numbers = usersByCountry.get(phone.country) || []
        numbers.push(user.numero)
        usersByCountry.set(phone.country, numbers)
    }

    for (const [country, numbers] of usersByCountry) {
        await User.update({ country }, { where: { numero: { [Op.in]: numbers } } })
    }

    const settingsTable = GroupSetting.getTableName()
    const settingsColumns = await sequelize.getQueryInterface().describeTable(settingsTable)
    const settingFields = {
        antilinkEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        rules: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
        slowmodeSeconds: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        autoAcceptEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        welcomeEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        welcomeMessage: {
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue: '╭─❮ 𓆩 𝗪ᴇʟᴄᴏᴍᴇ 𓆪 ❯\n│ 𓆩 𝗨sᴇʀ ➪ @user\n│ 🝐 𝗚ʀᴏᴜᴘ ➪ @group\n│ ⸸ 𝗠ᴇᴍʙᴇʀs ➪ @count\n│ 🝐 𝗧ɪᴍᴇ ➪ @time\n│ ⸸ 𝗗ᴀᴛᴇ ➪ @date\n│ 𓆩 𝗥ᴜʟᴇs ➪ @rules\n╰─────────────────────────\n\n𓆩 𝗪ᴇ’ʀᴇ ɢʟᴀᴅ ʏᴏᴜ’ʀᴇ ʜᴇʀᴇ.',
        },
        goodbyeEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        goodbyeMessage: {
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue: '╭─❮ 𓆩 𝗚ᴏᴏᴅʙʏᴇ 𓆪 ❯\n│ 𓆩 𝗨sᴇʀ ➪ @user\n│ 🝐 𝗚ʀᴏᴜᴘ ➪ @group\n│ ⸸ 𝗟ᴇғᴛ ᴏɴ ➪ @date\n│ 🝐 𝗧ɪᴍᴇ ➪ @time\n╰─────────────────────────\n\n𓆩 𝗪ᴇ ᴡɪsʜ ʏᴏᴜ ᴛʜᴇ ʙᴇsᴛ.',
        },
    }

    for (const [column, definition] of Object.entries(settingFields)) {
        if (!settingsColumns[column]) {
            await sequelize.getQueryInterface().addColumn(settingsTable, column, definition)
        }
    }

    await GroupSetting.update(
        { welcomeMessage: settingFields.welcomeMessage.defaultValue },
        {
            where: {
                welcomeMessage: {
                    [Op.in]: [
                        'Wᴇʟᴄᴏᴍᴇ @user ᴛᴏ @group! Yᴏᴜ ᴀʀᴇ ᴍᴇᴍʙᴇʀ #@count. Jᴏɪɴᴇᴅ ᴀᴛ @time.',
                        '𝐖ᴇʟᴄᴏᴍᴇ @name ᴛᴏ @group!\nYᴏᴜ’ʀᴇ ᴍᴇᴍʙᴇʀ #@count.\nDᴀᴛᴇ: @date  ×  Tɪᴍᴇ: @time\nRᴜʟᴇs: @rules',
                    ],
                },
            },
        },
    )
    await GroupSetting.update(
        { goodbyeMessage: settingFields.goodbyeMessage.defaultValue },
        {
            where: {
                goodbyeMessage: {
                    [Op.in]: [
                        'Gᴏᴏᴅʙʏᴇ @user. @group ᴡɪsʜᴇs ʏᴏᴜ ᴛʜᴇ ʙᴇsᴛ — @time.',
                        '𝐆ᴏᴏᴅʙʏᴇ @name.\nYᴏᴜ ʟᴇғᴛ @group ᴏɴ @date ᴀᴛ @time.\nWᴇ ᴡɪsʜ ʏᴏᴜ ᴛʜᴇ ʙᴇsᴛ.',
                    ],
                },
            },
        },
    )
}

module.exports = {sequelize, User, CommandLog, GroupSetting, GroupWarning, AfkStatus, syncDatabase}
