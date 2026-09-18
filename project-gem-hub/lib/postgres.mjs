import pg from 'pg';
import {getConnectionString} from '@netlify/database';
const {Pool}=pg;
const tables=new Set(['users','gem_links','student_progress','sessions','login_logs','activity_logs','settings','login_attempts']);
/** Compile only trusted application SQL. Values always remain parameterized. */
export function compileSql(sql){
 let out='',index=0,i=0;
 while(i<sql.length){
  const c=sql[i];
  if(c==="'"||c==='"'){
   const quote=c;out+=c;i++;
   while(i<sql.length){const x=sql[i++];out+=x;if(x===quote){if(sql[i]===quote){out+=sql[i++];}else break;}}
  }else if(c==='?'){out+='$'+(++index);i++;}
  else if(/[a-zA-Z_]/.test(c)){let word='';while(i<sql.length&&/[a-zA-Z0-9_]/.test(sql[i]))word+=sql[i++];out+=tables.has(word)?'gem_hub.'+word:word;}
  else{out+=c;i++;}
 }
 return {text:out,parameterCount:index};
}
export function createDatabase(pool){
 class Statement{
  constructor(sql,params=[]){this.sql=sql;this.params=params;}
  bind(...params){return new Statement(this.sql,params);}
  async execute(client=pool){const q=compileSql(this.sql);if(q.parameterCount!==this.params.length)throw Error('SQL parameter count mismatch');return client.query(q.text,this.params);}
  async first(){const r=await this.execute();return r.rows[0]??null;}
  async all(){const r=await this.execute();return {results:r.rows};}
  async run(){return this.execute();}
 }
 return {prepare:sql=>new Statement(sql),batch:async statements=>{
  const client=await pool.connect();
  try{await client.query('BEGIN');const results=[];for(const statement of statements)results.push(await statement.execute(client));await client.query('COMMIT');return results;}
  catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }};
}
let pool;
export function poolOptions(connectionString=process.env.DATABASE_URL||getConnectionString()){
 if(!connectionString)throw Error('DATABASE_URL is not configured');
 const url=new URL(connectionString);if(!['postgres:','postgresql:'].includes(url.protocol))throw Error('Invalid database URL');
 const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
 const sslDisabled=process.env.DATABASE_SSL==='disable';if(sslDisabled&&!local)throw Error('TLS may only be disabled for a local database');
 // Avoid pg connection-string sslmode silently overriding the verified TLS object.
 for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(key);
 return {connectionString:url.toString(),ssl:sslDisabled?false:{rejectUnauthorized:true,...(process.env.DATABASE_CA_CERT?{ca:process.env.DATABASE_CA_CERT.replaceAll('\\n','\n')}:{})},max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:10000,allowExitOnIdle:true};
}
export function getPool(){if(!pool){pool=new Pool(poolOptions());pool.on('error',()=>console.error('Database connection unavailable'));}return pool;}
export function db(){return createDatabase(getPool());}
