var config = {};

config.apiMetaDataAPI = "http://localhost:9090/apiMetadata/"
config.devportalAPI = "http://localhost:3000/devportal/"
config.port = 3000
config.mode = 'multi'
config.db = {
    username: 'postgres',
    password: 'postgres',
    database: 'dev',
    host: 'localhost',
    dialect: 'postgres',
};

module.exports = config;
