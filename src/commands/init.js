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
                .setRequired(true)),
	async execute(interaction) {
        const serverId = interaction.guildId;
        const channelId = interaction.options.getChannel('channel');
        const flexToggle = interaction.options.getBoolean('flextoggle');
        
        // interaction.user is the object representing the User who ran the command
		// interaction.member is the GuildMember object, which represents the user in the specific guild
		// interaction.guild is the object representing the Guild in which the command was run
		await interaction.reply(`This server is ${interaction.guild.name} and has ${interaction.guild.memberCount} members.`);
	},
};