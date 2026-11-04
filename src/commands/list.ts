import { SlashCommandBuilder, MessageFlags, EmbedBuilder, ChatInputCommandInteraction, InteractionContextType } from 'discord.js';
import { getServer, listAllPlayerForSpecificServer, PlayerInfo } from '../database/databaseHelper';
import { getCommandLang, replyCommandError } from './commandError';
import { getTranslations } from '../translation/translation';
import logger from '../logger/logger';
import { EMBED_LIMITS, paginateLines } from '../tracking/embedPages';

export const data = new SlashCommandBuilder()
	.setName('list')
	.setContexts(InteractionContextType.Guild)
	.setDescription('List all players watched!');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	const serverId = interaction.guildId as string;
	const translations = getTranslations(await getCommandLang(serverId));
	try {
		// Surfaces SERVER_NOT_INITIALIZE.
		await getServer(serverId);
		const accountNameTagPlayerList: PlayerInfo[] = await listAllPlayerForSpecificServer(serverId);

		const t = translations.list;

		if (accountNameTagPlayerList.length === 0) {
			await interaction.reply({
				content: t.noPlayers,
				flags: MessageFlags.Ephemeral,
			})
		} else {
			const intro = `${t.description}\n\n`;
			const lines = accountNameTagPlayerList.map((acc, index) => t.playerLine(index + 1, `${acc.gameName}#${acc.tagLine}`, acc.region));
			// A long list is split over several embeds, one message each.
			const embeds = paginateLines(lines, "\n\n", EMBED_LIMITS.description - intro.length).map(page => new EmbedBuilder()
				.setTitle(t.title)
				.setColor(0x0099FF)
				.setDescription(`${intro}${page}`)
				.setFooter({ text: t.total(accountNameTagPlayerList.length) })
				.setTimestamp());

			const [first, ...rest] = embeds;
			await interaction.reply({
				embeds: [first],
				flags: MessageFlags.Ephemeral,
			});
			for (const embed of rest) {
				await interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
			}
		}
		logger.info('The list has been demanded');
	} catch (error) {
		await replyCommandError(interaction, error, translations);
	}
}
