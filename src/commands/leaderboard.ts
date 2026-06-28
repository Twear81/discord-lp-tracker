import { SlashCommandBuilder, CommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { getServer, listAllPlayerForQueueInfoForSpecificServer, listAllPlayerForSpecificServer, PlayerForQueueInfo, PlayerInfo, sortPlayersByRank } from '../database/databaseHelper';
import { AppError, ErrorTypes } from '../error/error';
import { GameQueueType } from '../tracking/GameQueueType';
import logger from '../logger/logger';

export const data = new SlashCommandBuilder()
	.setName('leaderboard')
	.setDescription('Check who is the best from player watched!');

export async function execute(interaction: CommandInteraction): Promise<void> {
	const serverId = interaction.guildId as string;
	try {
		await interaction.deferReply({ ephemeral: true });
		const serverInfo = await getServer(serverId);

		const playerInfoList: PlayerInfo[] = await listAllPlayerForSpecificServer(serverId);

		const playerSortForSoloQ: PlayerForQueueInfo[] = sortPlayersByRank(await listAllPlayerForQueueInfoForSpecificServer(serverId, GameQueueType.RANKED_SOLO_5x5));
		const playerSortForFlex: PlayerForQueueInfo[] = sortPlayersByRank(await listAllPlayerForQueueInfoForSpecificServer(serverId, GameQueueType.RANKED_FLEX_SR));
		const playerSortForClash: PlayerForQueueInfo[] = sortPlayersByRank(await listAllPlayerForQueueInfoForSpecificServer(serverId, GameQueueType.RANKED_CLASH));
		const playerSortFor5v5: PlayerForQueueInfo[] = sortPlayersByRank(await listAllPlayerForQueueInfoForSpecificServer(serverId, GameQueueType.RANKED_5v5));
		const playerSortForTFT: PlayerForQueueInfo[] = sortPlayersByRank(await listAllPlayerForQueueInfoForSpecificServer(serverId, GameQueueType.RANKED_TFT));

		let hasAlreadySentAMessage = false;
		if (serverInfo.flextoggle == true) {
			await generateLeaderboardMessage(interaction, serverInfo.lang, playerInfoList, playerSortForFlex, GameQueueType.RANKED_FLEX_SR, hasAlreadySentAMessage);
			hasAlreadySentAMessage = true;
		}
		await generateLeaderboardMessage(interaction, serverInfo.lang, playerInfoList, playerSortForClash, GameQueueType.RANKED_CLASH, hasAlreadySentAMessage);
		hasAlreadySentAMessage = true;
		await generateLeaderboardMessage(interaction, serverInfo.lang, playerInfoList, playerSortFor5v5, GameQueueType.RANKED_5v5, hasAlreadySentAMessage);
		hasAlreadySentAMessage = true;
		if (serverInfo.tfttoggle == true) {
			await generateLeaderboardMessage(interaction, serverInfo.lang, playerInfoList, playerSortForTFT, GameQueueType.RANKED_TFT, hasAlreadySentAMessage);
			hasAlreadySentAMessage = true;
		}
		await generateLeaderboardMessage(interaction, serverInfo.lang, playerInfoList, playerSortForSoloQ, GameQueueType.RANKED_SOLO_5x5, hasAlreadySentAMessage);
		logger.info('The leaderboard has been demanded');
	} catch (error) {
		if (error instanceof AppError) {
			if (error.type === ErrorTypes.SERVER_NOT_INITIALIZE) {
				await interaction.editReply({
					content: 'You have to init the bot first',
					flags: MessageFlags.Ephemeral,
				});
			}
		} else {
			logger.error('Failed to display the leaderboard:', error);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({
					content: 'Failed to display the leaderboard, contact the dev',
					flags: MessageFlags.Ephemeral,
				});
			} else {
				await interaction.reply({
					content: 'Failed to display the leaderboard, contact the dev',
					flags: MessageFlags.Ephemeral,
				});
			}
		}
	}
}

