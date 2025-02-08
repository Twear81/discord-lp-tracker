const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('addplayer')
		.setDescription('Add player to the watch list!')
        .addStringOption(option =>
            option.setName('accountname')
                .setDescription('The account name')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('tag')
                .setDescription('The account tag (after the "#")')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('region')
                .setDescription('Region of the account')
                .setRequired(true)
                .addChoices(
                    { name: 'EUW', value: 'EUW' },
                    { name: 'NA', value: 'NA' },
                )),
	async execute(interaction) {
		// interaction.user is the object representing the User who ran the command
		// interaction.member is the GuildMember object, which represents the user in the specific guild
		await interaction.reply(`This command was run by ${interaction.user.username}, who joined on ${interaction.member.joinedAt}.`);
	},
};