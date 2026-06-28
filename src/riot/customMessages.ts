import { RiotAPITypes } from "@fightmegg/riot-api";
import { GameQueueType } from "../tracking/GameQueueType";
import { getTeamLevelFromMatch, getTeamRankPositionFromLabel } from "./matchStats";

export const LATE_NIGHT_START_HOUR = 1;
export const LATE_NIGHT_END_HOUR = 6;

export function isLateNightParis(timestampMs: number): boolean {
	const parts = new Intl.DateTimeFormat("fr-FR", {
		hour: "numeric",
		hour12: false,
		timeZone: "Europe/Paris",
	}).formatToParts(new Date(timestampMs));
	const hourPart = parts.find((p) => p.type === "hour");
	const hour = hourPart ? Number(hourPart.value) : -1;
	return hour >= LATE_NIGHT_START_HOUR && hour < LATE_NIGHT_END_HOUR;
}

export type MessageRule<TInfo> = {
	id: string;
	condition: (info: TInfo) => boolean;
	messages: string[];
};

function pickRandom<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

function appendMessage(current: string | undefined, addition: string): string {
	return current === undefined ? addition : `${current}\n${addition}`;
}

function generateMessages<TInfo>(rules: MessageRule<TInfo>[], info: TInfo): string | undefined {
	let result: string | undefined = undefined;
	for (const rule of rules) {
		if (rule.messages.length > 0 && rule.condition(info)) {
			result = appendMessage(result, pickRandom(rule.messages));
		}
	}
	return result;
}

// ---------- LoL ----------

export interface LoLMessageInfo {
	championName: string;
	puuid: string;
	win: boolean;
	kills: number;
	deaths: number;
	assists: number;
	damage: number;
	visionScore: number;
	wardsPlaced: number;
	timeCCingOthers: number;
	gameEndedInSurrender: boolean;
	pentaKills: number;
	quadraKills: number;
	tripleKills: number;
	teamRankPosition: number;
	queueType: GameQueueType;
	isLateNight: boolean;
}

const LATGE_PUUID = "9OFRX2NgQlyz79quf8Hcei89peJ5s0CzKERblxm1HwpYXdXNfOSIV77qAw1vy2Um2_pl7xOQYGRUxg";

