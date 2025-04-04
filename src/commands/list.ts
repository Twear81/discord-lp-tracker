import { SlashCommandBuilder, MessageFlags, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getServer, listAllPlayerForSpecificServer, PlayerInfo } from '../database/databaseHelper';
import { AppError, ErrorTypes } from '../error/error';

export const data = new SlashCommandBuilder()
	.setName('list')
	.setDescription('List all players watched!');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	try {
		const serverId = interaction.guildId as string;
		const serverInfo = await getServer(serverId);
		const accountNameTagPlayerList: PlayerInfo[] = await listAllPlayerForSpecificServer(serverId);

		const lang = serverInfo.lang;
		const translations = {
			fr: {
				title: "📋 Liste des joueurs suivis",
				description: "Voici la liste des joueurs actuellement suivis :",
				playerLine: (index: number, name: string, region: string) => `**${index}.** 🎮 **${name}**\n🌍 Région: **${region}**`,
				total: (count: number) => `Total: ${count} joueur(s)`,
				noPlayers: "📭 Aucun joueur n'est suivi pour le moment !"
			},
			en: {
				title: "📋 List of Tracked Players",
				description: "Here is the list of currently tracked players:",
				playerLine: (index: number, name: string, region: string) => `**${index}.** 🎮 **${name}**\n🌍 Region: **${region}**`,
				total: (count: number) => `Total: ${count} player(s)`,
				noPlayers: "📭 No players are being tracked at the moment!"
			}
		};
	
		const t = translations[lang as keyof typeof translations];

		if (accountNameTagPlayerList.length === 0) {
			await interaction.reply({
				content: t.noPlayers,
				flags: MessageFlags.Ephemeral,
			})
		} else {
			const messageToDisplay = new EmbedBuilder()
				.setTitle(t.title)
				.setColor(0x0099FF)
				.setDescription(
					`${t.description}\n\n` +
					accountNameTagPlayerList.map((acc, index) => t.playerLine(index + 1, `${acc.gameName}#${acc.tagLine}`, acc.region)).join("\n\n")
				)
				.setFooter({ text: t.total(accountNameTagPlayerList.length) })
				.setTimestamp();

			await interaction.reply({
				embeds: [messageToDisplay],
				flags: MessageFlags.Ephemeral,
			});
		}
		console.log('The list has been demanded');
	} catch (error) {
		if (error instanceof AppError) {
			if (error.type === ErrorTypes.SERVER_NOT_INITIALIZE) {
				await interaction.reply({
					content: 'You have to init the bot first',
					flags: MessageFlags.Ephemeral,
				});
			}
		} else {
			console.error('Failed to display the list:', error);
			await interaction.reply({
				content: 'Failed to display the list, contact the dev',
				flags: MessageFlags.Ephemeral,
			});
		}
	}
}