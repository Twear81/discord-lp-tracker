import { SlashCommandBuilder, MessageFlags, ChatInputCommandInteraction } from 'discord.js';
import { addPlayer, getPlayerForSpecificServer, updatePlayerInfo } from '../database/databaseHelper';
import { AppError, ErrorTypes } from '../error/error';
import { getPlayerRankInfo, getSummonerByName } from '../riot/riotHelper';

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

		const summoner = await getSummonerByName(accountname, tag, region);
		const playerRankInfos = await getPlayerRankInfo(summoner.puuid, region);
		
		await addPlayer(serverId, summoner.puuid, accountname, tag, region);
		const currentPlayer = await getPlayerForSpecificServer(serverId, summoner.puuid);
		for (const playerRankStat of playerRankInfos) {
			await updatePlayerInfo(serverId, currentPlayer, playerRankStat.queueType, playerRankStat.leaguePoints, playerRankStat.rank, playerRankStat.tier);
		}
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