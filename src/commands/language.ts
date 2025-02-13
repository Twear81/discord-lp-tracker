import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { updateLangServer } from '../database/databaseHelper';
import { ErrorTypes } from '../error/error';

export const data = new SlashCommandBuilder()
    .setName('language')
    .setDescription('Change the message language!')
    .addStringOption(option =>
        option.setName('lang')
            .setDescription('The language used by the bot')
            .setRequired(true)
            .addChoices(
                { name: 'fr', value: 'fr' },
                { name: 'en', value: 'en' }
            )
    );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
        const serverId = interaction.guildId as string;
        const lang = interaction.options.getString('lang', true);

        await updateLangServer(serverId, lang);

        await interaction.reply({
            content: `The bot has been set to "${lang}" language.`,
            flags: MessageFlags.Ephemeral,
        });
        console.log(`The language has been changed for serverId: ${serverId}`);
    } catch (error) {
        if (error.type === ErrorTypes.SERVER_NOT_INITIALIZE) {
            await interaction.reply({
                content: 'You have to init the bot first',
                flags: MessageFlags.Ephemeral,
            });
        } else {
            console.error('Failed to change the language:', error);
            await interaction.reply({
                content: 'Failed to change the language, contact the dev',
                flags: MessageFlags.Ephemeral,
            });
        }
    }
}
