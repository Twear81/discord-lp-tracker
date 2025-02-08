const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { updateLangServer } = require('../database/databaseHelper');
const { ErrorTypes } = require('../error/error');

// const locales = {
// 	en: '!',
// 	fr: 'Voici la liste des !',
// };

module.exports = {
	data: new SlashCommandBuilder()
		.setName('language')
		.setDescription('Change the message language!')
		.addStringOption(option =>
			 option.setName('lang')
				.setDescription('The language used by the bot')
				.setRequired(true)
				.addChoices(
				    { name: 'fr', value: 'fr' },
				    { name: 'en', value: 'en' },
				)),
	async execute(interaction) {
		try {
			const serverId = interaction.guildId;
			const lang = interaction.options.getString('lang');

			await updateLangServer(serverId, lang);

			await interaction.reply({
				content: `The bot has been set to "${lang}" language.`,
				flags: MessageFlags.Ephemeral,
			});
			console.log(`The language has been changed for serverId: ${serverId}`);
		} catch (error) {
			if (error.type == ErrorTypes.SERVER_NOT_INITIALIZE) {
				await interaction.reply({
					content: 'You have to init the bot first',
					flags: MessageFlags.Ephemeral,
				});
			} else {
				console.error('Failed to change the language :', error);
				await interaction.reply({
					content: 'Failed to change the language, contact the dev',
					flags: MessageFlags.Ephemeral,
				});
			}
		}
	},
};

