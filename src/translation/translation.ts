import { GameQueueType } from "../tracking/GameQueueType";

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
    pings: string;
    damage: string;
    visionPerMin: string;
    teamRank: string;
    queue: string;
    queueTypeSolo: string;
    queueTypeFlex: string;

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
}

const allTranslations = {
    fr: {
        // Commun
        title: "[📜 Résultat de partie ⚔️]",
        lpChange: (lp: number) => lp > 0 ? "Gain de" : "Perte de",
        recapTitles: {
            [GameQueueType.RANKED_SOLO_5x5]: "[📈 Résumé Quotidien SoloQ]",
            [GameQueueType.RANKED_FLEX_SR]: "[📊 Résumé Quotidien Flex]",
            [GameQueueType.RANKED_TFT]: "[📜 Résumé Quotidien TFT]",
            [GameQueueType.RANKED_TFT_DOUBLE_UP]: "[🤝 Résumé Quotidien TFT Double]"
        },
        monthlyRecapTitles: {
            [GameQueueType.RANKED_SOLO_5x5]: "[📜 Résumé Mensuel SoloQ]",
            [GameQueueType.RANKED_FLEX_SR]: "[📜 Résumé Mensuel Flex]",
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
        pings: "🔔 Pings",
        damage: "💥 Dégâts",
        visionPerMin: "👁️ Vision/m",
        teamRank: "🤝 Rang d'équipe",
        queue: "🗺️ Queue",
        queueTypeSolo: "Solo/Duo",
        queueTypeFlex: "Flex",

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
    },

    en: {
        // Common
        title: "[📜 Match Result ⚔️]",
        lpChange: (lp: number) => lp > 0 ? "Gained" : "Lost",
        recapTitles: {
            [GameQueueType.RANKED_SOLO_5x5]: "[📈 SoloQ Daily Recap]",
            [GameQueueType.RANKED_FLEX_SR]: "[📊 Flex Daily Recap]",
            [GameQueueType.RANKED_TFT]: "[📜 TFT Daily Recap]",
            [GameQueueType.RANKED_TFT_DOUBLE_UP]: "[🤝 TFT Double Daily Recap]"
        },
        monthlyRecapTitles: {
            [GameQueueType.RANKED_SOLO_5x5]: "[📜 Monthly Recap SoloQ]",
            [GameQueueType.RANKED_FLEX_SR]: "[📜 Monthly Recap Flex]",
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
        pings: "🔔 Pings",
        damage: "💥 Damage",
        visionPerMin: "👁️ Vision/m",
        teamRank: "🤝 Team Rank",
        queue: "🗺️ Queue",
        queueTypeSolo: "Solo/Duo",
        queueTypeFlex: "Flex",

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
    },
} as const; // Utilisation de 'as const' pour TypeScript pour des types stricts

// --- Fonction d'Accès aux Traductions ---
export const getTranslations = (lang: string): GameTranslations => {
    // Vérifie si la langue existe, sinon utilise 'en' par défaut.
    const key = lang as keyof typeof allTranslations;
    return allTranslations[key] || allTranslations.en;
};
