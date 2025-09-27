import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { addPlayer, getPlayerForSpecificServer, getServer, updatePlayerInfoCurrentAndLastForQueueType, updatePlayerLastGameId } from '../database/databaseHelper';
import { AppError, ErrorTypes } from '../error/error';
import { getLastRankedLeagueMatch, getLastTFTMatch, getPlayerRankInfo, getSummonerByName, getTFTPlayerRankInfo, getTFTSummonerByName } from '../riot/riotHelper';
import { GameQueueType, ManagedGameQueueType } from '../tracking/GameQueueType';
import logger from '../logger/logger';

const API_ERROR_MESSAGE = 'The player was not found. Please check the name and tag.';
const GENERIC_ERROR_MESSAGE = 'Failed to add the player, contact the dev.';
const NOT_FOUND_ERROR = 'Not Found';

export const data = new SlashCommandBuilder()
	.setName('addplayer')
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
			.addChoices(
				{ name: 'EUW', value: 'EUW' },
				{ name: 'NA', value: 'NA' }
			)
	);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	const serverId = interaction.guildId as string;
	logger.info(`Adding a player for serverId: ${serverId}`);
	const accountname = interaction.options.getString('accountname')!;
	const tag = interaction.options.getString('tag')!;
	const region = interaction.options.getString('region')!;
	try {
		await interaction.deferReply({ ephemeral: true });

		const serverInfo = await getServer(serverId);

		const summoner = await getSummonerByName(accountname, tag, region);
		const summonerTFT = await getTFTSummonerByName(accountname, tag, region);
		if (!summoner.puuid || !summonerTFT) {
			throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, NOT_FOUND_ERROR);
		}
		
		await addPlayer(serverId, summoner.puuid, summonerTFT.puuid, summoner.gameName!, summoner.tagLine!, region);

		const playerRankInfos = await getPlayerRankInfo(summoner.puuid, region);
		const playerRankInfosTFT = await getTFTPlayerRankInfo(summonerTFT.puuid, region);

		const currentPlayer = await getPlayerForSpecificServer(serverId, summoner.puuid);
		for (const playerRankStat of playerRankInfos) {
			if (playerRankStat.queueType in GameQueueType) {
				await updatePlayerInfoCurrentAndLastForQueueType(serverId, currentPlayer, GameQueueType[playerRankStat.queueType as keyof typeof GameQueueType], playerRankStat.leaguePoints, playerRankStat.rank, playerRankStat.tier);
			} else {
				logger.warn(playerRankStat.queueType + ' was not a know queue type.');
			}
		}
		// TFT
		for (const playerRankStat of playerRankInfosTFT) {
			if (playerRankStat.queueType in GameQueueType) {
				await updatePlayerInfoCurrentAndLastForQueueType(serverId, currentPlayer, GameQueueType[playerRankStat.queueType as keyof typeof GameQueueType], playerRankStat.leaguePoints || 0, playerRankStat.rank || "", playerRankStat.tier || "Unranked");
			} else {
				logger.warn(playerRankStat.queueType + ' was not a know queue type.');
			}
		}

		// Get its last ranked league game
		const leagueMatchIds = await getLastRankedLeagueMatch(currentPlayer.puuid, currentPlayer.region, serverInfo.flextoggle);
		const currentLeagueGameIdWithRegion = leagueMatchIds[0]; // example -> EUW1_7294524077
		// Update last game inside database
		await updatePlayerLastGameId(serverId, currentPlayer.puuid, currentLeagueGameIdWithRegion, ManagedGameQueueType.LEAGUE);
		// Get its last tft game
		const tftMatchIds = await getLastTFTMatch(currentPlayer.tftpuuid, currentPlayer.region);
		const currentTFTGameIdWithRegion = tftMatchIds[0]; // example -> EUW1_7294524077
		// Update last game inside database
		await updatePlayerLastGameId(serverId, currentPlayer.tftpuuid, currentTFTGameIdWithRegion, ManagedGameQueueType.TFT);

		await interaction.editReply({
			content: `The player "${accountname}#${tag}" for region ${region} has been added.`
		});
		logger.info(`The player ${accountname}#${tag} has been added for serverId: ${serverId}`);
	} catch (error: unknown) {
		let content: string;

		if (error instanceof AppError) {
			switch (error.type) {
				case ErrorTypes.SERVER_NOT_INITIALIZE:
					content = 'You have to init the bot first';
					break;
				case ErrorTypes.DATABASE_ALREADY_INSIDE:
					content = 'Player already added';
					break;
				case ErrorTypes.PLAYER_NOT_FOUND:
					content = API_ERROR_MESSAGE;
					break;
				default:
					content = GENERIC_ERROR_MESSAGE;
					logger.error('Failed to add the player:', error);
					break;
			}
		} else {
			content = GENERIC_ERROR_MESSAGE;
			logger.error('Failed to add the player:', error);
		}

		await interaction.editReply({ content });
	}
}