import { ChannelType, SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { addOrUpdateServer } from '../database/databaseHelper';

export const data = new SlashCommandBuilder()
    .setName('init')
    .setDescription('Init the bot for your server!')
    .addChannelOption(option =>
        option.setName('channel')
            .setDescription('The channel to echo into')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
    )
    .addBooleanOption(option =>
        option.setName('flextoggle')
            .setDescription('Whether or not the flex games are tracked')
            .setRequired(true)
    )
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
        const serverId: string = interaction.guildId as string;
        const channel = interaction.options.getChannel('channel', true);
        const channelId: string = channel.id;
        const flexToggle: boolean = interaction.options.getBoolean('flextoggle', true);
        const lang: string = interaction.options.getString('lang', true);

        await addOrUpdateServer(serverId, channelId, flexToggle, lang);

        const flexMessage: string = flexToggle ? 'it will watch for flex game' : 'it will not watch for flex game';
        await interaction.reply({
            content: `The bot has been setup in ${channel.name}, ${flexMessage} and has been set to "${lang}" language.`,
            flags: MessageFlags.Ephemeral,
        });
        console.log(`Bot has been setup for serverId: ${serverId}`);
    } catch (error) {
        console.error('Failed to init :', error);
        await interaction.reply({
            content: 'Failed to init, contact the dev',
            flags: MessageFlags.Ephemeral,
        });
    }
}
