import { GameQueueType } from "../tracking/GameQueueType";

// Emoji par tier, partagé par les implémentations fr/en de leaderboard.playerLine.
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

export interface LeaderboardTranslations {
    description: string;
    playerLine: (index: number, name: string, tag: string, region: string, rank: string, tier: string, lp: number) => string;
    total: (count: number) => string;
    noPlayers: string;
}

export interface ListTranslations {
    title: string;
    description: string;
    playerLine: (index: number, name: string, region: string) => string;
    total: (count: number) => string;
    noPlayers: string;
}

export interface MonthlyRecapCommandTranslations {
    futureError: string;
    success: (month: number, year: number) => string;
    failure: string;
}

export interface CommandTranslations {
    initRequired: string;
    unexpectedError: string;
    init: (channelName: string, flexTracked: boolean, tftTracked: boolean) => string;
    addPlayer: {
        added: (riotId: string, region: string) => string;
        alreadyAdded: string;
        notFound: string;
    };
    deletePlayer: {
        deleted: (label: string) => string;
        notFound: string;
    };
    flexToggle: (enabled: boolean) => string;
    tftToggle: (enabled: boolean) => string;
    languageChanged: string;
}

export interface HelpTranslations {
    title: string;
    description: string;
}

export interface GameTranslations {
    // Commun
    title: string;
    lpChange: (lp: number) => string;
    recapTitles: Record<GameQueueType, string>;
    monthlyRecapTitles: Record<GameQueueType, string>;
    league: string;
    wins: string;
    losses: string;
    win: string;
    loss: string;
    games: string;
    winrate: string;

    // League of Legends
    kda: string;
    time: string;
    score: string;
    csPerMin: string;
    totalCs: string;
    pings: string;
    damage: string;
    visionPerMin: string;
    teamRank: string;
    avgTeamRank: string;
    queue: string;
    queueTypeSolo: string;
    queueTypeFlex: string;
    queueTypeClash: string;
    queueType5v5: string;

    // Teamfight Tactics (TFT)
    placement: string;
    level: string;
    round: string;
    eliminated: string;
    mainTraits: string;
    queueTypeTFT: string;
    queueTypeTFTDouble: string;
    goldLeft: string;
    avgPlacement: string;

    // Commandes (/leaderboard, /list, /monthlyrecap)
    leaderboardTitles: Record<GameQueueType, string>;
    leaderboard: LeaderboardTranslations;
    list: ListTranslations;
    monthlyRecapCommand: MonthlyRecapCommandTranslations;
    help: HelpTranslations;
    commands: CommandTranslations;

    // Récap mensuel
    monthlyStats: string;
    monthNames: readonly string[];
}

