import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import ts from 'typescript';
import {createDatabase,compileSql,poolOptions} from '../lib/postgres.mjs';
import {importSnapshot,verifySnapshot} from '../scripts/data-transfer.mjs';
const engine=new PGlite();
const pool={query:(s,p)=>engine.query(s,p),connect:async()=>({query:(s,p)=>engine.query(s,p),release(){}})};
const compile=s=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64');
globalThis.__testDb=createDatabase(pool);
process.env.APP_ORIGIN='https://test.local';process.env.NODE_ENV='production';
const serverUrl=compile(readFileSync(new URL('../lib/hub-server.ts',import.meta.url),'utf8').replace("import { db } from './postgres.mjs';","const db=()=>globalThis.__testDb;"));
const server=await import(serverUrl);
const route=await import(compile(readFileSync(new URL('../app/api/hub/route.ts',import.meta.url),'utf8').replace("'@/lib/hub-server'",JSON.stringify(serverUrl))));
async function post(body,cookie='',origin='https://test.local'){return route.POST(new Request('https://test.local/api/hub',{method:'POST',headers:{origin,cookie,'Content-Type':'application/json'},body:JSON.stringify(body)}));}
async function login(username,password){const r=await post({action:'login',username,password});assert.equal(r.status,200,JSON.stringify(await r.clone().json()));assert.match(r.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);return r.headers.get('set-cookie').split(';')[0];}
async function get(cookie,query=''){return (await route.GET(new Request('https://test.local/api/hub'+query,{headers:{cookie}}))).json();}
const stamp='2026-09-07T00:00:00.000Z';
const makeUser=async(id,role)=>({id,username:id,password_hash:await server.hash('test-password-'+id),full_name:id,role,active:1,created_at:stamp,first_login:null,last_login:null,login_count:0});
test('Next.js API uses real PostgreSQL semantics; accounts, isolation and durable progress survive sessions',async()=>{
 await engine.exec(readFileSync(new URL('../database/001-initial.sql',import.meta.url),'utf8'));
 const snapshot={format:'project-gem-hub-export-v1',source_project_id:'test',captured_at:stamp,tables:{users:[await makeUser('teacher','admin'),await makeUser('project01','student'),await makeUser('project02','student')],gem_links:JSON.parse(readFileSync(new URL('../database/gems.json',import.meta.url),'utf8')),student_progress:[],activity_logs:[],login_logs:[],settings:[{key:'board',value:'0'}]}};
 const imported=await importSnapshot(pool,snapshot);assert.equal(imported.counts.users,3);assert.equal((await importSnapshot(pool,snapshot)).alreadyImported,true);
 assert.equal((await post({action:'login',username:'project01',password:'wrong'},'','https://evil.test')).status,403);
 const student=await login('project01','test-password-project01'),other=await login('project02','test-password-project02'),admin=await login('teacher','test-password-teacher');
 assert.equal((await post({action:'board',value:true},student)).status,403);
 assert.equal((await post({action:'complete',gemId:1},student)).status,200);
 for(let i=0;i<2;i++)assert.equal((await post({action:'open',gemId:1},student)).status,200);
 const own=await get(student),second=await get(other,'?student=project01');assert.equal(own.progress[0].status,'completed');assert.equal(own.progress[0].open_count,2);assert.equal(second.progress.length,0);assert.equal(own.students.length,0);assert.equal(own.user.password_hash,undefined);
 let all=await get(admin);assert.equal(all.students.length,2);assert.equal(typeof all.logins[0].count,'number');assert.equal(all.progress.length,1);
 assert.equal((await post({action:'gem',id:1,url:'https://evil.test',title:'x',description:'y',sequence:1,active:true},admin)).status,400);
 assert.equal((await post({action:'gem',id:1,url:snapshot.tables.gem_links[0].url,title:'Updated title',description:'Updated description',sequence:1,active:true},admin)).status,200);
 await post({action:'board',value:true},admin);const board=await get(other);assert.equal(board.boards.length,2);assert.equal(typeof board.boards[0].completed,'number');
 await post({action:'student',id:'project01',full_name:'Updated student',active:false},admin);assert.equal((await get(student)).user,null);
 await post({action:'student',id:'project01',full_name:'Updated student',active:true},admin);assert.equal((await get(student)).user,null);
 await post({action:'reset',id:'project01',password:'replacement-password'},admin);assert.equal((await post({action:'login',username:'project01',password:'test-password-project01'})).status,401);
 const renewed=await login('project01','replacement-password');assert.equal((await get(renewed)).progress[0].open_count,2);
 assert.equal((await post({action:'password',oldPassword:'replacement-password',password:'another-new-password'},renewed)).status,200);assert.equal((await get(renewed)).user,null);
 const last=await login('project01','another-new-password');await post({action:'logout'},last);assert.equal((await get(last)).user,null);
 assert.equal((await post({action:'student',username:'project03',full_name:'Third student',password:'new-student-password',active:1},admin)).status,200);
 for(let i=0;i<10;i++)assert.equal((await post({action:'login',username:'absent',password:'bad'})).status,401);
 assert.equal((await post({action:'login',username:'absent',password:'bad'})).status,429);
 await assert.rejects(importSnapshot(pool,snapshot),/mismatch/);
 const anonymous=await get('');assert.equal(anonymous.user,null);
 assert.equal(compileSql("SELECT '?' FROM users WHERE username=?").text,"SELECT '?' FROM gem_hub.users WHERE username=$1");
 await engine.exec('CREATE ROLE visitor; SET ROLE visitor');await assert.rejects(pool.query('SELECT * FROM gem_hub.users'),/permission denied/);await engine.exec('RESET ROLE');
 await engine.close();
});
test('old salted PBKDF2 password hashes remain valid after migration',async()=>{
 const legacy=await server.hash('Pj01@Gem26','legacy-salt',100000);assert.equal(await server.verify('Pj01@Gem26',legacy),true);assert.equal(await server.verify('wrong',legacy),false);
});
test('TLS certificate verification cannot be disabled for a remote database',()=>{
 process.env.DATABASE_SSL='disable';assert.throws(()=>poolOptions('postgres://u:p@example.com/db'),/TLS/);delete process.env.DATABASE_SSL;
 assert.equal(poolOptions('postgres://u:p@example.com/db?sslmode=require').ssl.rejectUnauthorized,true);
});
test('private source snapshot imports with exact values and no sessions',async t=>{
 if(!process.env.TEST_SNAPSHOT_PATH)return t.skip('Private source snapshot not supplied');
 const source=JSON.parse(readFileSync(process.env.TEST_SNAPSHOT_PATH,'utf8'));const pg=new PGlite();
 const dest={query:(s,p)=>pg.query(s,p),connect:async()=>({query:(s,p)=>pg.query(s,p),release(){}})};
 await pg.exec(readFileSync(new URL('../database/001-initial.sql',import.meta.url),'utf8'));
 const result=await importSnapshot(dest,source);assert.equal(result.counts.users,source.tables.users.length);assert.deepEqual(await verifySnapshot(dest,source),result.counts);assert.equal((await dest.query('SELECT COUNT(*)::int n FROM gem_hub.sessions')).rows[0].n,0);
 await pg.close();
});
