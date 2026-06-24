import { RiotAPITypes } from "@fightmegg/riot-api";

function addCustomMessage(finalString: string | undefined, newString: string): string {
	if (finalString == undefined) {
		finalString = newString;
	} else {
		finalString += "\n" + newString;
	}
	return finalString;
}

export function generateLeagueCustomMessage(participant: RiotAPITypes.MatchV5.ParticipantDTO): string | undefined {
	let result = undefined;

	if (participant.championName == "Anivia") {
		result = addCustomMessage(result, "🎵 Floflo toujours dans son délire 🎵");
	}

	if (participant.championName == "Zoe" && participant.win == true) {
		result = addCustomMessage(result, "🚨 Controle de police ! Photo de pied svp 🚨");
	}

	if (participant.championName == "Zoe" && participant.win == false) {
		result = addCustomMessage(result, "Team diff");
	}

	if (participant.championName == "Gwen" && participant.win == true) {
		result = addCustomMessage(result, "☕️ Cafe chouchou ! ☕️");
	}

	if (participant.championName == "Gwen" && participant.win == false) {
		result = addCustomMessage(result, "☕️ Cafe choucroute ? ☕️");
	}

	if (participant.teamPosition == "JUNGLE" && participant.win == false) {
		result = addCustomMessage(result, "Ouin ouin ? 😭");
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	if (((participant as any).riotIdGameName.toLowerCase() === "jukeboox81" || (participant as any).riotIdGameName.toLowerCase() === "baltrou") && participant.win == false) {
		result = addCustomMessage(result, "Normal, il est jamais la 💀🐸");
	}

	return result;
}

export function generateTFTCustomMessage(participant: RiotAPITypes.TftMatch.ParticipantDTO): string | undefined {
	let result = undefined;

	if (participant.placement == 1) {
		result = addCustomMessage(result, "SIUUUUceur de meta !");
	}

	if (participant.placement == 1 && participant.puuid == "2y_cjrqPj2eEjRETZNa7ub54TTIYRK9NdYs5tOYlaDtY3RfCDakrDWZNuccHCrCe7dW2o1l6h5NSuw") { // Jojo
		result = addCustomMessage(result, "🎵 Jojo dans la place, Attention quand il passe 🎵");
	}

	if (participant.placement == 7) {
		result = addCustomMessage(result, "Full chatte hein ...");
	}

	if (participant.placement == 8) {
		result = addCustomMessage(result, "Arrete de chialer stp ...");
	}

	if (participant.placement == 8 && participant.puuid == "2y_cjrqPj2eEjRETZNa7ub54TTIYRK9NdYs5tOYlaDtY3RfCDakrDWZNuccHCrCe7dW2o1l6h5NSuw") { // Jojo
		result = addCustomMessage(result, "Au moins il tente des trucs ...");
	}

	if (participant.total_damage_to_players >= 200) {
		result = addCustomMessage(result, "Le massacre !");
	}

	if ((participant.placement >= 7) && (participant.gold_left >= 25)) {
		result = addCustomMessage(result, "On est mort avec de la tune en plus ???");
	}

	return result;
}
