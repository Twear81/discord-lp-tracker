import { Model } from 'sequelize';
import Player from '../database/playerModel';
import { AppError, ErrorTypes } from '../error/error';

const trackPlayer = async (): Promise<void> => {
    // Every 10 min, track all the players
    // Get all the servers

    // Get all the players for each server
};

const listAllPlayer = async (serverId: string): Promise<Model<string, string>[]> => {
    try {
        const playerList: Model<string, string>[] = await Player.findAll({ attributes: ['accountnametag', 'region'] });
        return playerList;
    } catch (error: any) {
        if (error.type === ErrorTypes.SERVER_NOT_INITIALIZE) {
            throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
        } else {
            console.error(`❌ Failed to retrieve players for serverID -> ${serverId} :`, error);
            throw new AppError(ErrorTypes.DATABASE_ERROR, `Failed to retrieve players for serverID -> ${serverId}`);
        }
    }
};

const startTracking = async (): Promise<void> => {
    // Every 10 min, track all the players
    // Get all the servers

    // Get all the players for each server
};

export { startTracking, trackPlayer, listAllPlayer };