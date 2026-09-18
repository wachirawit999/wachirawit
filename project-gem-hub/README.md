# PROJECT GEM HUB — Next.js / Netlify

## ความคืบหน้าล่าสุด: 7 กันยายน 2026

- สร้างโครงการ Netlify `project-gem-hub-pcshsl` ในทีม `bee-wachirawit` แล้ว
- Project ID: `7f3a89d5-649e-409a-8432-b7fc2b87c868` — ใช้โครงการนี้ต่อ ห้ามสร้างซ้ำ
- Dashboard: https://app.netlify.com/projects/project-gem-hub-pcshsl
- **ยังไม่มี deployment ที่พร้อมใช้งาน และยังไม่ได้นำเข้าข้อมูล production**
- เพิ่ม `@netlify/database` แล้ว: หากไม่ได้กำหนด DATABASE_URL ระบบใช้ connection string ที่ Netlify จัดให้
- มี schema migration ที่ `netlify/database/migrations/001_initial-schema/migration.sql` เพื่อให้ Netlify นำไปใช้ตอน deploy
- ใช้ Netlify Database เป็นเส้นทางหลักต่อจากนี้; ขั้นตอน Supabase ด้านล่างเป็นทางเลือกสำหรับฐานข้อมูลภายนอกที่กำหนดเอง
- ยังต้องเชื่อม GitHub, push โค้ด, เชื่อม repository กับ Netlify, deploy, นำเข้าข้อมูลล่าสุด และทดสอบออนไลน์
- Netlify CLI ใน workspace ยังไม่ authenticated แม้ connector ของบัญชี Netlify จะเชื่อมแล้ว
- อย่านำสำเนาข้อมูลนักเรียนลง Git หรือ migration SQL; นำเข้าผ่านเครื่องมือนำเข้าที่เชื่อมฐานปลายทางด้วยสิทธิ์ผู้ดูแลเท่านั้น
- ก่อนเปิดให้นักเรียนใช้ ตรวจ visitor access: โครงการที่สร้างมีการจำกัด SSO ของทีมอยู่ ต้องปรับให้เข้าถึงสาธารณะหลังทดสอบเรียบร้อย

บันทึกด้านล่างเป็นขั้นตอนเตรียมย้ายเดิม บางข้อความเกี่ยวกับการเชื่อม Netlify ถูกแทนที่ด้วยสถานะล่าสุดด้านบน

เวอร์ชันย้ายระบบจาก Sites เป็น **Next.js 16 + Netlify + PostgreSQL (Supabase)** พร้อมหน้าบ้านนักเรียนและหลังบ้านครูเดิม

## สถานะการเตรียมย้าย

- เปลี่ยนจาก Vinext/Cloudflare เป็น Next.js ที่ build ด้วย `next build` แล้ว
- เปลี่ยน D1 เป็น PostgreSQL ผ่านการเชื่อมต่อฝั่งเซิร์ฟเวอร์
- มี schema, migration, seed สำหรับติดตั้งใหม่, import, verify และ backup
- รองรับแฮชรหัสผ่านเดิม จึงไม่ต้องเปลี่ยนรหัสนักเรียนเมื่อย้าย; รหัสใหม่ใช้ PBKDF2-SHA256 600,000 iterations
- ทดสอบ API กับ PostgreSQL engine (PGlite) ผ่าน และทดลองนำเข้าสำเนาข้อมูลจริงโดยเทียบทุกช่องผ่าน
- **ยังไม่ได้สร้างหรือเชื่อมฐานข้อมูล Supabase จริง ยังไม่ได้ push GitHub และยังไม่ได้เผยแพร่บน Netlify**
- การทดสอบในเครื่องไม่ใช่หลักฐานว่าปลายทางออนไลน์ทำงานแล้ว ต้องทดสอบปลายทางอีกครั้งหลังเชื่อมบริการ
- เว็บไซต์ Sites เดิมยังเปิดอยู่ ข้อมูลที่เพิ่มหลังสำรองครั้งนี้ต้องเก็บอีกครั้งก่อนย้ายจริง

