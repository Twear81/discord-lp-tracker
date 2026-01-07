import { SlashCommandBuilder, CommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { getServer, listAllPlayerForQueueInfoForSpecificServer, listAllPlayerForSpecificServer, PlayerForQueueInfo, PlayerInfo, sortPlayersByRank } from '../database/databaseHelper';
import { GameQueueType } from '../tracking/GameQueueType';
import logger from '../logger/logger';

export const data = new SlashCommandBuilder()
	.setName('leaderboard')
	.setDescription('Check who is the best from player watched!');

export async function execute(interaction: CommandInteraction): Promise<void> {
    const serverId = interaction.guildId as string;

    try {
        await interaction.deferReply({ ephemeral: true });
        
        const serverInfo = await getServer(serverId);
        const playerInfoList: PlayerInfo[] = await listAllPlayerForSpecificServer(serverId);

        // On définit l'ordre de priorité et la condition d'affichage pour CHAQUE type
        const allQueues = Object.values(GameQueueType);
        
        let hasAlreadySentAMessage = false;

        for (const queueType of allQueues) {
            // Logique de filtrage : on décide ce qu'on affiche
            const isRankedLoL = queueType === GameQueueType.RANKED_SOLO_5x5 || (queueType === GameQueueType.RANKED_FLEX_SR && serverInfo.flextoggle);
            const isRankedTFT = (queueType === GameQueueType.RANKED_TFT && serverInfo.tfttoggle) || (queueType === GameQueueType.RANKED_TFT_DOUBLE_UP && serverInfo.tftdoubletoggle);
            
            // Si tu veux TOUT afficher sans condition, tu peux juste garder : const shouldDisplay = true;
            // Ici, on affiche si c'est un mode classé activé OU si c'est un mode spécial (ARAM, Arena, etc.)
            const isSpecialMode = [
                GameQueueType.ARAM, 
                GameQueueType.ARENA, 
                GameQueueType.URF, 
                GameQueueType.NORMAL_QUICKPLAY
            ].includes(queueType);

            if (isRankedLoL || isRankedTFT || isSpecialMode) {
                const playersForQueue = await listAllPlayerForQueueInfoForSpecificServer(serverId, queueType);
                
                // On n'affiche le message que s'il y a au moins un joueur classé dans cette file
                if (playersForQueue.length > 0) {
                    const sortedPlayers = sortPlayersByRank(playersForQueue);
                    
                    await generateLeaderboardMessage(
                        interaction, 
                        serverInfo.lang, 
                        playerInfoList, 
                        sortedPlayers, 
                        queueType, 
                        hasAlreadySentAMessage
                    );
                    
                    hasAlreadySentAMessage = true;
                }
            }
        }

        if (!hasAlreadySentAMessage) {
            await interaction.followUp({
                content: serverInfo.lang === 'fr' ? "Aucune donnée disponible pour les leaderboards." : "No data available for leaderboards.",
                flags: MessageFlags.Ephemeral
            });
        }

        logger.info(`Leaderboards delivered for server ${serverId}`);

    } catch (error) {
        logger.error('Failed to display the leaderboard:', error);        
        const errorMessage = "An error occurred while generating leaderboards.";
        
        if (interaction.deferred || interaction.replied) {
            await interaction.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
        }
    }
}

const generateLeaderboardMessage = async (interaction: CommandInteraction, lang: string, playersInfos: PlayerInfo[], sortedPlayerForQueueInfos: PlayerForQueueInfo[], queueType: GameQueueType, isSecondMessage: boolean) => {
	const rankEmojis: Record<string, string> = {
		"IRON": "⬛",
		"BRONZE": "🟫",
		"SILVER": "⬜",
		"GOLD": "🟨",
		"PLATINUM": "🟩",
		"EMERALD": "💚",
		"DIAMOND": "🔷",
		"MASTER": "🟣",
		"GRANDMASTER": "🔴",
		"CHALLENGER": "👑"
	};

	const titleMapFR: Record<GameQueueType, string> = {
		// --- Standard Modes (LoL) ---
		[GameQueueType.NORMAL_QUICKPLAY]: "⚔️ Partie Rapide",
		[GameQueueType.NORMAL_DRAFT_5x5]: "⚔️ Draft Normale",
		[GameQueueType.RANKED_SOLO_5x5]: "🏆 Classement SoloQ",
		[GameQueueType.RANKED_FLEX_SR]: "🏆 Classement FlexQ",
		
		// --- Special Modes (LoL) ---
		[GameQueueType.ARAM]: "🎲 ARAM",
		[GameQueueType.ARENA]: "🏟️ Arena",
		[GameQueueType.URF]: "🔥 URF",
		[GameQueueType.ALL_FOR_ONE]: "👥 Un pour Tous",

		// --- TFT Modes ---
		[GameQueueType.NORMAL_TFT]: "🧩 TFT Normal",
		[GameQueueType.RANKED_TFT]: "🏆 Classement TFT",
		[GameQueueType.TFT_TUTORIAL]: "📖 Tutoriel TFT",
		[GameQueueType.TFT_HYPER_ROLL]: "⚡ TFT Hyper Roll",
		[GameQueueType.TFT_DOUBLE_UP_NORMAL]: "👥 TFT Double Up",
		[GameQueueType.RANKED_TFT_DOUBLE_UP]: "🏆 Classement TFT Double",
		[GameQueueType.TFT_FORTUNES_FAVOR]: "💰 TFT Faveur de la Fortune",
		[GameQueueType.TFT_CHONCCS_TREASURE]: "💎 TFT Trésor de Choncc",
		[GameQueueType.TFT_SET_REVIVAL]: "⏳ TFT Retour aux Sources",

		// --- Co-op vs AI ---
		[GameQueueType.BOT_INTRO]: "🤖 IA : Introduction",
		[GameQueueType.BOT_BEGINNER]: "🤖 IA : Débutant",
		[GameQueueType.BOT_INTERMEDIATE]: "🤖 IA : Intermédiaire"
	};

	const titleMapEN: Record<GameQueueType, string> = {
		// --- Standard Modes (LoL) ---
		[GameQueueType.NORMAL_QUICKPLAY]: "⚔️ Quickplay",
		[GameQueueType.NORMAL_DRAFT_5x5]: "⚔️ Normal Draft",
		[GameQueueType.RANKED_SOLO_5x5]: "🏆 SoloQ Leaderboard",
		[GameQueueType.RANKED_FLEX_SR]: "🏆 FlexQ Leaderboard",
		
		// --- Special Modes (LoL) ---
		[GameQueueType.ARAM]: "🎲 ARAM",
		[GameQueueType.ARENA]: "🏟️ Arena",
		[GameQueueType.URF]: "🔥 URF",
		[GameQueueType.ALL_FOR_ONE]: "👥 One for All",

		// --- TFT Modes ---
		[GameQueueType.NORMAL_TFT]: "🧩 TFT Normal",
		[GameQueueType.RANKED_TFT]: "🏆 TFT Leaderboard",
		[GameQueueType.TFT_TUTORIAL]: "📖 TFT Tutorial",
		[GameQueueType.TFT_HYPER_ROLL]: "⚡ TFT Hyper Roll",
		[GameQueueType.TFT_DOUBLE_UP_NORMAL]: "👥 TFT Double Up",
		[GameQueueType.RANKED_TFT_DOUBLE_UP]: "🏆 TFT Double Leaderboard",
		[GameQueueType.TFT_FORTUNES_FAVOR]: "💰 TFT Fortune's Favor",
		[GameQueueType.TFT_CHONCCS_TREASURE]: "💎 TFT Choncc's Treasure",
		[GameQueueType.TFT_SET_REVIVAL]: "⏳ TFT Set Revival",

		// --- Co-op vs AI ---
		[GameQueueType.BOT_INTRO]: "🤖 Co-op vs. AI: Intro",
		[GameQueueType.BOT_BEGINNER]: "🤖 Co-op vs. AI: Beginner",
		[GameQueueType.BOT_INTERMEDIATE]: "🤖 Co-op vs. AI: Intermediate"
	};

	const translations = {
		fr: {
			title: titleMapFR[queueType],
			description: "Voici les joueurs classés du plus fort au plus faible :",
			playerLine: (index: number, name: string, tag: string, region: string, rank: string, tier: string, lp: number) =>
				`**#${index}** **${name}#${tag}**\n🌍 **Région:** ${region} |  **Rang:** ${rankEmojis[tier] || "🏅"} ${tier} ${rank} | 🔥 **LP:** ${lp}`,
			total: (count: number) => `Total: ${count} joueur(s) classés`,
			noPlayers: "📭 Aucun joueur classé pour le moment !"
		},
		en: {
			title: titleMapEN[queueType],
			description: "Here are the players ranked from strongest to weakest:",
			playerLine: (index: number, name: string, tag: string, region: string, rank: string, tier: string, lp: number) =>
				`**#${index}** **${name}#${tag}**\n🌍 **Region:** ${region} | **Rank:** ${rankEmojis[tier] || "🏅"} ${tier} ${rank} | 🔥 **LP:** ${lp}`,
			total: (count: number) => `Total: ${count} ranked players`,
			noPlayers: "📭 No ranked players at the moment!"
		}
	};

	const t = translations[lang as keyof typeof translations];

	if (sortedPlayerForQueueInfos.length === 0) {
		return interaction.reply({ content: t.noPlayers, ephemeral: true });
	}

	enum QueueColor {
		// --- Standard LoL ---
		RANKED_SOLO_5x5 = 0x0099FF,    // Bleu classique SoloQ
		RANKED_FLEX_SR = 0xFFD700,     // Or/Jaune pour la Flex
		NORMAL_QUICKPLAY = 0x1ABC9C,   // Turquoise (Calme/Normal)
		NORMAL_DRAFT_5x5 = 0x2ECC71,   // Vert émeraude

		// --- Special LoL ---
		ARAM = 0x95A5A6,               // Gris/Bleu acier (Abîme Hurlant)
		ARENA = 0xFF4500,              // Orange/Rouge (Combat intense)
		URF = 0xFF00FF,                // Magenta (Chaos/Fun)
		ALL_FOR_ONE = 0xE67E22,        // Carotte

		// --- TFT ---
		RANKED_TFT = 0x8A2BE2,         // Violet royal
		NORMAL_TFT = 0x9B59B6,         // Améthyste
		RANKED_TFT_DOUBLE_UP = 0xFF69B4, // Rose (Duo/Amitié)
		TFT_HYPER_ROLL = 0xF1C40F,     // Jaune vif (Rapidité)
		TFT_CHONCCS_TREASURE = 0x00FF7F, // Vert printemps
		TFT_SET_REVIVAL = 0x34495E,    // Bleu nuit (Nostalgie)

		// --- Bots / IA ---
		BOT_INTRO = 0xBDC3C7,          // Argent clair
		BOT_BEGINNER = 0x7F8C8D,       // Gris moyen
		BOT_INTERMEDIATE = 0x2C3E50    // Gris foncé
	}

	const messageToDisplay = new EmbedBuilder()
		.setTitle(t.title)
		.setColor(QueueColor[queueType as keyof typeof QueueColor] || 0xFFFFFF) // default to white
		.setDescription(
			`${t.description}\n\n` +
			sortedPlayerForQueueInfos.map((player, index) =>
				t.playerLine(
					index + 1,
					playersInfos.find((value: PlayerInfo) => value.id == player.playerId)!.gameName,
					playersInfos.find((value: PlayerInfo) => value.id == player.playerId)!.tagLine,
					playersInfos.find((value: PlayerInfo) => value.id == player.playerId)!.region,
					player.currentRank!,
					player.currentTier!,
					player.currentLP!
				)
			).join("\n\n")
		)
		.setFooter({ text: t.total(sortedPlayerForQueueInfos.length) })
		.setTimestamp();

	if (isSecondMessage == true) {
		await interaction.followUp({
			embeds: [messageToDisplay],
			flags: MessageFlags.Ephemeral,
		});
	} else {
		await interaction.reply({
			embeds: [messageToDisplay],
			flags: MessageFlags.Ephemeral,
		});
	}
	
} 