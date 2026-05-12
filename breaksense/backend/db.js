const sql = require('mssql');

const dbConfig = {
  user: 'breaksense_user',
  password: 'Break123!',
  server: 'ANNSTHORNS',
  database: 'BreakSenseDB',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    port: 1433
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