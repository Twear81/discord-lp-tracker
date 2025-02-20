import { SlashCommandBuilder, CommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { getServer, listAllPlayerForSpecificServer, PlayerInfo, sortPlayers } from '../database/databaseHelper';
import { AppError, ErrorTypes } from '../error/error';

export const data = new SlashCommandBuilder()
	.setName('leaderboard')
	.setDescription('Check who is the best from player watched!');

export async function execute(interaction: CommandInteraction): Promise<void> {
	try {
		const serverId = interaction.guildId as string;
		const serverInfo = await getServer(serverId);

		const accountNameTagPlayerList: PlayerInfo[] = await listAllPlayerForSpecificServer(serverId);

		const playerSortForSoloQ = sortPlayers(accountNameTagPlayerList, "RANKED_SOLO_5x5");
		const playerSortForFlex = sortPlayers(accountNameTagPlayerList, "RANKED_FLEX_SR");

		if (serverInfo.flextoggle == true) {
			await generateLeaderboardMessage(interaction, serverInfo.lang, playerSortForFlex, "RANKED_FLEX_SR");
		}
		await generateLeaderboardMessage(interaction, serverInfo.lang, playerSortForSoloQ, "RANKED_SOLO_5x5");
		console.log('The leaderboard has been demanded');
	} catch (error) {
		if (error instanceof AppError) {
			if (error.type === ErrorTypes.SERVER_NOT_INITIALIZE) {
				await interaction.reply({
					content: 'You have to init the bot first',
					flags: MessageFlags.Ephemeral,
				});
			}
		} else {
			console.error('Failed to display the leaderboard:', error);
			await interaction.reply({
				content: 'Failed to display the leaderboard, contact the dev',
				flags: MessageFlags.Ephemeral,
			});
		}
	}
}

const generateLeaderboardMessage = async (interaction: CommandInteraction, lang: string, sortedPlayers: PlayerInfo[], queueType: string) => {
	const rankEmojis: Record<string, string> = {
		"Iron": "⬛",
		"Bronze": "🟫",
		"Silver": "⬜",
		"Gold": "🟨",
		"Platinum": "🟩",
		"Emerald": "💚",
		"Diamond": "🔷",
		"Master": "🟣",
		"Grandmaster": "🔴",
		"Challenger": "👑"
	};
	const translations = {
		fr: {
			title: queueType === "RANKED_SOLO_5x5" ? "🏆 Classement SoloQ" : "🏆 Classement FlexQ",
			description: "Voici les joueurs classés du plus fort au plus faible :",
			playerLine: (index: number, name: string, region: string, rank: string, tier: string, lp: number) =>
				`**#${index}** ${rankEmojis[rank] || ""} **${name}**\n🌍 **Région:** ${region} | 🏅 **Rang:** ${rank} ${tier} | 🔥 **LP:** ${lp}`,
			total: (count: number) => `Total: ${count} joueur(s) classés`,
			noPlayers: "📭 Aucun joueur classé pour le moment !"
		},
		en: {
			title: queueType === "RANKED_SOLO_5x5" ? "🏆 SoloQ Leaderboard" : "🏆 FlexQ Leaderboard",
			description: "Here are the players ranked from strongest to weakest:",
			playerLine: (index: number, name: string, region: string, rank: string, tier: string, lp: number) =>
				`**#${index}** ${rankEmojis[rank] || ""} **${name}**\n🌍 **Region:** ${region} | 🏅 **Rank:** ${rank} ${tier} | 🔥 **LP:** ${lp}`,
			total: (count: number) => `Total: ${count} ranked players`,
			noPlayers: "📭 No ranked players at the moment!"
		}
	};

	const t = translations[lang as keyof typeof translations];

	if (sortedPlayers.length === 0) {
		return interaction.reply({ content: t.noPlayers, ephemeral: true });
	}

	const messageToDisplay = new EmbedBuilder()
		.setTitle(t.title)
		.setColor(queueType === "RANKED_SOLO_5x5" ? 0x0099FF : 0xFFD700) // Blue for SoloQ, Gold for Flex
		.setDescription(
			`${t.description}\n\n` +
			sortedPlayers.map((player, index) =>
				t.playerLine(
					index + 1,
					player.accountnametag,
					player.region,
					queueType === "RANKED_SOLO_5x5" ? player.currentSoloQRank! : player.currentFlexRank!,
					queueType === "RANKED_SOLO_5x5" ? player.currentSoloQTier! : player.currentFlexTier!,
					queueType === "RANKED_SOLO_5x5" ? player.currentSoloQLP! : player.currentFlexLP!
				)
			).join("\n\n")
		)
		.setFooter({ text: t.total(sortedPlayers.length) })
		.setTimestamp();

	await interaction.reply({
		embeds: [messageToDisplay],
		flags: MessageFlags.Ephemeral,
	});
} 