import { DDragon } from "@fightmegg/riot-api";
import { promises as fs } from "fs";
import { TACTICIAN_FILE_PATH } from "..";
import logger from "../logger/logger";

interface TacticianImage {
	full: string;
	sprite: string;
	group: string;
	x: number;
	y: number;
	w: number;
	h: number;
}

interface Tactician {
	id: string;
	tier: string;
	name: string;
	image: TacticianImage;
}

interface TacticianDataFile {
	type: string;
	version: string;
	data: Record<string, Tactician>;
}

export async function getLittleLegendIconUrl(skinId: number): Promise<string> {
	const skinIdStr = skinId.toString();

	let tacticianData: TacticianDataFile | undefined;

	if (await fs.stat(TACTICIAN_FILE_PATH).then(() => true).catch(() => false)) {
		const raw = await fs.readFile(TACTICIAN_FILE_PATH, "utf-8");
		tacticianData = JSON.parse(raw);
	}

	if (!tacticianData) {
		logger.error("⚠️ tft-tactician.json not found.");
		return "";
	}

	const tactician = (tacticianData.data as { [key: string]: Tactician })[skinIdStr];

	if (!tactician) {
		logger.error(`No companion found for skinId: ${skinId}`);
		return "";
	}

	const baseImageName = tactician.image.full;
	const latestVersion = await new DDragon().versions.latest();
	const littleLegendUrl = `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/tft-tactician/${baseImageName}`;
	return littleLegendUrl;
}
