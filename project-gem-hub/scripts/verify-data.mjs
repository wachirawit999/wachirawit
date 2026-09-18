import {readFile} from 'node:fs/promises';
import {connect} from './connection.mjs';
import {verifySnapshot} from './data-transfer.mjs';
if(!process.argv[2])throw Error('Pass the snapshot JSON path');
const snapshot=JSON.parse(await readFile(process.argv[2],'utf8'));const pool=connect();
try{console.log('All fields match:',await verifySnapshot(pool,snapshot));}catch(e){console.error('Verification failed:',e.message);process.exitCode=1;}finally{await pool.end();}
