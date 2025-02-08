const { ChannelType, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { addOrUpdateServer } = require('../database/databaseHelper');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('init')
		.setDescription('Init the bot for your server!')
		.addChannelOption(option =>
			option.setName('channel')
				.setDescription('The channel to echo into')
				.setRequired(true)
				.addChannelTypes(ChannelType.GuildText))
		.addBooleanOption(option =>
			option.setName('flextoggle')
				.setDescription('Whether or not the flex games are tracked')
				.setRequired(true))
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
			const channel = interaction.options.getChannel('channel');
			const channelId = channel.id;
			const flexToggle = interaction.options.getBoolean('flextoggle');
			const lang = interaction.options.getString('lang');

			await addOrUpdateServer(serverId, channelId, flexToggle, lang);

			const flexMessage = flexToggle == true ? 'it will watch for flex game' : 'it will not watch for flex game';
			await interaction.reply({
				content: `The bot has been setup in ${channel.name}, ${flexMessage} and has been set to "${lang}" language.`,
				flags: MessageFlags.Ephemeral,
			});
			console.log(`Bot has been setup for serverId: ${serverId}`);
		} catch (error) {
			console.error('Failed to init :', error);
			await interaction.reply({
				content: 'Failed to init, contact the dev',
				flags: MessageFlags.Ephemeral,
			});
		}
	},
};