## สิ่งที่ต้องเชื่อมต่อ

1. บัญชี Netlify — เชื่อมกับ ChatGPT แล้ว แต่รอบเตรียมไฟล์ยังไม่สามารถเรียกคำสั่งเผยแพร่ของตัวเชื่อมต่อได้
2. GitHub — สำหรับเก็บ source และให้ Netlify build อัตโนมัติ
3. Supabase — สำหรับฐานข้อมูล PostgreSQL

อย่าส่งรหัสผ่านบัญชี GitHub/Netlify หรือ DATABASE_URL ลงแชต ให้เชื่อมบริการหรือกรอกเป็น Secret ในหน้าตั้งค่าบริการ

## วิธีใช้งานโฟลเดอร์นี้

ไฟล์ ZIP โค้ดมี `package.json` และ `netlify.toml` ที่ root นำ **เนื้อหาภายใน ZIP** เป็น root ของ GitHub repository ใหม่

โค้ดสำเนาในโครงการ Sites อยู่ใน `netlify-app/` หากใช้ repository ใหญ่ทั้งชุด ให้ตั้ง Base directory ของ Netlify เป็น `netlify-app` ส่วน ZIP ที่จัดให้แยกไว้แล้ว ไม่ต้องตั้ง Base directory

**ห้ามอัปโหลดไฟล์สำรองนักเรียนไป GitHub หรือวางใน public/** ไฟล์สำรองมีชื่อ ประวัติ IP และแฮชรหัสผ่าน โค้ดใน ZIP แยกออกจากข้อมูลสำรองแล้ว

## 1. สร้างฐานข้อมูล Supabase

1. เปิด https://supabase.com/dashboard และเข้าสู่ระบบ
2. สร้าง New project ในองค์กรของคุณ ตั้งชื่อ เช่น `project-gem-hub`
3. ตั้งรหัสผ่านฐานข้อมูลที่เดายากและเก็บไว้ในตัวจัดการรหัสผ่าน เลือกภูมิภาคใกล้ผู้ใช้ และตรวจสอบแพ็กเกจก่อนสร้าง
4. เมื่อพร้อม เปิด SQL Editor สร้างคำสั่งใหม่ คัดลอกเนื้อหาทั้งหมดของ `database/001-initial.sql` แล้ว Run
5. ตารางสร้างใน schema `gem_hub` ซึ่งไม่ได้เปิดให้ browser หรือ Supabase Data API อ่านโดยตรง
6. กด Connect เลือก **Transaction pooler** และคัดลอก URI สำหรับแอป serverless เช่น `postgresql://...:6543/postgres`
7. ใส่รหัสผ่านจริงแทนช่องตัวอย่างใน URI โดย percent-encode อักขระพิเศษตามรูปแบบ URL
8. สำหรับคำสั่ง migrate/import ในเครื่อง ใช้ direct connection หรือ Session pooler จาก Connect เป็น `MIGRATION_DATABASE_URL`

เซิร์ฟเวอร์ใช้ credential ของเจ้าของ schema และตรวจบทบาทนักเรียน/ครูทุกคำขอ ไม่มีการใช้ anon key เพื่ออ่าน users หรือ password_hash

อ้างอิง: https://supabase.com/docs/guides/database/connecting-to-postgres

## 2. เตรียมเครื่องและ Environment

1. ติดตั้ง Node.js 22.13 ขึ้นไป
2. แตก ZIP เปิด Terminal ในโฟลเดอร์ที่มี package.json
3. รัน `npm ci`
4. คัดลอก `.env.example` เป็น `.env.local`
5. กรอก `DATABASE_URL`, `MIGRATION_DATABASE_URL` และ `APP_ORIGIN`
6. สำหรับทดลองในเครื่อง ใช้ `APP_ORIGIN=http://localhost:3000` แต่ DATABASE_URL ยังคงเชื่อมฐานข้อมูลทดสอบภายนอกได้
7. ถ้าใช้ PostgreSQL ที่ localhost ตั้ง `DATABASE_SSL=disable` ได้เฉพาะ localhost ห้ามปิดการตรวจ TLS ของฐานข้อมูลภายนอก
8. หากผู้ให้บริการต้องการ CA เพิ่ม ใส่ PEM certificate ที่ได้รับจากผู้ให้บริการใน `DATABASE_CA_CERT` ระบบยังตรวจความถูกต้องของ certificate เสมอ

| ตัวแปร | ใช้เพื่อ |
|---|---|
| DATABASE_URL | เชื่อม PostgreSQL จาก Netlify server routes; เป็น Secret |
| APP_ORIGIN | URL หลัก เช่น https://ชื่อเว็บ.netlify.app ใช้ตรวจ Origin ป้องกัน CSRF |
| DATABASE_CA_CERT | CA PEM เพิ่มเติม หากผู้ให้บริการต้องใช้ |
| DATABASE_SSL | เว้นว่างสำหรับ production; disable ได้เฉพาะฐานข้อมูล localhost |
| MIGRATION_DATABASE_URL | ใช้เฉพาะ CLI สำหรับ schema/import/backup; ไม่จำเป็นต้องใส่ Netlify |
| ADMIN_USERNAME | ชื่อครูสำหรับ seed ฐานข้อมูลใหม่เท่านั้น |
| ADMIN_PASSWORD | รหัสครูอย่างน้อย 16 ตัวอักษรสำหรับ seed ใหม่; ไม่ต้องใช้เมื่อย้ายข้อมูลเดิม |

Netlify จัดเตรียม `URL` อัตโนมัติ ซึ่งเซิร์ฟเวอร์ยอมรับเป็น Origin ของเว็บได้ด้วย ต้องเพิ่ม APP_ORIGIN เมื่อใช้โดเมนอื่น ห้ามใช้ตัวแปร NEXT_PUBLIC_ สำหรับข้อมูลลับ

## 3. ย้ายข้อมูลเดิม (เส้นทางที่ควรใช้กับโครงการนี้)

มีข้อมูลใช้งานจริงแล้ว จึง **ใช้ import แทน seed**

1. เตรียมฐานข้อมูลปลายทางที่ยังไม่มีบัญชีใน schema gem_hub
2. เก็บสำเนาข้อมูลเดิมล่าสุดขณะไม่มีการใช้งานหรือในช่วงย้ายที่หยุดการเขียนข้อมูลแล้ว การอ่านหลายตารางทีละหน้าไม่ใช่ snapshot แบบ transaction เดียว
3. วางไฟล์ `snapshot.json` ไว้นอกโฟลเดอร์โค้ด เช่นโฟลเดอร์ส่วนตัว
4. รัน `npm run db:migrate`
5. รัน `npm run db:import -- /เส้นทางส่วนตัว/snapshot.json`
6. รัน `npm run db:verify -- /เส้นทางส่วนตัว/snapshot.json` ก่อนเริ่มทดลอง Login เพื่อเทียบทุกช่องรวมแฮชรหัสผ่าน
7. การ import ใช้ transaction เดียว หากข้อมูลไม่ครบหรือไม่ตรงจะ rollback และไม่ทิ้งการนำเข้าครึ่งหนึ่ง
8. หากฐานข้อมูลปลายทางมีบัญชีอยู่แล้ว ตัวนำเข้าจะหยุดเพื่อไม่ทับข้อมูลสด; นำเข้าไฟล์เดิมซ้ำได้เฉพาะเมื่อข้อมูลยังตรงกันทุกช่อง
9. ไม่ย้าย session และ login_attempts เดิม นักเรียนและครูเข้าสู่ระบบใหม่ด้วยรหัสเดิม
10. อย่าใช้คำสั่ง seed หลัง import; ถ้าต้องเก็บสำรองรอบใหม่ก่อนเปิดจริง ใช้ฐานข้อมูล staging ว่างใหม่และเก็บสำรองฐานเดิมไว้

ข้อมูลที่ย้าย: users, gem_links, student_progress, login_logs, activity_logs, settings

ข้อมูลตั้งต้นที่ตรวจพบในรอบเตรียม: 31 บัญชีรวมครู, 7 Gems, 7 แถวความก้าวหน้า, 8 ประวัติ Login, 23 กิจกรรม, 1 ค่าตั้งระบบ นักเรียนเข้าสู่ระบบแล้ว 3 บัญชี ตัวเลขนี้เป็นข้อมูล ณ เวลาสำรอง ไม่ใช่ยอดล่าสุดตลอดเวลา

## 4. ทางเลือก: เริ่มฐานข้อมูลใหม่โดยไม่ใช้ข้อมูลเดิม

ใช้เฉพาะเมื่อยืนยันว่าไม่ต้องย้ายข้อมูลเก่า:

1. ตั้ง ADMIN_USERNAME และ ADMIN_PASSWORD ใน .env.local
2. รัน `npm run db:migrate`
3. รัน `npm run db:seed`
4. จะได้ครู 1 บัญชี นักเรียน project01 ถึง project30 และ Gems 7 รายการ
5. รหัสนักเรียนเริ่มต้น Pj01@Gem26 ถึง Pj30@Gem26 ให้เปลี่ยนหลัง Login

## 5. นำโค้ดขึ้น GitHub

1. เปิด https://github.com เข้าสู่ระบบ
2. เลือกเครื่องหมาย + แล้ว New repository
3. ตั้งชื่อ `project-gem-hub` เลือก Private และ Create repository
4. เพิ่มเนื้อหาภายใน ZIP โดยใช้ Git หรือ Upload files; สำหรับไฟล์ .gitignore/.env.example/.github แนะนำใช้ Git เพื่อให้ครบ
5. ต้องมี app/, components/, lib/, database/, scripts/, tests/, package.json, package-lock.json, netlify.toml และไฟล์ config ที่ root
6. ไม่อัปโหลด node_modules, .next, .env.local หรือ snapshot.json
7. GitHub Actions ที่แนบจะทดสอบและ build เมื่อ push ถ้าใช้ ZIP นี้เป็น repository root

ถ้าใช้ Git:

```bash
git init -b main
git add .
git commit -m "Prepare Project Gem Hub for Netlify"
git remote add origin https://github.com/YOUR_ACCOUNT/project-gem-hub.git
git push -u origin main
```

ระบบเข้าสู่ GitHub ใช้ flow ของ GitHub ห้ามฝัง token ใน remote URL

อ้างอิง: https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository

## 6. เชื่อม Netlify และเผยแพร่

1. เปิด https://app.netlify.com และเข้าสู่ระบบ
2. เลือก Add new project → Import an existing project แล้วเชื่อม GitHub
3. เลือก repository project-gem-hub และ branch main
4. หาก repository มาจาก ZIP นี้ ให้ Base directory ว่าง
5. Build command: `npm run build` / Publish directory: `.next` / Node: 22
6. Netlify ใช้ OpenNext adapter ให้ Next.js โดยอัตโนมัติ ไม่ต้อง static export
7. ใน Environment variables เพิ่ม DATABASE_URL เป็นค่าลับ และ APP_ORIGIN เป็น URL จริงของเว็บ (ถ้ายังไม่ทราบ URL ใช้ URL ที่ Netlify จัดให้โดยอัตโนมัติก่อนได้)
8. ตั้งค่าเหล่านี้ใน production context หลีกเลี่ยงให้ deploy previews เขียนฐานข้อมูลนักเรียนจริง; หากใช้ preview ให้มีฐานข้อมูลทดสอบแยก
9. กด Deploy แล้วรอจน deployment สำเร็จ
10. เปิดลิงก์ .netlify.app ที่ Netlify แสดง ถ้าแก้ environment หลัง deploy ต้อง deploy อีกครั้งเพื่อใช้ค่าใหม่

**การลาก ZIP ลง Netlify Drop ไม่รองรับระบบหลังบ้านนี้** ต้อง build Next.js ด้วยขั้นตอนเชื่อม repository หรือ Netlify CLI ที่ใช้ runtime adapter

อ้างอิง:
- https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/
- https://docs.netlify.com/build/configure-builds/environment-variables/

## 7. ตรวจรับปลายทางก่อนให้นักเรียนใช้

1. เปิดหน้าเว็บใหม่ใน private/incognito window
2. Login บัญชีนักเรียนที่ย้ายมา ตรวจชื่อและความก้าวหน้าเดิม
3. เปิด Gem หนึ่งรายการ ตรวจว่าเปิดลิงก์ถูกต้อง และเพิ่มประวัติการเปิด
4. กดเสร็จ รีเฟรช แล้ว Logout/Login ใหม่ ความก้าวหน้าต้องอยู่
5. ใช้อีกบัญชีหนึ่ง ต้องไม่เห็นข้อมูลส่วนตัวของบัญชีแรก
6. Login ครู ตรวจ Students, Progress Monitor, Activity Monitor และ Analytics
7. รีเซ็ตรหัสผ่านบัญชีทดสอบ รหัสเก่าต้องใช้ไม่ได้และ session เดิมถูกยกเลิก
8. เปิด–ปิดบัญชีทดสอบ ปิดแล้วต้องเข้าใช้ไม่ได้ ข้อมูลเดิมยังคงอยู่
9. เปิดและปิด Progress Board ทดสอบว่านักเรียนเห็นเฉพาะข้อมูลที่ครูอนุญาต
10. ทดสอบครบก่อนประกาศเปลี่ยนลิงก์ให้ห้องเรียน ข้อมูลทดสอบต้องใช้บัญชีทดสอบที่ครูเพิ่มแยกเมื่อย้ายเสร็จ เพื่อลดการแก้สถานะจริง

`npm test` ใช้ PostgreSQL engine ในเครื่องเพื่อทดสอบกติกาฐานข้อมูลและ API ไม่ได้เรียกฐาน production

## 8. สำรองและกู้คืน

- รัน `npm run db:backup -- /เส้นทางส่วนตัว/snapshot-backup.json`
- สำรองใช้ transaction REPEATABLE READ เพื่อให้ข้อมูลหลายตารางสอดคล้องกัน
- ไฟล์มีข้อมูลส่วนตัวและ password hashes เก็บในที่ส่วนตัว ห้ามเผยแพร่
- กู้คืนเข้าฐานว่างด้วย db:migrate → db:import → db:verify
- ยังไม่ได้ตั้งเวลาสำรองอัตโนมัติ

## โครงสร้างและความปลอดภัย

- app/api/hub/route.ts: Next.js Node runtime API และการตรวจบทบาท
- lib/postgres.mjs: verified TLS, connection pool, bound parameters, transaction
- lib/hub-server.ts: password compatibility, HttpOnly/Secure/SameSite cookie, อายุ session 8 ชั่วโมง
- database/001-initial.sql: private schema, foreign keys, indexes, default-deny RLS และ revoke Data API roles
- scripts/data-transfer.mjs: import แบบไม่ทับข้อมูลสดและ verify ทุก field
- scripts/backup.mjs: สำรองเฉพาะข้อมูลถาวร ไม่รวม active sessions
- ไม่มีการนำรหัสผ่านผู้ดูแลจริงหรือ DATABASE_URL ไว้ใน source
- ทุกครั้งที่เปลี่ยนรหัสผ่านหรือปิดบัญชี ระบบยกเลิก session ที่เกี่ยวข้อง
- กิจกรรมที่ติดตามคือการเปิดลิงก์และการยืนยันความก้าวหน้า ไม่ใช่ข้อมูลภายใน Gemini
