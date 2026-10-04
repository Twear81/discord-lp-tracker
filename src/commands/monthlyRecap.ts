import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags, SlashCommandIntegerOption } from 'discord.js';
import { getLangServer } from '../database/databaseHelper';
import { generateMonthlyRecap } from '../tracking/monthlyRecap';
import { getTranslations } from '../translation/translation';
import logger from '../logger/logger';

export const data = new SlashCommandBuilder()
	.setName('monthlyrecap')
	.setDescription('Generate a monthly recap of all tracked players')
	.addIntegerOption((option: SlashCommandIntegerOption) =>
		option
			.setName('month')
			.setDescription('The month number (1-12)')
			.setRequired(true)
			.setMinValue(1)
			.setMaxValue(12)
	)
	.addIntegerOption((option: SlashCommandIntegerOption) =>
		option
			.setName('year')
			.setDescription('The year')
			.setRequired(true)
	);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const serverId = interaction.guildId as string;
    let lang: string = 'en';
    let t = getTranslations(lang);
    try {
        lang = await getLangServer(serverId);
        t = getTranslations(lang);

		const month = interaction.options.getInteger('month')!;
		const year = interaction.options.getInteger('year')!;

		// Validate month and year
		const currentDate = new Date();
		const currentYear = currentDate.getFullYear();
		const currentMonth = currentDate.getMonth() + 1;

		if (year > currentYear || (year === currentYear && month > currentMonth)) {
			await interaction.reply({
				content: t.monthlyRecapCommand.futureError,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		logger.info(`📊 Generating monthly recap for ${month}/${year} on server ${serverId}`);

		await generateMonthlyRecap(month, year, serverId);

		await interaction.editReply({
			content: t.monthlyRecapCommand.success(month, year),
		});

		logger.info(`✅ Monthly recap for ${month}/${year} sent successfully.`);
	} catch (error) {
		logger.error('❌ Failed to generate monthly recap:', error);
		const errorMessage = t.monthlyRecapCommand.failure;
		try {
			if (interaction.deferred || interaction.replied) {
				await interaction.followUp({
					content: errorMessage,
					flags: MessageFlags.Ephemeral,
				});
			} else {
				await interaction.reply({
					content: errorMessage,
					flags: MessageFlags.Ephemeral,
				});
			}
		} catch (followUpError) {
			logger.error('❌ Failed to send error reply:', followUpError);
		}
	}
}
