import { promises as fs } from "fs";
import { TACTICIAN_FILE_PATH } from "..";
import logger from "../logger/logger";
import { getLatestDDragonVersion } from "./ddragon";

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

// The tactician file is several hundred KB — read and parse it once, then
// serve every icon lookup from memory. The daily DDragon refresh in
// index.ts calls invalidateTacticianCache() after rewriting the file.
let tacticianDataPromise: Promise<TacticianDataFile | null> | null = null;

async function loadTacticianData(): Promise<TacticianDataFile | null> {
	try {
		const raw = await fs.readFile(TACTICIAN_FILE_PATH, "utf-8");
		return JSON.parse(raw);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			logger.error("⚠️ tft-tactician.json not found.");
			return null;
		}
		throw error;
	}
}

export function invalidateTacticianCache(): void {
	tacticianDataPromise = null;
}

function getTacticianData(): Promise<TacticianDataFile | null> {
	if (!tacticianDataPromise) {
		tacticianDataPromise = loadTacticianData();
		// Don't memoize a transient read failure — retry on next call.
		tacticianDataPromise.catch(() => { tacticianDataPromise = null; });
	}
	return tacticianDataPromise;
}

export async function getLittleLegendIconUrl(skinId: number): Promise<string> {
	const tacticianData = await getTacticianData();
	if (!tacticianData) {
		return "";
	}

	const tactician = tacticianData.data[skinId.toString()];

	if (!tactician) {
		logger.error(`No companion found for skinId: ${skinId}`);
		return "";
	}

	const latestVersion = await getLatestDDragonVersion();
	return `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/tft-tactician/${tactician.image.full}`;
}
