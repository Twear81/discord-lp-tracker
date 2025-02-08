const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const { listAllPlayer } = require('../database/databaseHelper');
const { ErrorTypes } = require('../error/error');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('list')
		.setDescription('List all players watched!'),
	async execute(interaction) {
		try {
			const serverId = interaction.guildId;

			// [accountNameTagList.dataValues: { accountnametag: 'test#test', region: 'EUW' }]
			const accountNameTagPlayerList = await listAllPlayer(serverId);

			// Create the message
			const messageToDisplay = new EmbedBuilder()
				.setColor(0x0099FF)
				.setTitle('List of player tracked')
				.setDescription(
					accountNameTagPlayerList.map(acc => `**Account:** ${acc.dataValues.accountnametag}\n**Region:** ${acc.dataValues.region}`).join('\n\n'),
				)
				.setTimestamp();
			await interaction.reply({
				embeds: [messageToDisplay],
				flags: MessageFlags.Ephemeral,
			});
			console.log('The list has been demanded');
		} catch (error) {
			if (error.type == ErrorTypes.SERVER_NOT_INITIALIZE) {
				await interaction.reply({
					content: 'You have to init the bot first',
					flags: MessageFlags.Ephemeral,
				});
			} else {
				console.error('Failed to display the list :', error);
				await interaction.reply({
					content: 'Failed to display the list, contact the dev',
					flags: MessageFlags.Ephemeral,
				});
			}
		}
	},
};