const ErrorTypes = {
	SERVER_NOT_INITIALIZE: 'SERVER_NOT_INITIALIZE',
	DATABASE_ALREADY_INSIDE: 'DATABASE_ALREADY_INSIDE',
	DATABASE_ERROR: 'DATABASE_ERROR',
};

class AppError extends Error {
	constructor(type, message) {
		super(message);
		this.type = type;
		this.timestamp = new Date();
	}
}

module.exports = { AppError, ErrorTypes };