import { RiotAPITypes } from "@fightmegg/riot-api";
import { PingKeys, ParticipantWithPings } from "./types";
import { computePlayerScore } from "./score";

export function getMainTrait(traits: RiotAPITypes.TftMatch.TraitDTO[]): Array<string> {
	if (!traits || traits.length === 0) {
		return [];
	}

	const activeTraits: RiotAPITypes.TftMatch.TraitDTO[] = traits.filter(trait => trait.tier_current > 0);

	if (activeTraits.length === 0) {
		return [];
	}

	activeTraits.sort((a, b) => {
		if (b.num_units !== a.num_units) {
			return b.num_units - a.num_units;
		}
		return (b.style ?? 0) - (a.style ?? 0);
	});

	const topTrait = activeTraits[0];
	const topScore = {
		num_units: topTrait.num_units,
		style: topTrait.style ?? 0
	};

	const resultTraits: RiotAPITypes.TftMatch.TraitDTO[] = activeTraits.filter(trait =>
		trait.num_units === topScore.num_units && (trait.style ?? 0) === topScore.style
	);

	const formattedTraits = resultTraits.map(trait => trait.name.replace(/^TFT\d+_/, ''));

	return formattedTraits.slice(0, 2);
}

export function getTotalPings(participant: ParticipantWithPings): number {
	const pingKeys: PingKeys[] = [
		"basicPings",
		"allInPings",
		"assistMePings",
		"baitPings",
		"enemyMissingPings",
		"enemyVisionPings",
		"holdPings",
		"needVisionPings",
		"onMyWayPings",
		"pushPings",
		"retreatPings",
		"visionClearedPings",
		"visionPings",
	];

	return pingKeys.reduce((sum, key) => {
		const value = participant[key];
		return sum + (typeof value === "number" ? value : 0);
	}, 0);
}

export function getTeamRankLabelFromPosition(position: number, lang: string): string {
	if (lang === 'fr') {
		switch (position) {
			case 0: return "🥇 MVP";
			case 1: return "🥈 Solide";
			case 2: return "🫥 Invisible";
			case 3: return "🐢 Traîné";
			default: return "🤡 Ancre";
		}
	}
	switch (position) {
		case 0: return "🥇 MVP";
		case 1: return "🥈 Solid";
		case 2: return "🫥 Invisible";
		case 3: return "🐢 Dragged";
		default: return "🤡 Anchor";
	}
}

export function getTeamRankPositionFromLabel(label: string, lang: string): number {
	if (label === "Unknown") return -1;

	const fr: Record<string, number> = {
		"🥇 MVP": 0,
		"🥈 Solide": 1,
		"🫥 Invisible": 2,
		"🐢 Traîné": 3,
		"🤡 Ancre": 4,
	};
	const en: Record<string, number> = {
		"🥇 MVP": 0,
		"🥈 Solid": 1,
		"🫥 Invisible": 2,
		"🐢 Dragged": 3,
		"🤡 Anchor": 4,
	};

	if (lang === 'fr') {
		return fr[label] ?? -1;
	}
	return en[label] ?? -1;
}

export function getTeamLevelFromMatch(participants: RiotAPITypes.MatchV5.ParticipantDTO[], gameDurationSeconds: number, puuid: string, lang: string): string {
	const participant = participants.find((p: RiotAPITypes.MatchV5.ParticipantDTO) => p.puuid === puuid);
	if (!participant) return "Unknown";

	const scores = participants.map((p: RiotAPITypes.MatchV5.ParticipantDTO, index: number, array: RiotAPITypes.MatchV5.ParticipantDTO[]) => computePlayerScore(p, array, gameDurationSeconds));

	const playerTeamId = participant.teamId;
	const teammateIndex: Array<number> = [];
	for (let index = 0; index < participants.length; index++) {
		if (participants[index].teamId === playerTeamId) {
			teammateIndex.push(index);
		}
	}
	const teammatesWithScores = teammateIndex.map(i => ({
		participant: participants[i],
		score: scores[i],
	}));

	const currentPlayerEntry = teammatesWithScores.find(t => t.participant.puuid === participant.puuid);
	const currentPlayerScore = currentPlayerEntry?.score ?? 0;
	const currentPlayerPositionInTheTeam = teammatesWithScores.filter(t => t.score > currentPlayerScore).length;

	return getTeamRankLabelFromPosition(currentPlayerPositionInTheTeam, lang);
}

export function getStageFromRound(lastRound: number): string {
	if (lastRound <= 0) {
		return "N/A";
	}

	if (lastRound <= 4) {
		return `1-${lastRound}`;
	}

	const adjustedRound = lastRound - 4;
	const stage = Math.floor((adjustedRound - 1) / 7) + 2;
	const roundInStage = (adjustedRound - 1) % 7 + 1;

	return `${stage}-${roundInStage}`;
}
