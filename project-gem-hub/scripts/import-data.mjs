import {readFile} from 'node:fs/promises';
import {connect} from './connection.mjs';
import {importSnapshot,validateSnapshot} from './data-transfer.mjs';
const path=process.argv[2];if(!path)throw Error('Usage: npm run db:import -- /private/path/snapshot.json');
const snapshot=validateSnapshot(JSON.parse(await readFile(path,'utf8')));const pool=connect();
try{const result=await importSnapshot(pool,snapshot);console.log(result.alreadyImported?'Identical import verified.':'Import completed and every field verified.');console.log(result.counts);console.log('Old login sessions were not copied. Users must sign in again with their existing passwords.');}
catch(e){console.error('Import stopped:',e.message);process.exitCode=1;}finally{await pool.end();}