export const LEAGUE_MESSAGE_RULES: MessageRule<LoLMessageInfo>[] = [
	{
		id: "champion-anivia",
		condition: (i) => i.championName === "Anivia",
		messages: ["🎵 Floflo toujours dans son délire 🎵"],
	},
	{
		id: "champion-zoe-win",
		condition: (i) => i.championName === "Zoe" && i.win,
		messages: ["🚨 Controle de police ! Photo de pied svp 🚨"],
	},
	{
		id: "champion-gwen-win",
		condition: (i) => i.championName === "Gwen" && i.win,
		messages: ["☕️ Cafe chouchou ! ☕️"],
	},
	{
		id: "kda-2-7",
		condition: (i) => i.kills === 2 && i.deaths === 7,
		messages: ["💪🏿 Tu connais la recette ? 💪🏿"],
	},
	{
		id: "vision-low",
		condition: (i) => i.visionScore <= 8,
		messages: ["Ta mere c'est une pute si tu ward ouuuuuuuu ?", "RP Lee sin !", "On a warded ? Non ? Bah..."],
	},
	{
		id: "deaths-many",
		condition: (i) => i.deaths >= 9,
		messages: ["💀 Maxime approuved 💀", "9+ morts, t'as fait un speedrun du respawn", "Tu spawne plus vite que tu farm", "0/9 power spike 💀"],
	},
	{
		id: "kills-many",
		condition: (i) => i.kills >= 9,
		messages: ["Un massacre !", "Ça fait la fête au chat", "Fête du slip au mid", "Le killing spree du jour", "Carrément exterminateur"],
	},
	{
		id: "damage-high",
		condition: (i) => i.damage >= 30000,
		messages: ["Ca fait la bagarre", "Que la bagarre"],
	},
	{
		id: "surrender-loss",
		condition: (i) => i.gameEndedInSurrender && !i.win,
		messages: ["Et ca surrend en plus ...", "Surrender pour fuir la honte, logique"],
	},
	{
		id: "puuid-latge-loss",
		condition: (i) => i.puuid === LATGE_PUUID && !i.win,
		messages: ["Ganbare, Latge-kun ! 🐸", "Ganbare ! 💪🐸", "Tiens bon Latge-kun 🐸", "La grenouille reviendra plus forte 🐸"],
	},
	{
		id: "win-lowest-score",
		condition: (i) => i.win && i.teamRankPosition === 4,
		messages: [
			"Merci la team",
			"Porté par la team, encore une fois",
			"Merci le taxi",
			"L'ascenseur émotionnel : monter en LP sans rien faire",
			"Tu dois combien pour le PL ?",
		],
	},
	{
		id: "no-deaths",
		condition: (i) => i.deaths === 0 && i.kills + i.assists >= 5,
		messages: ["Iron man mode 🔥", "Invincible ou presque", "Tu meurs jamais ou quoi ?"],
	},
	{
		id: "penta-kill",
		condition: (i) => i.pentaKills >= 1,
		messages: ["PENTAKILL !! 🎉🎉🎉", "Cinq sur cinq, c'est l'heure du Penta", "Penta collector 🖐️"],
	},
	{
		id: "quadra-kill",
		condition: (i) => i.quadraKills >= 1,
		messages: ["Quadra kill, encore un effort...", "Quadra propre 🖐️", "Plus qu'un pour le penta !", "4 sur 5, t'as frôlé"],
	},
	{
		id: "triple-kill",
		condition: (i) => i.tripleKills >= 1,
		messages: ["Triple kill, pas mal !"],
	},
	{
		id: "win-mvp",
		condition: (i) => i.win && i.teamRankPosition === 0,
		messages: ["Sans lui, on ne gagnait pas.", "Performance XXL !", "Porte sa team à bout de bras.", "MVP de la game, mérité 🏆"],
	},
	{
		id: "win-carried",
		condition: (i) => i.win && i.teamRankPosition >= 3,
		messages: [
			"Team à la rescousse !",
			"A voyagé en première classe.",
			"Merci au taxi team.",
			"Le travail d'équipe, c'est important ^^",
			"Ticket gold pour la win",
		],
	},
	{
		id: "lose-anchor",
		condition: (i) => !i.win && i.teamRankPosition >= 3,
		messages: ["Poids lourd de l'équipe.", "Ma contribution ? L'ambiance.", "Porté et coulé.", "Impossible à porter.", "Ancre marine, ancrée au fond."],
	},
	{
		id: "lose-mvp",
		condition: (i) => !i.win && i.teamRankPosition <= 1,
		messages: [
			"Team en kit.",
			"Team trop lourde.",
			"1v9 en vain.",
			"Le MVP ne fait pas tout.",
			"J'ai gagné, on a perdu.",
			"Carry en solo, défaite en équipe.",
		],
	},
	{
		id: "zero-wards-placed",
		condition: (i) => i.wardsPlaced === 0 && i.visionScore < 15,
		messages: ["0 ward posée, on est en plein désert", "T'as oublié d'acheter des wards ?", "Vision : mystère et boule de gomme", "Pas une seule ward, GG"],
	},
	{
		id: "many-cc",
		condition: (i) => i.timeCCingOthers >= 60,
		messages: ["CC machine, les ennemis ont le torticolis", "On ne bouge plus, merci à toi", "Stun bot 3000", "Crowd control collector"],
	},
	{
		id: "late-night-loss",
		condition: (i) => !i.win && i.isLateNight,
		messages: [
			"Il est tard, ton rank non plus il t'aime pas, va te coucher.",
			"Même Anivia a plus de dignité que toi à cette heure-là. Éteins le PC.",
			"Ton ELO va pas remonter dans ton sommeil... mais toi oui, file.",
			"Tu perds ET tu dors pas, là c'est double peine. Au lit.",
			"Le clutch il est pas pour ce soir, ni pour cette nuit. Dodo.",
			"À cette heure-ci, accepter la défaite c'est bien. Accepter l'oreiller c'est mieux.",
		],
	},
	{
		id: "late-night-win",
		condition: (i) => i.win && i.isLateNight,
		messages: [
			"Belle win, mais à cette heure-ci ton cerveau a déjà signé. Arrête.",
			"La win elle est là, le sommeil lui va pas tarder. Pose la souris.",
			"Tu gagnes au jeu, tu perds en heures de vie. Au lit, champion.",
			"Une win en pleine nuit ça se fête demain. Dodo.",
			"Félicitations, t'as prouvé que tu savais gagner. Maintenant prouve que tu sais dormir.",
			"Le rank il sera encore là demain. Toi, demain, sans sommeil, non.",
		],
	},
];

// ---------- TFT ----------

export interface TFTMessageInfo {
	puuid: string;
	placement: number;
	playersEliminated: number;
	totalDamageToPlayers: number;
	goldLeft: number;
	level: number;
	win: boolean;
	isLateNight: boolean;
}

