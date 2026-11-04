import { CommandInteraction, MessageFlags } from 'discord.js';
import { getLangServer } from '../database/databaseHelper';
import { AppError, ErrorType, ErrorTypes } from '../error/error';
import { GameTranslations } from '../translation/translation';
import logger from '../logger/logger';

const DEFAULT_LANG = 'en';

// Language to answer a command in: the server's, or English when the server
// isn't set up yet (or the lookup fails). Never throws.
export const getCommandLang = (serverId: string | null): Promise<string> =>
	serverId ? getLangServer(serverId).catch(() => DEFAULT_LANG) : Promise.resolve(DEFAULT_LANG);

/**
 * Single error path for the slash commands.
 *
 * Known AppError types are mapped to a user-facing message (SERVER_NOT_INITIALIZE
 * is always handled); anything else is logged and answered with
 * `fallbackMessage` (a generic translated error by default). The reply adapts
 * to the interaction state (fresh, deferred or already answered) so the user
 * is never left with "The application did not respond".
 */
export async function replyCommandError(
	interaction: CommandInteraction,
	error: unknown,
	t: GameTranslations,
	knownErrors: Partial<Record<ErrorType, string>> = {},
	fallbackMessage: string = t.commands.unexpectedError,
): Promise<void> {
	const messages: Partial<Record<ErrorType, string>> = {
		[ErrorTypes.SERVER_NOT_INITIALIZE]: t.commands.initRequired,
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