const generateLeaderboardMessage = async (interaction: CommandInteraction, lang: string, playersInfos: PlayerInfo[], sortedPlayerForQueueInfos: PlayerForQueueInfo[], queueType: GameQueueType, isSecondMessage: boolean) => {
	const rankEmojis: Record<string, string> = {
		"IRON": "⬛",
		"BRONZE": "🟫",
		"SILVER": "⬜",
		"GOLD": "🟨",
		"PLATINUM": "🟩",
		"EMERALD": "💚",
		"DIAMOND": "🔷",
		"MASTER": "🟣",
		"GRANDMASTER": "🔴",
		"CHALLENGER": "👑"
	};
	const titleMapFR: Record<GameQueueType, string> = {
		[GameQueueType.RANKED_SOLO_5x5]: "🏆 Classement SoloQ",
		[GameQueueType.RANKED_FLEX_SR]: "🏆 Classement FlexQ",
		[GameQueueType.RANKED_CLASH]: "🏆 Classement Clash",
		[GameQueueType.RANKED_5v5]: "🏆 Classement 5v5",
		[GameQueueType.RANKED_TFT]: "🏆 Classement TFT",
		[GameQueueType.RANKED_TFT_DOUBLE_UP]: "🏆 Classement TFT Double",
	};
	const titleMapEN: Record<GameQueueType, string> = {
		[GameQueueType.RANKED_SOLO_5x5]: "🏆 SoloQ Leaderboard",
		[GameQueueType.RANKED_FLEX_SR]: "🏆 FlexQ Leaderboard",
		[GameQueueType.RANKED_CLASH]: "🏆 Clash Leaderboard",
		[GameQueueType.RANKED_5v5]: "🏆 5v5 Leaderboard",
		[GameQueueType.RANKED_TFT]: "🏆 TFT Leaderboard",
		[GameQueueType.RANKED_TFT_DOUBLE_UP]: "🏆 TFT Double Leaderboard",
	};

	const translations = {
		fr: {
			title: titleMapFR[queueType],
			description: "Voici les joueurs classés du plus fort au plus faible :",
			playerLine: (index: number, name: string, tag: string, region: string, rank: string, tier: string, lp: number) =>
				`**#${index}** **${name}#${tag}**\n🌍 **Région:** ${region} |  **Rang:** ${rankEmojis[tier] || "🏅"} ${tier} ${rank} | 🔥 **LP:** ${lp}`,
			total: (count: number) => `Total: ${count} joueur(s) classés`,
			noPlayers: "📭 Aucun joueur classé pour le moment !"
		},
		en: {
			title: titleMapEN[queueType],
			description: "Here are the players ranked from strongest to weakest:",
			playerLine: (index: number, name: string, tag: string, region: string, rank: string, tier: string, lp: number) =>
				`**#${index}** **${name}#${tag}**\n🌍 **Region:** ${region} | **Rank:** ${rankEmojis[tier] || "🏅"} ${tier} ${rank} | 🔥 **LP:** ${lp}`,
			total: (count: number) => `Total: ${count} ranked players`,
			noPlayers: "📭 No ranked players at the moment!"
		}
	};

	const t = translations[lang as keyof typeof translations];

	if (sortedPlayerForQueueInfos.length === 0) {
		return interaction.editReply({ content: t.noPlayers, ephemeral: true });
	}

	enum QueueColor {
		RANKED_SOLO_5x5 = 0x0099FF, // Bleu for SoloQ
		RANKED_FLEX_SR = 0xFFD700,  // Gold for Flex
		RANKED_CLASH = 0xE74C3C,    // Red for Clash
		RANKED_5v5 = 0x2ECC71,      // Green for 5v5
		RANKED_TFT = 0x8A2BE2       // Purple for TFT
	}

	const messageToDisplay = new EmbedBuilder()
		.setTitle(t.title)
		.setColor(QueueColor[queueType as keyof typeof QueueColor] || 0xFFFFFF) // default to white
		.setDescription(
			`${t.description}\n\n` +
			sortedPlayerForQueueInfos.map((player, index) =>
				t.playerLine(
					index + 1,
					playersInfos.find((value: PlayerInfo) => value.id == player.playerId)!.gameName,
					playersInfos.find((value: PlayerInfo) => value.id == player.playerId)!.tagLine,
					playersInfos.find((value: PlayerInfo) => value.id == player.playerId)!.region,
					player.currentRank!,
					player.currentTier!,
					player.currentLP!
				)
			).join("\n\n")
		)
		.setFooter({ text: t.total(sortedPlayerForQueueInfos.length) })
		.setTimestamp();

	if (isSecondMessage == true) {
		await interaction.followUp({
			embeds: [messageToDisplay],
			flags: MessageFlags.Ephemeral,
		});
	} else {
		await interaction.editReply({
			embeds: [messageToDisplay],
			flags: MessageFlags.Ephemeral,
		});
	}

}