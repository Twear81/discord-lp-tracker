import { Sequelize } from 'sequelize';

// Initialize Sequelize (replace with your database credentials)
const sequelize = new Sequelize('database', 'user', 'F*1m$4dc%lR8iT', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    // SQLite only
    storage: 'database.sqlite',
});

export default sequelize;