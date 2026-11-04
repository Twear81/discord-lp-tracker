import { CommandInteraction, MessageFlags } from 'discord.js';
import { AppError, ErrorType, ErrorTypes } from '../error/error';
import logger from '../logger/logger';

export const INIT_REQUIRED_MESSAGE = 'You have to init the bot first';

/**
 * Single error path for the slash commands.
 *
 * Known AppError types are mapped to a user-facing message (SERVER_NOT_INITIALIZE
 * is always handled); anything else is logged and answered with
 * `fallbackMessage`. The reply adapts to the interaction state (fresh, deferred
 * or already answered) so the user is never left with "The application did
 * not respond".
 */
export async function replyCommandError(
	interaction: CommandInteraction,
	error: unknown,
	fallbackMessage: string,
	knownErrors: Partial<Record<ErrorType, string>> = {},
): Promise<void> {
	const messages: Partial<Record<ErrorType, string>> = {
		[ErrorTypes.SERVER_NOT_INITIALIZE]: INIT_REQUIRED_MESSAGE,
		...knownErrors,
	};
	const knownMessage = error instanceof AppError ? messages[error.type] : undefined;
	if (knownMessage === undefined) {
		logger.error(`❌ /${interaction.commandName} failed:`, error);
	}
	const content = knownMessage ?? fallbackMessage;

	try {
		if (interaction.replied) {
			await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
		} else if (interaction.deferred) {
			await interaction.editReply({ content });
		} else {
			await interaction.reply({ content, flags: MessageFlags.Ephemeral });
		}
	} catch (replyError) {
		// Interaction token expired or already acknowledged elsewhere.
		logger.error(`❌ /${interaction.commandName}: failed to send the error reply:`, replyError);
	}
}
