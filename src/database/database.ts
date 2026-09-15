import { Sequelize } from 'sequelize';

// SQLite doesn't use a username/password/host — keep them out of the repo.
const sequelize = new Sequelize({
	dialect: 'sqlite',
	logging: false,
	storage: 'database.sqlite',
});

export default sequelize;