const allTranslations = {
    fr: {
        // Commun
        title: "[📜 Résultat de partie ⚔️]",
        lpChange: (lp: number) => lp >= 0 ? "Gain de" : "Perte de",
        recapTitles: {
            [GameQueueType.RANKED_SOLO_5x5]: "[📈 Résumé Quotidien SoloQ]",
            [GameQueueType.RANKED_FLEX_SR]: "[📊 Résumé Quotidien Flex]",
            [GameQueueType.RANKED_CLASH]: "[⚔️ Résumé Quotidien Clash]",
            [GameQueueType.RANKED_5v5]: "[🎯 Résumé Quotidien 5v5]",
            [GameQueueType.RANKED_TFT]: "[📜 Résumé Quotidien TFT]",
            [GameQueueType.RANKED_TFT_DOUBLE_UP]: "[🤝 Résumé Quotidien TFT Double]"
        },
        monthlyRecapTitles: {
            [GameQueueType.RANKED_SOLO_5x5]: "[📜 Résumé Mensuel SoloQ]",
            [GameQueueType.RANKED_FLEX_SR]: "[📜 Résumé Mensuel Flex]",
            [GameQueueType.RANKED_CLASH]: "[📜 Résumé Mensuel Clash]",
            [GameQueueType.RANKED_5v5]: "[📜 Résumé Mensuel 5v5]",
            [GameQueueType.RANKED_TFT]: "[📜 Résumé Mensuel TFT]",
            [GameQueueType.RANKED_TFT_DOUBLE_UP]: "[📜 Résumé Mensuel TFT Double]"
        },
        league: "LP",
        wins: "Victoires",
        losses: "Défaites",
        win: "Victoire",
        loss: "Défaite",
        games: "Parties",
        winrate: "Winrate",

        // LoL (avec les emojis)
        kda: "⚔️ KDA",
        time: "⏱️ Durée",
        score: "⭐ Score",
        csPerMin: "🌾 CS/m",
        totalCs: "🌾 CS",
        pings: "🔔 Pings",
        damage: "💥 Dégâts",
        visionPerMin: "👁️ Vision/m",
        teamRank: "🤝 Rang d'équipe",
        avgTeamRank: "🤝 Rang d'équipe moyen",
        queue: "🗺️ Queue",
        queueTypeSolo: "Solo/Duo",
        queueTypeFlex: "Flex",
        queueTypeClash: "Clash",
        queueType5v5: "Classé 5v5",

        // TFT (avec les emojis)
        placement: "🏆 Placement",
        level: "🌟 Niveau",
        round: "⏳ Round",
        eliminated: "💀 Joueurs Éliminés",
        mainTraits: "✨ Traits Principaux",
        queueTypeTFT: "TFT Classé",
        queueTypeTFTDouble: "TFT Double Classé",
        goldLeft: "💰 Or Restant",
        avgPlacement: "🏆 Placement moyen",

        // Commandes
        leaderboardTitles: {
            [GameQueueType.RANKED_SOLO_5x5]: "🏆 Classement SoloQ",
            [GameQueueType.RANKED_FLEX_SR]: "🏆 Classement FlexQ",
            [GameQueueType.RANKED_CLASH]: "🏆 Classement Clash",
            [GameQueueType.RANKED_5v5]: "🏆 Classement 5v5",
            [GameQueueType.RANKED_TFT]: "🏆 Classement TFT",
            [GameQueueType.RANKED_TFT_DOUBLE_UP]: "🏆 Classement TFT Double",
        },
        leaderboard: {
            description: "Voici les joueurs classés du plus fort au plus faible :",
            playerLine: (index: number, name: string, tag: string, region: string, rank: string, tier: string, lp: number) =>
                `**#${index}** **${name}#${tag}**\n🌍 **Région:** ${region} |  **Rang:** ${rankEmojis[tier] || "🏅"} ${tier} ${rank} | 🔥 **LP:** ${lp}`,
            total: (count: number) => `Total: ${count} joueur(s) classés`,
            noPlayers: "📭 Aucun joueur classé pour le moment !",
        },
        list: {
            title: "📋 Liste des joueurs suivis",
            description: "Voici la liste des joueurs actuellement suivis :",
            playerLine: (index: number, name: string, region: string) => `**${index}.** 🎮 **${name}**\n🌍 Région: **${region}**`,
            total: (count: number) => `Total: ${count} joueur(s)`,
            noPlayers: "📭 Aucun joueur n'est suivi pour le moment !",
        },
        monthlyRecapCommand: {
            futureError: "❌ Vous ne pouvez pas générer un récapitulatif pour le futur !",
            success: (month: number, year: number) => `✅ Récapitulatif mensuel pour ${month}/${year} généré avec succès !`,
            failure: "❌ Échec de la génération du récapitulatif mensuel. Contactez le développeur.",
        },
        help: {
            title: "📌 Guide d'utilisation du Bot",
            description: [
                "Bienvenue ! Voici les commandes pour bien utiliser le bot :",
                "",
                "🔹 **Initialisation**",
                "➜ `/init` : Initialise le bot pour votre serveur (salon, suivi Flex/TFT, langue).",
                "",
                "🔹 **Ajout de joueurs**",
                "➜ `/addplayer accountname:<nom> tag:<tag> region:<région>` : Ajoute un joueur à la liste de suivi.",
                "",
                "🔹 **Gestion des joueurs**",
                "➜ `/deleteplayer player:<joueur>` : Supprime un joueur de la liste (choisissez-le dans les suggestions).",
                "➜ `/list` : Affiche la liste des joueurs suivis.",
                "➜ `/leaderboard` : Affiche le classement général des joueurs.",
                "",
                "🔹 **Configuration**",
                "➜ `/flextoggle` : Active ou désactive le suivi des parties Flex.",
                "➜ `/tfttoggle` : Active ou désactive le suivi des parties TFT (solo et double).",
                "➜ `/language` : Change la langue du bot (fr/en).",
                "",
                "🔹 **Récapitulatif mensuel manuel**",
                "➜ `/monthlyrecap month:<mois> year:<année>` : Génère manuellement un récapitulatif mensuel des joueurs.",
                "",
                "🔹 **Récapitulatif quotidien**",
                "📢 Tous les matins, le bot envoie un résumé des performances :",
                "- Victoires / Défaites 🎉💀",
                "- LP gagnés / perdus 📈📉",
                "",
                "🔹 **Récapitulatif mensuel automatique**",
                "📢 Le 1er de chaque mois, le bot envoie automatiquement le récapitulatif du mois précédent pour tous les joueurs.",
                "",
                "*Besoin d'aide ? N'hésitez pas à demander !*",
            ].join("\n"),
        },
        commands: {
            initRequired: "⚠️ Le bot n'est pas encore configuré sur ce serveur : lancez d'abord `/init`.",
            unexpectedError: "❌ Une erreur inattendue est survenue, contactez le développeur.",
            init: (channelName: string, flexTracked: boolean, tftTracked: boolean) =>
                `✅ Bot configuré dans #${channelName}. Flex : ${flexTracked ? "suivie" : "non suivie"} · TFT : ${tftTracked ? "suivi" : "non suivi"} · Langue : français.`,
            addPlayer: {
                added: (riotId: string, region: string) => `✅ ${riotId} (${region}) est maintenant suivi.`,
                alreadyAdded: "ℹ️ Ce joueur est déjà suivi sur ce serveur.",
                notFound: "❌ Joueur introuvable. Vérifiez le nom, le tag et la région.",
            },
            deletePlayer: {
                deleted: (label: string) => `🗑️ ${label} n'est plus suivi.`,
                notFound: "❌ Aucun joueur suivi ne correspond. Choisissez-le dans les suggestions.",
            },
            flexToggle: (enabled: boolean) => enabled ? "✅ Les parties Flex sont maintenant suivies." : "⏸️ Les parties Flex ne sont plus suivies.",
            tftToggle: (enabled: boolean) => enabled ? "✅ Les parties TFT (solo et double) sont maintenant suivies." : "⏸️ Les parties TFT (solo et double) ne sont plus suivies.",
            languageChanged: "✅ Le bot parle maintenant français.",
        },
        monthlyStats: "Statistiques du mois",
        monthNames: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
    },

    en: {
        // Common
        title: "[📜 Match Result ⚔️]",
        lpChange: (lp: number) => lp >= 0 ? "Gained" : "Lost",
        recapTitles: {
            [GameQueueType.RANKED_SOLO_5x5]: "[📈 SoloQ Daily Recap]",
            [GameQueueType.RANKED_FLEX_SR]: "[📊 Flex Daily Recap]",
            [GameQueueType.RANKED_CLASH]: "[⚔️ Clash Daily Recap]",
            [GameQueueType.RANKED_5v5]: "[🎯 Ranked 5v5 Daily Recap]",
            [GameQueueType.RANKED_TFT]: "[📜 TFT Daily Recap]",
            [GameQueueType.RANKED_TFT_DOUBLE_UP]: "[🤝 TFT Double Daily Recap]"
        },
        monthlyRecapTitles: {
            [GameQueueType.RANKED_SOLO_5x5]: "[📜 Monthly Recap SoloQ]",
            [GameQueueType.RANKED_FLEX_SR]: "[📜 Monthly Recap Flex]",
            [GameQueueType.RANKED_CLASH]: "[📜 Monthly Recap Clash]",
            [GameQueueType.RANKED_5v5]: "[📜 Monthly Recap 5v5]",
            [GameQueueType.RANKED_TFT]: "[📜 Monthly Recap TFT]",
            [GameQueueType.RANKED_TFT_DOUBLE_UP]: "[📜 Monthly Recap TFT Double]"
        },
        league: "LP",
        wins: "Wins",
        losses: "Losses",
        win: "Victory",
        loss: "Defeat",
        games: "Games",
        winrate: "Winrate",

        // LoL (with emojis)
        kda: "⚔️ KDA",
        time: "⏱️ Duration",
        score: "⭐ Score",
        csPerMin: "🌾 CS/m",
        totalCs: "🌾 CS",
        pings: "🔔 Pings",
        damage: "💥 Damage",
        visionPerMin: "👁️ Vision/m",
        teamRank: "🤝 Team Rank",
        avgTeamRank: "🤝 Avg Team Rank",
        queue: "🗺️ Queue",
        queueTypeSolo: "Solo/Duo",
        queueTypeFlex: "Flex",
        queueTypeClash: "Clash",
        queueType5v5: "Ranked 5v5",

        // TFT (with emojis)
        placement: "🏆 Placement",
        level: "🌟 Level",
        round: "⏳ Round",
        eliminated: "💀 Players Eliminated",
        mainTraits: "✨ Main Traits",
        queueTypeTFT: "TFT Ranked",
        queueTypeTFTDouble: "TFT Double Ranked",
        goldLeft: "💰 Gold Left",
        avgPlacement: "🏆 Avg Placement",

        // Commands
        leaderboardTitles: {
            [GameQueueType.RANKED_SOLO_5x5]: "🏆 SoloQ Leaderboard",
            [GameQueueType.RANKED_FLEX_SR]: "🏆 FlexQ Leaderboard",
            [GameQueueType.RANKED_CLASH]: "🏆 Clash Leaderboard",
            [GameQueueType.RANKED_5v5]: "🏆 5v5 Leaderboard",
            [GameQueueType.RANKED_TFT]: "🏆 TFT Leaderboard",
            [GameQueueType.RANKED_TFT_DOUBLE_UP]: "🏆 TFT Double Leaderboard",
        },
        leaderboard: {
            description: "Here are the players ranked from strongest to weakest:",
            playerLine: (index: number, name: string, tag: string, region: string, rank: string, tier: string, lp: number) =>
                `**#${index}** **${name}#${tag}**\n🌍 **Region:** ${region} | **Rank:** ${rankEmojis[tier] || "🏅"} ${tier} ${rank} | 🔥 **LP:** ${lp}`,
            total: (count: number) => `Total: ${count} ranked players`,
            noPlayers: "📭 No ranked players at the moment!",
        },
        list: {
            title: "📋 List of Tracked Players",
            description: "Here is the list of currently tracked players:",
            playerLine: (index: number, name: string, region: string) => `**${index}.** 🎮 **${name}**\n🌍 Region: **${region}**`,
            total: (count: number) => `Total: ${count} player(s)`,
            noPlayers: "📭 No players are being tracked at the moment!",
        },
        monthlyRecapCommand: {
            futureError: "❌ You cannot generate a recap for the future!",
            success: (month: number, year: number) => `✅ Monthly recap for ${month}/${year} generated successfully!`,
            failure: "❌ Failed to generate monthly recap. Contact the developer.",
        },
        help: {
            title: "📌 Bot Usage Guide",
            description: [
                "Welcome! Here are the commands to use the bot properly:",
                "",
                "🔹 **Initialization**",
                "➜ `/init` : Initializes the bot for your server (channel, Flex/TFT tracking, language).",
                "",
                "🔹 **Adding Players**",
                "➜ `/addplayer accountname:<name> tag:<tag> region:<region>` : Adds a player to the tracking list.",
                "",
                "🔹 **Player Management**",
                "➜ `/deleteplayer player:<player>` : Removes a player from the list (pick it from the suggestions).",
                "➜ `/list` : Displays the list of tracked players.",
                "➜ `/leaderboard` : Shows the general ranking of players.",
                "",
                "🔹 **Settings**",
                "➜ `/flextoggle` : Enables or disables Flex game tracking.",
                "➜ `/tfttoggle` : Enables or disables TFT game tracking (solo and double up).",
                "➜ `/language` : Changes the bot language (fr/en).",
                "",
                "🔹 **Manual Monthly Recap**",
                "➜ `/monthlyrecap month:<month> year:<year>` : Manually generates a monthly recap for players.",
                "",
                "🔹 **Daily Recap**",
                "📢 Every morning, the bot sends a performance summary:",
                "- Wins / Losses 🎉💀",
                "- LP gained / lost 📈📉",
                "",
                "🔹 **Automatic Monthly Recap**",
                "📢 On the 1st of each month, the bot automatically sends a recap of the previous month for all players.",
                "",
                "*Need help? Feel free to ask!*",
            ].join("\n"),
        },
        commands: {
            initRequired: "⚠️ The bot is not set up on this server yet: run `/init` first.",
            unexpectedError: "❌ An unexpected error occurred, contact the developer.",
            init: (channelName: string, flexTracked: boolean, tftTracked: boolean) =>
                `✅ Bot set up in #${channelName}. Flex: ${flexTracked ? "tracked" : "not tracked"} · TFT: ${tftTracked ? "tracked" : "not tracked"} · Language: English.`,
            addPlayer: {
                added: (riotId: string, region: string) => `✅ ${riotId} (${region}) is now tracked.`,
                alreadyAdded: "ℹ️ This player is already tracked on this server.",
                notFound: "❌ Player not found. Please check the name, tag and region.",
            },
            deletePlayer: {
                deleted: (label: string) => `🗑️ ${label} is no longer tracked.`,
                notFound: "❌ No tracked player matches. Pick one from the suggestions.",
            },
            flexToggle: (enabled: boolean) => enabled ? "✅ Flex games are now tracked." : "⏸️ Flex games are no longer tracked.",
            tftToggle: (enabled: boolean) => enabled ? "✅ TFT games (solo and double up) are now tracked." : "⏸️ TFT games (solo and double up) are no longer tracked.",
            languageChanged: "✅ The bot now speaks English.",
        },
        monthlyStats: "Monthly statistics",
        monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    },
} as const; // Utilisation de 'as const' pour TypeScript pour des types stricts

// --- Fonction d'Accès aux Traductions ---
export const getTranslations = (lang: string): GameTranslations => {
    // Vérifie si la langue existe, sinon utilise 'en' par défaut.
    const key = lang as keyof typeof allTranslations;
    return allTranslations[key] || allTranslations.en;
};
