const { Pool } = require('pg')
const pool = new Pool({
  user: 'ayon',
  host: 'localhost',
  database: 'library_app',
  password: 'admin',
  port: 5433,
})

module.exports = {
  query: (text: string, params?: any[]) => pool.query(text, params),
}
