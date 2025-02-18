export const ErrorTypes = {
	SERVER_NOT_INITIALIZE: 'SERVER_NOT_INITIALIZE',
	DATABASE_ALREADY_INSIDE: 'DATABASE_ALREADY_INSIDE',
	DATABASE_ERROR: 'DATABASE_ERROR',
	PLAYER_NOT_FOUND: 'PLAYER_NOT_FOUND',
} as const;

type ErrorType = keyof typeof ErrorTypes;

export class AppError extends Error {
	public type: ErrorType;
	public timestamp: Date;

	constructor(type: ErrorType, message: string) {
		super(message);
		this.type = type;
		this.timestamp = new Date();
	}
}