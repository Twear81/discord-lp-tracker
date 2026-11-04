import { SlashCommandBuilder, ChatInputCommandInteraction, InteractionContextType, MessageFlags } from 'discord.js';
import { addPlayer, getServer, QueueRank } from '../database/databaseHelper';
import { AppError, ErrorTypes } from '../error/error';
import { replyCommandError } from './commandError';
import { getLastRankedLeagueMatch, getLastTFTMatch, getPlayerRankInfo, getSummonerByName, getTFTPlayerRankInfo, getTFTSummonerByName } from '../riot';
import { GameQueueType } from '../tracking/GameQueueType';
import logger from '../logger/logger';
import { REGION_CHOICES } from '../riot/region';

const API_ERROR_MESSAGE = 'The player was not found. Please check the name and tag.';
const GENERIC_ERROR_MESSAGE = 'Failed to add the player, contact the dev.';
const NOT_FOUND_ERROR = 'Not Found';

export const data = new SlashCommandBuilder()
	.setName('addplayer')
	.setContexts(InteractionContextType.Guild)
	.setDescription('Add player to the watch list!')
	.addStringOption(option =>
		option.setName('accountname')
			.setDescription('The account name')
			.setRequired(true)
	)
	.addStringOption(option =>
		option.setName('tag')
			.setDescription('The account tag (after the "#")')
			.setRequired(true)
	)
	.addStringOption(option =>
		option.setName('region')
			.setDescription('Region of the account')
			.setRequired(true)
			.addChoices(...REGION_CHOICES)
	);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	const serverId = interaction.guildId as string;
	logger.info(`Adding a player for serverId: ${serverId}`);
	const accountname = interaction.options.getString('accountname')!;
	const tag = interaction.options.getString('tag')!;
	const region = interaction.options.getString('region')!;
	try {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		// Surfaces SERVER_NOT_INITIALIZE before spending any Riot call.
		await getServer(serverId);

		// LoL and TFT account lookups hit different keys → fire in parallel.
		const [summoner, summonerTFT] = await Promise.all([
			getSummonerByName(accountname, tag, region),
			getTFTSummonerByName(accountname, tag, region),
		]);
		// `summonerTFT?.puuid` covers both the (rare) case of a malformed Riot
		// response where `summonerTFT` is null/undefined, and a puuid field
		// that came back as an empty string. The TS type of `summonerTFT` is
		// non-nullable but the runtime value is not formally guaranteed.
		if (!summoner.puuid || !summonerTFT?.puuid) {
			throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, NOT_FOUND_ERROR);
		}

		// Fetch everything before writing anything: a Riot failure must not
		// leave a player without lastGameID (the next cycle would announce an
		// old game as new).
		const [playerRankInfos, playerRankInfosTFT, leagueMatchIds, tftMatchIds] = await Promise.all([
			getPlayerRankInfo(summoner.puuid, region),
			getTFTPlayerRankInfo(summonerTFT.puuid, region),
			getLastRankedLeagueMatch(summoner.puuid, region),
			getLastTFTMatch(summonerTFT.puuid, region),
		]);

		const ranks: QueueRank[] = [];
		for (const rankInfo of [...playerRankInfos, ...playerRankInfosTFT]) {
			if (!(rankInfo.queueType in GameQueueType)) {
				logger.warn(`${rankInfo.queueType} was not a known queue type.`);
				continue;
			}
			ranks.push({
				queueType: GameQueueType[rankInfo.queueType as keyof typeof GameQueueType],
				leaguePoints: rankInfo.leaguePoints ?? 0,
				rank: rankInfo.rank ?? "",
				tier: rankInfo.tier ?? "Unranked",
			});
		}

		await addPlayer({
			serverId,
			puuid: summoner.puuid,
			tftpuuid: summonerTFT.puuid,
			gameName: summoner.gameName!,
			tagLine: summoner.tagLine!,
			region,
			lastGameID: leagueMatchIds[0] ?? null, // example -> EUW1_7294524077
			lastTFTGameID: tftMatchIds[0] ?? null,
		}, ranks);

		await interaction.editReply({
			content: `The player "${accountname}#${tag}" for region ${region} has been added.`
		});
		logger.info(`The player ${accountname}#${tag} has been added for serverId: ${serverId}`);
	} catch (error: unknown) {
		await replyCommandError(interaction, error, GENERIC_ERROR_MESSAGE, {
			[ErrorTypes.DATABASE_ALREADY_INSIDE]: 'Player already added',
			[ErrorTypes.PLAYER_NOT_FOUND]: API_ERROR_MESSAGE,
		});
	}
}
