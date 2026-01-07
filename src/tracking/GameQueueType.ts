export enum GameQueueType {
    // --- Standard Modes (LoL) ---
    NORMAL_QUICKPLAY = "NORMAL_QUICKPLAY", // id 430
    NORMAL_DRAFT_5x5 = "NORMAL_DRAFT_5x5", // id 400
    RANKED_SOLO_5x5 = "RANKED_SOLO_5x5",   // id 420
    RANKED_FLEX_SR = "RANKED_FLEX_SR",     // id 440
    
    // --- Special Modes (LoL) ---
    ARAM = "ARAM",                         // id 450
    ARENA = "ARENA",                       // id 1700
    URF = "URF",                           // id 900
    ALL_FOR_ONE = "ALL_FOR_ONE",           // id 1020

    // --- TFT Modes ---
    NORMAL_TFT = "NORMAL_TFT",             // id 1090
    RANKED_TFT = "RANKED_TFT",             // id 1100
    TFT_TUTORIAL = "TFT_TUTORIAL",         // id 1110
    TFT_HYPER_ROLL = "TFT_HYPER_ROLL",     // id 1130
    TFT_DOUBLE_UP_NORMAL = "TFT_DOUBLE_UP_NORMAL", // id 1150
    RANKED_TFT_DOUBLE_UP = "RANKED_TFT_DOUBLE_UP", // id 1160
    TFT_FORTUNES_FAVOR = "TFT_FORTUNES_FAVOR",     // id 1170 (Mode Événement)
    TFT_CHONCCS_TREASURE = "TFT_CHONCCS_TREASURE", // id 1180 (Mode Événement)
    TFT_SET_REVIVAL = "TFT_SET_REVIVAL",           // id 1190 (Ex: Set 3.5 Revival)

    // --- Co-op vs AI ---
    BOT_INTRO = "BOT_INTRO",               // id 830
    BOT_BEGINNER = "BOT_BEGINNER",         // id 840
    BOT_INTERMEDIATE = "BOT_INTERMEDIATE"  // id 850
}

export enum ManagedGameQueueType {
	LEAGUE,
	TFT
}