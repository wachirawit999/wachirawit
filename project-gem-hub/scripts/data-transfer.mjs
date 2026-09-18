import {createHash} from 'node:crypto';
export const columns={
 users:['id','username','password_hash','full_name','role','active','created_at','first_login','last_login','login_count'],
 gem_links:['id','sequence','title','description','url','active'],
 student_progress:['user_id','gem_id','status','first_opened_at','last_opened_at','open_count','completed_at'],
 login_logs:['id','user_id','login_at','ip_address','user_agent'],
 activity_logs:['id','user_id','activity_type','gem_id','created_at','metadata'],
 settings:['key','value']
};
const keys={users:['id'],gem_links:['id'],student_progress:['user_id','gem_id'],login_logs:['id'],activity_logs:['id'],settings:['key']};
export function validateSnapshot(snapshot){
 if(snapshot.format!=='project-gem-hub-export-v1'||typeof snapshot.source_project_id!=='string'||!Number.isFinite(Date.parse(snapshot.captured_at)))throw Error('Invalid snapshot metadata');
 for(const [table,fields]of Object.entries(columns)){
  if(!Array.isArray(snapshot.tables?.[table]))throw Error('Missing table '+table);
  const seen=new Set();
  for(const row of snapshot.tables[table]){
   if(fields.some(c=>!(c in row))||Object.keys(row).some(c=>!fields.includes(c)))throw Error('Incomplete or unknown columns in '+table);
   if(Object.values(row).some(v=>v!==null&&!['string','number'].includes(typeof v)))throw Error('Invalid data type in '+table);
   const key=JSON.stringify(keys[table].map(c=>row[c]));if(seen.has(key))throw Error('Duplicate row in '+table);seen.add(key);
  }
 }
 if(!snapshot.tables.users.some(u=>u.role==='admin'))throw Error('Snapshot has no administrator');
 return snapshot;
}
export const fingerprint=s=>createHash('sha256').update(JSON.stringify(s)).digest('hex');
export async function verifySnapshot(client,snapshot){
 validateSnapshot(snapshot);const counts={};
 for(const [table,fields] of Object.entries(columns)){
  const {rows}=await client.query(`SELECT ${fields.join(',')} FROM gem_hub.${table}`);
  counts[table]=rows.length;if(rows.length!==snapshot.tables[table].length)throw Error('Row count mismatch in '+table);
  const actual=new Map(rows.map(r=>[JSON.stringify(keys[table].map(c=>r[c])),r]));
  for(const expected of snapshot.tables[table]){
   const got=actual.get(JSON.stringify(keys[table].map(c=>expected[c])));
   if(!got||fields.some(c=>got[c]!==expected[c]))throw Error('Value mismatch in '+table);
  }
 }
 return counts;
}
/** The destination must be empty. A repeated identical import is verified, never overwritten. */
export async function importSnapshot(pool,input){
 const snapshot=validateSnapshot(input),id=fingerprint(snapshot),client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query('LOCK TABLE gem_hub.users IN EXCLUSIVE MODE');
  const prior=await client.query('SELECT fingerprint FROM gem_hub.import_runs WHERE fingerprint=$1',[id]);
  if(prior.rows.length){const counts=await verifySnapshot(client,snapshot);await client.query('COMMIT');return {alreadyImported:true,counts};}
  const existing=await client.query('SELECT id FROM gem_hub.users LIMIT 1');
  if(existing.rows.length)throw Error('Destination already contains users; refusing to overwrite live or previously imported data');
  for(const[table,fields]of Object.entries(columns)){
   for(const row of snapshot.tables[table])await client.query(`INSERT INTO gem_hub.${table} (${fields.join(',')}) VALUES (${fields.map((_,i)=>'$'+(i+1)).join(',')})`,fields.map(c=>row[c]));
  }
  const counts=await verifySnapshot(client,snapshot);
  await client.query('INSERT INTO gem_hub.import_runs(fingerprint,source_project_id,captured_at) VALUES($1,$2,$3)',[id,snapshot.source_project_id,snapshot.captured_at]);
  await client.query('COMMIT');return {alreadyImported:false,counts};
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
