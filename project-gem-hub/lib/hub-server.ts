import { db } from './postgres.mjs';
export { db };
export const now=()=>new Date().toISOString();
export const uid=()=>crypto.randomUUID();
export async function digest(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function hash(p:string,salt=uid(),iterations=600000){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(p),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations,hash:'SHA-256'},key,256);
 const hex=Array.from(new Uint8Array(bits)).map(x=>x.toString(16).padStart(2,'0')).join('');
 return iterations===100000?salt+':'+hex:`pbkdf2-sha256:${iterations}:${salt}:${hex}`;
}
export async function verify(p:string,h:string){
 const parts=h.split(':');let expected:string;
 if(parts.length===2){expected=await hash(p,parts[0],100000);}
 else if(parts.length===4&&parts[0]==='pbkdf2-sha256'&&Number(parts[1])>=100000&&Number(parts[1])<=1000000){expected=await hash(p,parts[2],Number(parts[1]));}
 else{return false;}
 let d=expected.length^h.length;for(let i=0;i<expected.length;i++)d|=expected.charCodeAt(i)^h.charCodeAt(i);return d===0;
}
export async function current(req:Request){const t=req.headers.get('cookie')?.match(/(?:^|; )gem_session=([^;]+)/)?.[1];if(!t)return null;return db().prepare('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>? AND u.active=1').bind(await digest(t),now()).first();}
export const safeUser=(u:any)=>{const {password_hash,...rest}=u;return rest;};
export function log(user:string,type:string,gem:number|null=null){return db().prepare('INSERT INTO activity_logs(id,user_id,activity_type,gem_id,created_at) VALUES(?,?,?,?,?)').bind(uid(),user,type,gem,now());}

export function requestIp(req:Request){return process.env.NETLIFY==='true'?req.headers.get('x-nf-client-connection-ip')||'unknown':'unknown';}
export function trustedOrigin(req:Request){
 const origin=req.headers.get('origin');if(!origin)return false;
 const trusted=[process.env.APP_ORIGIN,process.env.URL].filter(Boolean);
 if(process.env.NETLIFY!=='true'&&process.env.NODE_ENV!=='production')trusted.push(new URL(req.url).origin);
 return trusted.some(v=>{try{return new URL(v!).origin===origin;}catch{return false;}});
}
