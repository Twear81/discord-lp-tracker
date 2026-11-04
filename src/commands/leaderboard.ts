import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, InteractionContextType } from 'discord.js';
import { getServer, listAllPlayerForQueueInfoForSpecificServer, listAllPlayerForSpecificServer, PlayerForQueueInfo, PlayerInfo } from '../database/databaseHelper';
import { replyCommandError } from './commandError';
import { GameQueueType } from '../tracking/GameQueueType';
import { sortPlayersByRank } from '../tracking/rank';
import { QUEUE_COLORS } from '../tracking/sendMessage';
import { GameTranslations, getTranslations } from '../translation/translation';
import logger from '../logger/logger';

export const data = new SlashCommandBuilder()
	.setName('leaderboard')
	.setContexts(InteractionContextType.Guild)
	.setDescription('Check who is the best from player watched!');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	const serverId = interaction.guildId as string;
	try {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const serverInfo = await getServer(serverId);
		const t = getTranslations(serverInfo.lang);

		// SoloQ goes last so it ends up closest to the input box.
		const queueTypes: GameQueueType[] = [
			...(serverInfo.flextoggle ? [GameQueueType.RANKED_FLEX_SR] : []),
			GameQueueType.RANKED_CLASH,
			GameQueueType.RANKED_5v5,
			...(serverInfo.tfttoggle ? [GameQueueType.RANKED_TFT, GameQueueType.RANKED_TFT_DOUBLE_UP] : []),
			GameQueueType.RANKED_SOLO_5x5,
		];

		const [players, rankings] = await Promise.all([
			listAllPlayerForSpecificServer(serverId),
			Promise.all(queueTypes.map(async queueType => ({
				queueType,
				ranked: sortPlayersByRank(await listAllPlayerForQueueInfoForSpecificServer(serverId, queueType)),
			}))),
		]);

		// Queues nobody is ranked in are skipped instead of each printing "no players".
		const embeds = rankings.flatMap(({ queueType, ranked }) => buildLeaderboardEmbed(t, players, ranked, queueType) ?? []);
		if (embeds.length === 0) {
			await interaction.editReply({ content: t.leaderboard.noPlayers });
			return;
		}

		// One message per embed: Discord caps the combined size of a message's
		// embeds at 6000 characters, which a few full leaderboards can exceed.
		const [first, ...rest] = embeds;
		await interaction.editReply({ embeds: [first] });
		for (const embed of rest) {
			await interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
		}
		logger.info('The leaderboard has been demanded');
	} catch (error) {
		await replyCommandError(interaction, error, 'Failed to display the leaderboard, contact the dev');
	}
}

const buildLeaderboardEmbed = (t: GameTranslations, players: PlayerInfo[], ranked: PlayerForQueueInfo[], queueType: GameQueueType): EmbedBuilder | null => {
	// Join queue rows onto Player rows via a Map; skip (with a warning) any
	// queue row whose Player no longer exists.
	const playersById = new Map(players.map(player => [player.id, player]));
	const playerLines: string[] = [];
	for (const entry of ranked) {
		const player = playersById.get(entry.playerId);
		if (!player) {
			logger.warn(`No Player row for playerId ${entry.playerId}, skipping its leaderboard entry.`);
			continue;
		}
		playerLines.push(t.leaderboard.playerLine(
			playerLines.length + 1,
			player.gameName,
			player.tagLine,
			player.region,
			entry.currentRank!,
			entry.currentTier!,
			entry.currentLP!,
		));
	}
	if (playerLines.length === 0) {
		return null;
	}

	return new EmbedBuilder()
		.setTitle(t.leaderboardTitles[queueType])
		.setColor(QUEUE_COLORS[queueType])
		.setDescription(`${t.leaderboard.description}\n\n${playerLines.join("\n\n")}`)
		.setFooter({ text: t.leaderboard.total(playerLines.length) })
		.setTimestamp();
};
