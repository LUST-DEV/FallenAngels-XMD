const { DataTypes } = require('sequelize');
const config = require('../../config');

module.exports = (sequelize) => {
     return sequelize.define("User", {
        numero: {
            type: DataTypes.STRING,
            primaryKey: true
        },
        country: {
            type: DataTypes.STRING(2),
            allowNull: true,
            defaultValue: null
        },
        prefix: {
            type: DataTypes.STRING(5),
            defaultValue: config.defaultPrefix
        },
        status: {
            type: DataTypes.ENUM('pending', 'connected', 'disconnected'),
            defaultValue: 'pending'
        },
        autotyping: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        autoreact: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        autoread: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        autostatus: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        botMode: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: 'public'
        },
        anticallEnabled: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    });
};