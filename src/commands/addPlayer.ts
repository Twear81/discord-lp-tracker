import { SlashCommandBuilder, MessageFlags, ChatInputCommandInteraction } from 'discord.js';
import { addPlayer, getPlayerForSpecificServer, getServer, updatePlayerInfoCurrentAndLastForQueueType, updatePlayerLastGameId } from '../database/databaseHelper';
import { AppError, ErrorTypes } from '../error/error';
import { getLastRankedLeagueMatch, getLastTFTMatch, getPlayerRankInfo, getSummonerByName, getTFTPlayerRankInfo, getTFTSummonerByName } from '../riot/riotHelper';
import { GameQueueType, ManagedGameQueueType } from '../tracking/GameQueueType';

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
	try {
		const serverId = interaction.guildId as string;
		console.log(`Adding a player for serverId: ${serverId}`);
		const accountname = interaction.options.getString('accountname')!;
		const tag = interaction.options.getString('tag')!;
		const region = interaction.options.getString('region')!;

		const serverInfo = await getServer(serverId);

		const summoner = await getSummonerByName(accountname, tag, region);
		const playerRankInfos = await getPlayerRankInfo(summoner.puuid, region);
		const summonerTFT = await getTFTSummonerByName(accountname, tag, region);
		const playerRankInfosTFT = await getTFTPlayerRankInfo(summonerTFT.puuid, region);

		await addPlayer(serverId, summoner.puuid, summonerTFT.puuid, summoner.gameName!, summoner.tagLine!, region);
		const currentPlayer = await getPlayerForSpecificServer(serverId, summoner.puuid);
		for (const playerRankStat of playerRankInfos) {
			if (playerRankStat.queueType in GameQueueType) {
				await updatePlayerInfoCurrentAndLastForQueueType(serverId, currentPlayer, GameQueueType[playerRankStat.queueType as keyof typeof GameQueueType], playerRankStat.leaguePoints, playerRankStat.rank, playerRankStat.tier);
			} else {
				console.warn(playerRankStat.queueType + ' was not a know queue type.');
			}
		}
		// TFT
		for (const playerRankStat of playerRankInfosTFT) {
			if (playerRankStat.queueType in GameQueueType) {
				await updatePlayerInfoCurrentAndLastForQueueType(serverId, currentPlayer, GameQueueType[playerRankStat.queueType as keyof typeof GameQueueType], playerRankStat.leaguePoints || 0, playerRankStat.rank || "", playerRankStat.tier || "Unranked");
			} else {
				console.warn(playerRankStat.queueType + ' was not a know queue type.');
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

		await interaction.reply({
			content: `The player "${accountname}#${tag}" for region ${region} has been added.`,
			flags: MessageFlags.Ephemeral,
		});
		console.log(`The player ${accountname}#${tag} has been added for serverId: ${serverId}`);
	} catch (error: unknown) {
		if (error instanceof AppError) {
			// Inside this block, err is known to be a ValidationError
			if (error.type === ErrorTypes.SERVER_NOT_INITIALIZE) {
				await interaction.reply({
					content: 'You have to init the bot first',
					flags: MessageFlags.Ephemeral,
				});
			} else if (error.type === ErrorTypes.DATABASE_ALREADY_INSIDE) {
				await interaction.reply({
					content: 'Player already added',
					flags: MessageFlags.Ephemeral,
				});
			} else if (error.type === ErrorTypes.PLAYER_NOT_FOUND) {
				await interaction.reply({
					content: 'Player not found',
					flags: MessageFlags.Ephemeral,
				});
			}
		} else {
			console.error('Failed to add the player:', error);
			await interaction.reply({
				content: 'Failed to add the player, contact the dev',
				flags: MessageFlags.Ephemeral,
			});
		}
	}
}