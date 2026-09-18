import {readFile} from 'node:fs/promises';
import {connect} from './connection.mjs';
const pool=connect();const client=await pool.connect();
try{await client.query('BEGIN');await client.query(await readFile(new URL('../database/001-initial.sql',import.meta.url),'utf8'));await client.query('COMMIT');console.log('Database schema ready. No student data was seeded or replaced.');}
catch(e){await client.query('ROLLBACK');console.error('Migration failed:',e.code||e.name);process.exitCode=1;}
finally{client.release();await pool.end();}
