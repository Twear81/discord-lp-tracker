import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction, InteractionContextType, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { deletePlayer, getServer, listAllPlayerForSpecificServer } from '../database/databaseHelper';
import { AppError, ErrorTypes } from '../error/error';
import { replyCommandError } from './commandError';
import { formatPlayerLabel, resolvePlayer, suggestPlayers } from './playerLookup';
import logger from '../logger/logger';

export const data = new SlashCommandBuilder()
	.setName('deleteplayer')
	.setContexts(InteractionContextType.Guild)
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
	.setDescription('Delete player to the watch list!')
	.addStringOption(option =>
		option.setName('player')
			.setDescription('The tracked player (name#tag)')
			.setRequired(true)
			.setAutocomplete(true)
	);

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
	try {
		const players = await listAllPlayerForSpecificServer(interaction.guildId as string);
		const suggestions = suggestPlayers(players, interaction.options.getFocused());
		await interaction.respond(suggestions.map(player => ({ name: formatPlayerLabel(player), value: String(player.id) })));
	} catch (error) {
		logger.error('Failed to autocomplete /deleteplayer:', error);
		await interaction.respond([]).catch(() => undefined);
	}
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	const serverId = interaction.guildId as string;
	const input = interaction.options.getString('player', true);
	logger.info(`Deleting a player for serverId: ${serverId}`);

	try {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		// Surfaces SERVER_NOT_INITIALIZE before looking the player up.
		await getServer(serverId);
		const player = resolvePlayer(await listAllPlayerForSpecificServer(serverId), input);
		if (!player) {
			throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, `No tracked player matches "${input}"`);
		}

		await deletePlayer(serverId, player.id);

		const label = formatPlayerLabel(player);
		await interaction.editReply({
			content: `The player "${label}" has been deleted.`
		});
		logger.info(`The player ${label} has been deleted for serverId: ${serverId}`);
	} catch (error: unknown) {
		await replyCommandError(interaction, error, 'Failed to delete the player, contact the dev', {
			[ErrorTypes.PLAYER_NOT_FOUND]: 'Player not found',
		});
	}
}
