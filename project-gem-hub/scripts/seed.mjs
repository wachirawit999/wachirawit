import {readFile} from 'node:fs/promises';
import {pbkdf2Sync,randomUUID} from 'node:crypto';
import {connect} from './connection.mjs';
import {importSnapshot} from './data-transfer.mjs';
const password=process.env.ADMIN_PASSWORD;if(!password||password.length<16)throw Error('Set ADMIN_PASSWORD to at least 16 characters. Use db:import instead if migrating existing users.');
const hash=p=>{const salt=randomUUID();return `pbkdf2-sha256:600000:${salt}:${pbkdf2Sync(p,salt,600000,32,'sha256').toString('hex')}`;};
const stamp=new Date().toISOString();
const user=(id,username,p,full_name,role)=>({id,username,password_hash:hash(p),full_name,role,active:1,created_at:stamp,first_login:null,last_login:null,login_count:0});
const users=[user('admin',process.env.ADMIN_USERNAME||'teacher',password,'ครูวชิรวิทย์ เอี่ยมวิลัย','admin')];
for(let i=1;i<=30;i++){const n=String(i).padStart(2,'0');users.push(user('student'+n,'project'+n,'Pj'+n+'@Gem26','นักเรียน '+n,'student'));}
const snapshot={format:'project-gem-hub-export-v1',source_project_id:'fresh-install',captured_at:stamp,tables:{users,gem_links:JSON.parse(await readFile(new URL('../database/gems.json',import.meta.url),'utf8')),student_progress:[],login_logs:[],activity_logs:[],settings:[{key:'board',value:'0'}]}};
const pool=connect();try{console.log('Seed completed:',(await importSnapshot(pool,snapshot)).counts);}catch(e){console.error('Seed stopped:',e.message);process.exitCode=1;}finally{await pool.end();}
