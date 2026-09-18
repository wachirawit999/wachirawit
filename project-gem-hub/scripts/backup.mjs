import {writeFile,mkdir,chmod} from 'node:fs/promises';
import path from 'node:path';
import {connect} from './connection.mjs';
import {columns} from './data-transfer.mjs';
const output=process.argv[2]||`backups/snapshot-${new Date().toISOString().replaceAll(':','-')}.json`;
const pool=connect(),client=await pool.connect();
try{
 await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 const snapshot={format:'project-gem-hub-export-v1',source_project_id:process.env.SITE_ID||'netlify-project-gem-hub',captured_at:new Date().toISOString(),tables:{}};
 for(const[table,fields]of Object.entries(columns))snapshot.tables[table]=(await client.query(`SELECT ${fields.join(',')} FROM gem_hub.${table}`)).rows;
 await client.query('COMMIT');await mkdir(path.dirname(output),{recursive:true,mode:0o700});
 await writeFile(output,JSON.stringify(snapshot,null,2),{mode:0o600,flag:'wx'});await chmod(output,0o600);
 console.log('Private backup saved. Contains personal data and password hashes: do not upload to GitHub or public hosting.');
}catch(e){await client.query('ROLLBACK');console.error('Backup failed:',e.code||e.name);process.exitCode=1;}finally{client.release();await pool.end();}
