const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('flextoggle')
		.setDescription('Whether or not the flex games are tracked!')
        .addBooleanOption(option =>
            option.setName('flextoggle')
                .setDescription('Whether or not the flex games are tracked')
                .setRequired(true)),
	async execute(interaction) {
        // interaction.user is the object representing the User who ran the command
		// interaction.member is the GuildMember object, which represents the user in the specific guild
		await interaction.reply('Pong!')
	},
};