import { SlashCommandBuilder, MessageFlags, ChatInputCommandInteraction } from 'discord.js';
import { addPlayer } from '../database/databaseHelper';
import { ErrorTypes } from '../error/error';

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

		await addPlayer(serverId, accountname, tag, region);

		await interaction.reply({
			content: `The player "${accountname}#${tag}" for region ${region} has been added.`,
			flags: MessageFlags.Ephemeral,
		});
		console.log(`The player ${accountname}#${tag} has been added for serverId: ${serverId}`);
	} catch (error) {
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
		} else {
			console.error('Failed to add the player:', error);
			await interaction.reply({
				content: 'Failed to add the player, contact the dev',
				flags: MessageFlags.Ephemeral,
			});
		}
	}
}
