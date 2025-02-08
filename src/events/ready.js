const { Events } = require('discord.js');
const { initDB } = require('../database/init_database');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		await initDB();
		console.log(`Ready! Logged in as ${client.user.tag}`);
	},
};
