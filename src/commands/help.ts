import { SlashCommandBuilder, MessageFlags, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getLangServer } from '../database/databaseHelper';
import logger from '../logger/logger';

const languages = {
	fr: {
		title: '📌 Guide d`utilisation du Bot',
		description: 'Bienvenue ! Voici les commandes pour bien utiliser le bot :\n\n' +
			'🔹 **Initialisation**\n' +
			'➜ `/init` : Initialise le bot pour votre serveur.\n\n' +
			'🔹 **Ajout de joueurs**\n' +
			'➜ `/addplayer accountname:<nom> tag:<tag> region:<région>` : Ajoute un joueur à la liste de suivi.\n\n' +
			'🔹 **Gestion des joueurs**\n' +
			'➜ `/deleteplayer accountname:<nom> tag:<tag> region:<région>` : Supprime un joueur de la liste.\n' +
			'➜ `/list` : Affiche la liste des joueurs suivis.\n' +
			'➜ `/leaderboard` : Affiche le classement général des joueurs.\n\n' +
			'🔹 **Récapitulatif mensuel manuel**\n' +
			'➜ `/monthlyrecap month:<mois> year:<année>` : Génère manuellement un récapitulatif mensuel des joueurs.\n\n' +
			'🔹 **Récapitulatif quotidien**\n' +
			'📢 Tous les matins, le bot envoie un résumé des performances :\n' +
			'- Victoires / Défaites 🎉💀\n' +
			'- LP gagnés / perdus 📈📉\n\n' +
			'🔹 **Récapitulatif mensuel automatique**\n' +
			'📢 Le 1er de chaque mois, le bot envoie automatiquement le récapitulatif du mois précédent pour tous les joueurs.\n\n' +
			'*Besoin d`aide ? N`hésitez pas à demander !*',
	},
	en: {
		title: '📌 Bot Usage Guide',
		description: 'Welcome! Here are the commands to use the bot properly:\n\n' +
			'🔹 **Initialization**\n' +
			'➜ `/init` : Initializes the bot for your server.\n\n' +
			'🔹 **Adding Players**\n' +
			'➜ `/addplayer accountname:<name> tag:<tag> region:<region>` : Adds a player to the tracking list.\n\n' +
			'🔹 **Player Management**\n' +
			'➜ `/deleteplayer accountname:<name> tag:<tag> region:<region>` : Removes a player from the list.\n' +
			'➜ `/list` : Displays the list of tracked players.\n' +
			'➜ `/leaderboard` : Shows the general ranking of players.\n\n' +
			'🔹 **Manual Monthly Recap**\n' +
			'➜ `/monthlyrecap month:<month> year:<year>` : Manually generates a monthly recap for players.\n\n' +
			'🔹 **Daily Recap**\n' +
			'📢 Every morning, the bot sends a performance summary:\n' +
			'- Wins / Losses 🎉💀\n' +
			'- LP gained / lost 📈📉\n\n' +
			'🔹 **Automatic Monthly Recap**\n' +
			'📢 On the 1st of each month, the bot automatically sends a recap of the previous month for all players.\n\n' +
			'*Need help? Feel free to ask!*',
	},
};

export const data = new SlashCommandBuilder()
	.setName('help')
	.setDescription('I will explain you how to setup the bot on your server!');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	try {
		const serverId = interaction.guildId as string;
		const lang: string = await getLangServer(serverId);

		// Create the message
		const messageWithTheRightServerLanguage = languages[lang as keyof typeof languages];
		const helpEmbed = new EmbedBuilder()
			.setTitle(messageWithTheRightServerLanguage.title)
			.setColor(0x0099FF)
			.setDescription(messageWithTheRightServerLanguage.description)
			.setTimestamp();

		await interaction.reply({
			embeds: [helpEmbed],
			flags: MessageFlags.Ephemeral,
		});
		logger.info('The help has been called');
	} catch (error) {
		logger.error('Failed to display the help:', error);
		await interaction.reply({
			content: 'Failed to display the help, contact the dev',
			flags: MessageFlags.Ephemeral,
		});
	}
}
