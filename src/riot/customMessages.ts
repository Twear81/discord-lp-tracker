import { RiotAPITypes } from "@fightmegg/riot-api";
import { computePlayerScore } from "./score";

function addCustomMessage(finalString: string | undefined, newString: string): string {
	if (finalString == undefined) {
		finalString = newString;
	} else {
		finalString += "\n" + newString;
	}
	return finalString;
}

function getParisHour(timestampMs: number): number {
	const parts = new Intl.DateTimeFormat("fr-FR", {
		hour: "numeric",
		hour12: false,
		timeZone: "Europe/Paris",
	}).formatToParts(new Date(timestampMs));
	const hourPart = parts.find((p) => p.type === "hour");
	return hourPart ? Number(hourPart.value) : -1;
}

export function generateLeagueCustomMessage(
	participant: RiotAPITypes.MatchV5.ParticipantDTO,
	allParticipants: RiotAPITypes.MatchV5.ParticipantDTO[],
	gameEndTimestamp: number,
	gameDurationSeconds: number,
): string | undefined {
	let result = undefined;

	if (participant.championName == "Anivia") {
		result = addCustomMessage(result, "🎵 Floflo toujours dans son délire 🎵");
	}

	if (participant.championName == "Zoe" && participant.win == true) {
		result = addCustomMessage(result, "🚨 Controle de police ! Photo de pied svp 🚨");
	}

	if (participant.championName == "Gwen" && participant.win == true) {
		result = addCustomMessage(result, "☕️ Cafe chouchou ! ☕️");
	}

	if (participant.kills == 2 && participant.deaths == 7) {
		result = addCustomMessage(result, "💪🏿 Tu connais la recette ? 💪🏿");
	}

	if (participant.visionScore <= 8) {
		result = addCustomMessage(result, "Ta mere c'est une pute si tu ward ouuuuuuuu ?");
	}

	if (participant.deaths >= 9) {
		result = addCustomMessage(result, "💀 Maxime approuved 💀");
	}

	if (participant.kills >= 9) {
		result = addCustomMessage(result, "Un massacre !");
	}

	if (participant.totalDamageDealtToChampions >= 30000) {
		result = addCustomMessage(result, "Ca fait la bagarre");
	}

	if (participant.gameEndedInSurrender == true && participant.win == false) {
		result = addCustomMessage(result, "Et ca surrend en plus ...");
	}

	if (participant.puuid === "9OFRX2NgQlyz79quf8Hcei89peJ5s0CzKERblxm1HwpYXdXNfOSIV77qAw1vy2Um2_pl7xOQYGRUxg" && participant.win == false) {
		result = addCustomMessage(result, "Ganbare, Latge-kun ! 🐸");
	}

	if (
		participant.puuid === "5XocUNgHyjZ45B2dS0vn_dhCbS8ZEdTboO8CjLeaX_dsvdrva7M7x-b_Hsu_BTbSfIZwqKMbpNZNiQ" &&
		participant.win == true &&
		(participant.kills + participant.assists) / Math.max(1, participant.deaths) >= 1
	) {
		result = addCustomMessage(result, "Il en a fait son affaire 💪");
	}

	if (gameEndTimestamp) {
		const parisHour = getParisHour(gameEndTimestamp);
		if (parisHour >= 0 && parisHour < 6) {
			result = addCustomMessage(result, "Tu dors pas, toi ?");
		}
	}

	if (participant.win == true) {
		const playerScore = computePlayerScore(participant, allParticipants, gameDurationSeconds);
		const teammates = allParticipants.filter((p) => p.teamId === participant.teamId);
		const isLowestScore = teammates.every((teammate) =>
			teammate.puuid === participant.puuid ? true : computePlayerScore(teammate, allParticipants, gameDurationSeconds) >= playerScore,
		);
		if (isLowestScore && teammates.length > 1) {
			result = addCustomMessage(result, "Merci la team");
		}
	}

	return result;
}

export function generateTFTCustomMessage(participant: RiotAPITypes.TftMatch.ParticipantDTO): string | undefined {
	let result = undefined;

	if (participant.placement == 1) {
		result = addCustomMessage(result, "SIUUUUceur de meta !");
	}

	if (participant.placement == 1 && participant.puuid == "2y_cjrqPj2eEjRETZNa7ub54TTIYRK9NdYs5tOYlaDtY3RfCDakrDWZNuccHCrCe7dW2o1l6h5NSuw") {
		// Jojo
		result = addCustomMessage(result, "🎵 Jojo dans la place, Attention quand il passe 🎵");
	}

	if (participant.placement == 7) {
		result = addCustomMessage(result, "Full chatte hein ...");
	}

	if (participant.placement == 8) {
		result = addCustomMessage(result, "Arrete de chialer stp ...");
	}

	if (participant.placement == 8 && participant.puuid == "2y_cjrqPj2eEjRETZNa7ub54TTIYRK9NdYs5tOYlaDtY3RfCDakrDWZNuccHCrCe7dW2o1l6h5NSuw") {
		// Jojo
		result = addCustomMessage(result, "Au moins il tente des trucs ...");
	}

	if (participant.total_damage_to_players >= 200) {
		result = addCustomMessage(result, "Le massacre !");
	}

	if (participant.placement >= 7 && participant.gold_left >= 25) {
		result = addCustomMessage(result, "On est mort avec de la tune en plus ???");
	}

	return result;
}
