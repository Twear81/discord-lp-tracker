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
    totalCs: string;
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
            // --- LoL Standard ---
            [GameQueueType.RANKED_SOLO_5x5]: "[📈 Résumé Quotidien SoloQ]",
            [GameQueueType.RANKED_FLEX_SR]: "[📊 Résumé Quotidien Flex]",
            [GameQueueType.NORMAL_QUICKPLAY]: "[⚔️ Résumé Quotidien Quickplay]",
            [GameQueueType.NORMAL_DRAFT_5x5]: "[Draft Résumé Quotidien]",

            // --- LoL Special ---
            [GameQueueType.ARAM]: "[🎲 Résumé Quotidien ARAM]",
            [GameQueueType.ARENA]: "[🏟️ Résumé Quotidien Arena]",
            [GameQueueType.URF]: "[🔥 Résumé Quotidien URF]",
            [GameQueueType.ALL_FOR_ONE]: "[👥 Résumé Quotidien Un pour Tous]",

            // --- TFT ---
            [GameQueueType.RANKED_TFT]: "[📜 Résumé Quotidien TFT]",
            [GameQueueType.NORMAL_TFT]: "[🧩 Résumé Quotidien TFT Normal]",
            [GameQueueType.RANKED_TFT_DOUBLE_UP]: "[🤝 Résumé Quotidien TFT Double]",
            [GameQueueType.TFT_DOUBLE_UP_NORMAL]: "[👥 Résumé Quotidien TFT Double Normal]",
            [GameQueueType.TFT_HYPER_ROLL]: "[⚡ Résumé Quotidien Hyper Roll]",
            [GameQueueType.TFT_FORTUNES_FAVOR]: "[💰 Résumé Quotidien Fortune's Favor]",
            [GameQueueType.TFT_CHONCCS_TREASURE]: "[💎 Résumé Quotidien Trésor de Choncc]",
            [GameQueueType.TFT_SET_REVIVAL]: "[⏳ Résumé Quotidien TFT Revival]",
            [GameQueueType.TFT_TUTORIAL]: "[📖 Résumé Quotidien Tutoriel TFT]",

            // --- Bots ---
            [GameQueueType.BOT_INTRO]: "[🤖 Résumé Quotidien Bots Intro]",
            [GameQueueType.BOT_BEGINNER]: "[🤖 Résumé Quotidien Bots Débutant]",
            [GameQueueType.BOT_INTERMEDIATE]: "[🤖 Résumé Quotidien Bots Intermédiaire]"
        },
        monthlyRecapTitles: {
            // --- LoL Standard ---
            [GameQueueType.RANKED_SOLO_5x5]: "[📜 Résumé Mensuel SoloQ]",
            [GameQueueType.RANKED_FLEX_SR]: "[📜 Résumé Mensuel Flex]",
            [GameQueueType.NORMAL_QUICKPLAY]: "[📜 Résumé Mensuel Quickplay]",
            [GameQueueType.NORMAL_DRAFT_5x5]: "[📜 Résumé Mensuel Draft]",

            // --- LoL Special ---
            [GameQueueType.ARAM]: "[📜 Résumé Mensuel ARAM]",
            [GameQueueType.ARENA]: "[📜 Résumé Mensuel Arena]",
            [GameQueueType.URF]: "[📜 Résumé Mensuel URF]",
            [GameQueueType.ALL_FOR_ONE]: "[📜 Résumé Mensuel Un pour Tous]",

            // --- TFT ---
            [GameQueueType.RANKED_TFT]: "[📜 Résumé Mensuel TFT]",
            [GameQueueType.NORMAL_TFT]: "[📜 Résumé Mensuel TFT Normal]",
            [GameQueueType.RANKED_TFT_DOUBLE_UP]: "[📜 Résumé Mensuel TFT Double]",
            [GameQueueType.TFT_DOUBLE_UP_NORMAL]: "[📜 Résumé Mensuel TFT Double Normal]",
            [GameQueueType.TFT_HYPER_ROLL]: "[📜 Résumé Mensuel Hyper Roll]",
            [GameQueueType.TFT_FORTUNES_FAVOR]: "[📜 Résumé Mensuel Fortune's Favor]",
            [GameQueueType.TFT_CHONCCS_TREASURE]: "[📜 Résumé Mensuel Trésor de Choncc]",
            [GameQueueType.TFT_SET_REVIVAL]: "[📜 Résumé Mensuel TFT Revival]",
            [GameQueueType.TFT_TUTORIAL]: "[📜 Résumé Mensuel Tutoriel TFT]",

            // --- Bots ---
            [GameQueueType.BOT_INTRO]: "[📜 Résumé Mensuel Bots Intro]",
            [GameQueueType.BOT_BEGINNER]: "[📜 Résumé Mensuel Bots Débutant]",
            [GameQueueType.BOT_INTERMEDIATE]: "[📜 Résumé Mensuel Bots Intermédiaire]"
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
            // --- LoL Standard ---
            [GameQueueType.RANKED_SOLO_5x5]: "[📈 SoloQ Daily Recap]",
            [GameQueueType.RANKED_FLEX_SR]: "[📊 Flex Daily Recap]",
            [GameQueueType.NORMAL_QUICKPLAY]: "[⚔️ Quickplay Daily Recap]",
            [GameQueueType.NORMAL_DRAFT_5x5]: "[⚔️ Draft Daily Recap]",

            // --- LoL Special ---
            [GameQueueType.ARAM]: "[🎲 ARAM Daily Recap]",
            [GameQueueType.ARENA]: "[🏟️ Arena Daily Recap]",
            [GameQueueType.URF]: "[🔥 URF Daily Recap]",
            [GameQueueType.ALL_FOR_ONE]: "[👥 One for All Daily Recap]",

            // --- TFT ---
            [GameQueueType.RANKED_TFT]: "[📜 TFT Daily Recap]",
            [GameQueueType.NORMAL_TFT]: "[🧩 TFT Normal Daily Recap]",
            [GameQueueType.RANKED_TFT_DOUBLE_UP]: "[🤝 TFT Double Daily Recap]",
            [GameQueueType.TFT_DOUBLE_UP_NORMAL]: "[👥 TFT Double Normal Daily Recap]",
            [GameQueueType.TFT_HYPER_ROLL]: "[⚡ Hyper Roll Daily Recap]",
            [GameQueueType.TFT_FORTUNES_FAVOR]: "[💰 Fortune's Favor Daily Recap]",
            [GameQueueType.TFT_CHONCCS_TREASURE]: "[💎 Choncc's Treasure Daily Recap]",
            [GameQueueType.TFT_SET_REVIVAL]: "[⏳ TFT Revival Daily Recap]",
            [GameQueueType.TFT_TUTORIAL]: "[📖 TFT Tutorial Daily Recap]",

            // --- Bots ---
            [GameQueueType.BOT_INTRO]: "[🤖 Bots Intro Daily Recap]",
            [GameQueueType.BOT_BEGINNER]: "[🤖 Bots Beginner Daily Recap]",
            [GameQueueType.BOT_INTERMEDIATE]: "[🤖 Bots Intermediate Daily Recap]"
        },
        monthlyRecapTitles: {
            // --- LoL Standard ---
            [GameQueueType.RANKED_SOLO_5x5]: "[📜 Monthly Recap SoloQ]",
            [GameQueueType.RANKED_FLEX_SR]: "[📜 Monthly Recap Flex]",
            [GameQueueType.NORMAL_QUICKPLAY]: "[📜 Monthly Recap Quickplay]",
            [GameQueueType.NORMAL_DRAFT_5x5]: "[📜 Monthly Recap Draft]",

            // --- LoL Special ---
            [GameQueueType.ARAM]: "[📜 Monthly Recap ARAM]",
            [GameQueueType.ARENA]: "[📜 Monthly Recap Arena]",
            [GameQueueType.URF]: "[📜 Monthly Recap URF]",
            [GameQueueType.ALL_FOR_ONE]: "[📜 Monthly Recap One for All]",

            // --- TFT ---
            [GameQueueType.RANKED_TFT]: "[📜 Monthly Recap TFT]",
            [GameQueueType.NORMAL_TFT]: "[📜 Monthly Recap TFT Normal]",
            [GameQueueType.RANKED_TFT_DOUBLE_UP]: "[📜 Monthly Recap TFT Double]",
            [GameQueueType.TFT_DOUBLE_UP_NORMAL]: "[📜 Monthly Recap TFT Double Normal]",
            [GameQueueType.TFT_HYPER_ROLL]: "[📜 Monthly Recap Hyper Roll]",
            [GameQueueType.TFT_FORTUNES_FAVOR]: "[📜 Monthly Recap Fortune's Favor]",
            [GameQueueType.TFT_CHONCCS_TREASURE]: "[📜 Monthly Recap Choncc's Treasure]",
            [GameQueueType.TFT_SET_REVIVAL]: "[📜 Monthly Recap TFT Revival]",
            [GameQueueType.TFT_TUTORIAL]: "[📜 Monthly Recap TFT Tutorial]",

            // --- Bots ---
            [GameQueueType.BOT_INTRO]: "[📜 Monthly Recap Bots Intro]",
            [GameQueueType.BOT_BEGINNER]: "[📜 Monthly Recap Bots Beginner]",
            [GameQueueType.BOT_INTERMEDIATE]: "[📜 Monthly Recap Bots Intermediate]"
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
