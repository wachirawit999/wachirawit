import {loadEnvFile} from 'node:process';
import pg from 'pg';
import {getConnectionString} from '@netlify/database';
import {poolOptions} from '../lib/postgres.mjs';
try{loadEnvFile('.env.local');}catch(e){if(e.code!=='ENOENT')throw e;}
export const connect=()=>new pg.Pool(poolOptions(process.env.MIGRATION_DATABASE_URL||process.env.DATABASE_URL||getConnectionString()));
