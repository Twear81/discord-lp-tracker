const { ChannelType, SlashCommandBuilder } = require('discord.js');

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
		// const serverId = interaction.guildId;
		const channelId = interaction.options.getChannel('channel');
		const flexToggle = interaction.options.getBoolean('flextoggle');
		const lang = interaction.options.getString('lang');

		const flexMessage = flexToggle == true ? 'it will watch for flex game' : 'it will not watch for flex game';
		await interaction.reply(`The bot has been setup in ${channelId}, ${flexMessage} and has been set to "${lang}" language.`);
	},
};