export const TFT_MESSAGE_RULES: MessageRule<TFTMessageInfo>[] = [
	{
		id: "tft-first",
		condition: (i) => i.placement === 1,
		messages: ["SIUUUUceur de meta !", "Top 1, propre 🏆", "Win TFT, gg wp", "Faker du TFT"],
	},
	{
		id: "tft-top2-3",
		condition: (i) => i.placement === 2 || i.placement === 3,
		messages: ["Top 3, c'est LP en plus 🪙", "Podium mais sans la marche du haut", "Presque le top 1, next time"],
	},
	{
		id: "tft-bottom4-mid",
		condition: (i) => i.placement === 5 || i.placement === 6,
		messages: ["Bottom 4 mais pas dernier, c'est déjà ça", "On va pas se mentir c'est pas ouf", "Game à oublier"],
	},
	{
		id: "tft-7th",
		condition: (i) => i.placement === 7,
		messages: ["Full chatte hein ...", "7e, c'est le début du fond", "Place du spectateur, première rangée"],
	},
	{
		id: "tft-8th",
		condition: (i) => i.placement === 8,
		messages: ["Arrete de chialer stp ...", "8e, le fond du fond", "On a touché le fond mais y'a le sol en dessous", "Game over man, game over"],
	},
	{
		id: "tft-damage-high",
		condition: (i) => i.totalDamageToPlayers >= 200,
		messages: ["Le massacre !", "T'es sûr que c'est du TFT et pas un FPS ?", "Dégâts de carry", "Faker de la violence 💥"],
	},
	{
		id: "tft-perfect-game",
		condition: (i) => i.placement === 1 && i.playersEliminated >= 6,
		messages: ["Game parfaite, 1 + X elims, c'est textbook", "God mode activé", "Le carry qui close"],
	},
	{
		id: "tft-high-level",
		condition: (i) => i.level >= 9,
		messages: ["Niveau 9+ ? T'as sold out ta life"],
	},
	{
		id: "tft-gold-left-loss",
		condition: (i) => i.placement >= 7 && i.goldLeft >= 25,
		messages: ["On est mort avec de la tune en plus ???", "Gold > LP, étrange économie", "Économiste du TFT, mais perdant"],
	},
	{
		id: "tft-late-night-loss",
		condition: (i) => !i.win && i.isLateNight,
		messages: [
			"Le TFT à cette heure-ci, ça pardonne pas.",
			"Vaudrait mieux dormir que de prendre des 8e.",
			"Le late game il est dans ton lit, pas sur TFT.",
		],
	},
	{
		id: "tft-late-night-win",
		condition: (i) => i.win && i.isLateNight,
		messages: ["Belle win, mais ton cerveau il a déjà signé. Va te coucher !", "Le top 1 il est là, le sommeil aussi. Pose le clavier."],
	},
];

// ---------- Public API ----------

export function generateLeagueCustomMessage(
	participant: RiotAPITypes.MatchV5.ParticipantDTO,
	allParticipants: RiotAPITypes.MatchV5.ParticipantDTO[],
	gameEndTimestamp: number,
	gameDurationSeconds: number,
	lang: string,
): string | undefined {
	const teamRankLabel = getTeamLevelFromMatch(allParticipants, gameDurationSeconds, participant.puuid, lang);
	const teamRankPosition = getTeamRankPositionFromLabel(teamRankLabel, lang);

	const info: LoLMessageInfo = {
		championName: participant.championName,
		puuid: participant.puuid,
		win: participant.win,
		kills: participant.kills,
		deaths: participant.deaths,
		assists: participant.assists,
		damage: participant.totalDamageDealtToChampions,
		visionScore: participant.visionScore,
		wardsPlaced: participant.wardsPlaced,
		timeCCingOthers: participant.timeCCingOthers,
		gameEndedInSurrender: participant.gameEndedInSurrender,
		pentaKills: participant.pentaKills,
		quadraKills: participant.quadraKills,
		tripleKills: participant.tripleKills,
		teamRankPosition,
		queueType: GameQueueType.RANKED_SOLO_5x5, // non utilisé par les règles actuelles, conservé pour extension future
		isLateNight: isLateNightParis(gameEndTimestamp),
	};

	return generateMessages(LEAGUE_MESSAGE_RULES, info);
}

export function generateTFTCustomMessage(participant: RiotAPITypes.TftMatch.ParticipantDTO, gameEndTimestamp: number, lang: string): string | undefined {
	void lang;
	const info: TFTMessageInfo = {
		puuid: participant.puuid,
		placement: participant.placement,
		playersEliminated: participant.players_eliminated,
		totalDamageToPlayers: participant.total_damage_to_players,
		goldLeft: participant.gold_left,
		level: participant.level,
		win: participant.placement <= 4,
		isLateNight: isLateNightParis(gameEndTimestamp),
	};
	return generateMessages(TFT_MESSAGE_RULES, info);
}
