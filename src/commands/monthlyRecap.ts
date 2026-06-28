import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags, SlashCommandIntegerOption } from 'discord.js';
import { getLangServer } from '../database/databaseHelper';
import { generateMonthlyRecap } from '../tracking/monthlyRecap';
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
    const lang: string = await getLangServer(serverId);
    try {

		const month = interaction.options.getInteger('month')!;
		const year = interaction.options.getInteger('year')!;

		// Validate month and year
		const currentDate = new Date();
		const currentYear = currentDate.getFullYear();
		const currentMonth = currentDate.getMonth() + 1;

		if (year > currentYear || (year === currentYear && month > currentMonth)) {
			const errorMessage = lang === 'fr'
				? '❌ Vous ne pouvez pas générer un récapitulatif pour le futur !'
				: '❌ You cannot generate a recap for the future!';
			await interaction.reply({
				content: errorMessage,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		logger.info(`📊 Generating monthly recap for ${month}/${year} on server ${serverId}`);

		await generateMonthlyRecap(month, year, serverId);

		const successMessage = lang === 'fr'
			? `✅ Récapitulatif mensuel pour ${month}/${year} généré avec succès !`
			: `✅ Monthly recap for ${month}/${year} generated successfully!`;

		await interaction.editReply({
			content: successMessage,
		});

		logger.info(`✅ Monthly recap for ${month}/${year} sent successfully.`);
	} catch (error) {
		logger.error('❌ Failed to generate monthly recap:', error);
		const errorMessage = lang === 'fr'
			? '❌ Échec de la génération du récapitulatif mensuel. Contactez le développeur.'
			: '❌ Failed to generate monthly recap. Contact the developer.';
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
