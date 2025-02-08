const { SlashCommandBuilder } = require('discord.js');

const locales = {
    en: '!',
    fr: 'Voici la liste des !',
};

module.exports = {
	data: new SlashCommandBuilder()
		.setName('language')
		.setDescription('Change the message language!')
        .addStringOption(option =>
            option.setName('lang')
                .setDescription('The language')
                .setRequired(true)
                .addChoices(
                    { name: 'fr', value: 'fr' },
                    { name: 'en', value: 'en' },
                )),
	async execute(interaction) {
        // interaction.user is the object representing the User who ran the command
		// interaction.member is the GuildMember object, which represents the user in the specific guild
		await interaction.reply('Pong!');
	},
};

