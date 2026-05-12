const sql = require('mssql');

const dbConfig = {
  user: process.env.DB_USER || 'breaksense_user',
  password: process.env.DB_PASSWORD || 'Break123!',
  server: process.env.DB_SERVER || 'ANNSTHORNS',
  database: process.env.DB_NAME || 'BreakSenseDB',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    port: parseInt(process.env.DB_PORT) || 1433
  }
};

const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('✅ Connected to SSMS using SQL Login: breaksense_user');
        return pool;
    })
    .catch(err => {
        console.error('❌ Database Connection Failed!', err);
        // Throw the error so poolPromise rejects rather than resolving to undefined
        throw err;
    });

module.exports = { sql, poolPromise };