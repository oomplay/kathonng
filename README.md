# สารทนศีลมหาพระ · ลอยกระทงออนไลน์ / Loy Krathong Online

แอป 3D ในเว็บสำหรับลอยกระทงพร้อมคำอธิษฐานลงในแม่น้ำ
(Vite + React 19 + TypeScript + Three.js / React Three Fiber) เชื่อมต่อ
Supabase เป็น backend

A 3D web experience for floating krathongs with wishes on a river, built with
Vite, React 19, TypeScript and Three.js / React Three Fiber, backed by Supabase.

## เริ่มต้นแบบ Local / Local development

```bash
npm install
cp .env.example .env.local   # ใส่ VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY
npm run dev                  # เซิร์ฟเวอร์สำหรับพัฒนา
npm run build                # tsc -b แล้ว build สำหรับ production
npm run lint                 # oxlint
```

ไฟล์ `.env.example` มีเพียงตัวแปรสาธารณะสองตัวที่ปลอดภัยสำหรับฝั่ง
เบราว์เซอร์ (browser-exposed) เท่านั้น:

```dotenv
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="your-publishable-or-anon-key"
```

`.env.local` ถูก ignore ใน `.gitignore` และ **ต้องไม่** commit
**Never commit** `.env.local`. ห้ามใช้ `service_role` key ฝั่ง client
เด็ดขาด — key นี้ข้าม RLS ได้ ต้องอยู่เฉพาะฝั่ง server เท่านั้น
(The `service_role` key bypasses RLS and must never reach the browser).

หากต้องการเปิดกล้องบนเครื่องจริง เว็บต้องรันผ่าน **HTTPS** (หรือ `localhost`)
มิฉะนั้น `getUserMedia()` จะไม่ทำงาน
(The selfie camera requires a **secure context**: HTTPS or `localhost`).

## โครงสร้าง / Project structure

```
src/
  lib/          ชั้นข้อมูล: client, API, สไตล์กระทง, สี, layout, เวลาไทย, fingerprint
  types/        นิยามชนิดของข้อมูล (db.ts) และ UI (ui.ts)
  hooks/        useKrathongFeed (โหลด + Realtime), useReducedEffects
  scene/        ฉาก 3D: แม่น้ำ, กระทงแต่ละแบบ, เทียน และแสงสะท้อน
  ui/           TopBar, รายการกระทง, กล่องคำอธิษฐาน, กล่องสร้างกระทง, toast
supabase/
  migrations/   SQL สำหรับ RLS, RPC และ Storage policies
```

ฉาก 3D และกล่องสร้างกระทงถูกโหลดแบบ lazy (`React.lazy` + `Suspense`) เพื่อให้
HUD แสดงผลได้ทันทีบนเครือข่ายมือถือ
(The 3D scene and create dialog are lazy-loaded so the HUD paints instantly on
mobile networks).

## สัญญากับฐานข้อมูล (ตรวจสอบกับ Supabase โดยตรง)

ตาราง `krathongs` — `id, owner_name, wish_text, style_id, color_hex, photo_url,
vote_count, created_at`

- RLS: อ่านได้ทุกคน, สร้างได้ทุกคน (บังคับ `vote_count = 0` ตอน insert)
- ไม่มีสิทธิ์ UPDATE/DELETE — ตัวนับคะแนนอัปเดตผ่าน RPC เท่านั้น
  (verified against the live API with the anon key: UPDATE/DELETE match zero rows)
- `owner_name` ไม่เกิน 40 ตัวอักษร และ `wish_text` ไม่เกิน 280 ตัวอักษร
  บังคับทั้งใน UI และด้วย CHECK constraint ที่ฐานข้อมูล
  (Length limits are enforced in the UI, in the API layer and by CHECK
  constraints in the database)
- `REPLICA IDENTITY FULL` ทำให้ Realtime ส่งข้อมูลแถวเต็มทุกครั้งที่โหวต

RPC

| ชื่อ | ผลลัพธ์ | หมายเหตุ |
| --- | --- | --- |
| `increment_vote(target_krathong_id uuid, voter_id text)` | `(vote_count int, already_voted bool)` | `SECURITY DEFINER`, ล็อกแถวด้วย `FOR UPDATE`, โหวตซ้ำได้ไม่ (unique constraint) |
| `get_my_votes(voter_id text)` | `SETOF uuid` | ใช้ดึงรายการที่ผู้ใช้เคยโหวต |

Storage — bucket `krathong-photos` (public, 2 MB, png/jpeg/webp/avif)

- `storage.objects` มี policy แค่ `INSERT` (อัปโหลด) และ `SELECT` (อ่าน)
  ไม่มี policy สำหรับ `UPDATE` / `DELETE` ดังนั้นผู้ใช้นิรนามลบหรือ
  เขียนทับไฟล์เดิมไม่ได้ (RLS ปฏิเสธโดยอัตโนมัติ)
- policy ตรวจทั้ง MIME type และขนาดไฟล์ไม่เกิน 2 MB ในตัวเอง
  (The upload policy enforces the MIME type and the 2 MB cap itself, not just
  the bucket metadata)
- ไฟล์ต้นฉบับจากเครื่องถูกย่อและบีบอัดในเบราว์เซอร์ก่อนอัปโหลดเสมอ
  (Original device photos are always resized and compressed in the browser
  before they reach Storage)

## การ deploy / Deployment

แอปนี้เป็น static SPA ล้วน จึง deploy ได้ทุก host ที่รองรับ static files
(This is a fully static SPA, so it deploys to any static host).

ตั้งค่า environment variables ต่อไปนี้ในแผนก Environment Variables ของ host
(Set these environment variables in your host's dashboard):

| Variable | ค่า | หมายเหตุ |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` | Supabase → Project Settings → Data API |
| `VITE_SUPABASE_ANON_KEY` | publishable / anon key | Supabase → Project Settings → API Keys |
| `VITE_BASE_PATH` | `/` | เว้นว่างไว้เว้นแต่ host จะโฮสต์ใน sub-path |

ค่าทั้งสองตัวแรกถูกฝังลงใน bundle ของเบราว์เซอร์ จึงต้องเป็นคีย์สาธารณะเท่านั้น
(Both are inlined into the browser bundle, so they must be public keys only.)

### Vercel

1. `npx vercel` แล้วเลือก preset `Vite`
2. ใน **Settings → Environment Variables** เพิ่ม `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY` และ `VITE_BASE_PATH=/`
3. กด Deploy — build command คือ `npm run build`, output directory คือ `dist`

### Netlify

1. `npx netlify init` (หรือเชื่อม repo ใน Netlify UI)
2. Build command: `npm run build` · Publish directory: `dist`
3. เพิ่ม environment variables สองตัวใน **Site configuration → Environment
   variables** (พร้อม `VITE_BASE_PATH=/`)
4. Netlify จะออกใบรับรอง HTTPS ให้อัตโนมัติ

### Cloudflare Pages

1. `npx wrangler pages deploy dist`
2. หรือเชื่อม repo: Build command `npm run build`, output directory `dist`
3. เพิ่ม environment variables ใน **Settings → Environment variables**
   (`VITE_BASE_PATH=/`)
4. Cloudflare Pages ให้ HTTPS ในโดเมน `*.pages.dev` โดยอัตโนมัติ

### GitHub Pages

workflow `.github/workflows/deploy.yml` จะ build และ publish ให้เองเมื่อ push
เข้า `main` โดยกำหนด `VITE_BASE_PATH=/kathonng/` ไว้แล้ว เพราะ Pages เผยแพร่
ใต้ sub-path

> **HTTPS is mandatory.** กล้องเซลฟี่ใช้ `getUserMedia()` ซึ่งเบราว์เซอร์
> อนุญาตเฉพาะบน secure context เท่านั้น ถ้าเว็บรันผ่าน `http://` กล้องจะ
> ใช้ไม่ได้และผู้ใช้ต้องเลือกอัปโหลดรูปจากเครื่องแทน
>
> **HTTPS is mandatory.** `getUserMedia()` only works in a secure context. On
> plain `http://` the camera is unavailable and users must fall back to
> uploading a photo from their device.

## การระบุตัวผู้โหวต

ไม่มีระบบล็อกอิน ผู้ใช้แต่ละเครื่องจะได้ UUID สุ่มที่เก็บใน `localStorage`
(คีย์ `kathonng.voter-fingerprint`) แล้วใช้เป็น `voter_fingerprint` ซึ่งยาว
8-128 ตัวอักษรตามที่ฐานข้อมูลกำหนด ใช้กับ constraint
`vote_logs_one_vote_per_voter` เพื่อบังคับหนึ่งคะแนนต่อหนึ่งกระทงต่อหนึ่งผู้ใช้

## หมายเหตุ

- ตัวเลขคะแนนรวมในหน้าจอคือจำนวนคำอธิษฐานทั้งหมด ไม่ใช่จำนวนผู้โหวต
- ปุ่มสลับเอฟเฟกต์ปิดการสะท้อนแสง ดาว และการเคลื่อนไหวของกระทง และ
  เคารพค่า `prefers-reduced-motion` ของระบบปฏิบัติการ
- กด `Escape` เพื่อปิดกล่องสร้างกระทงหรือการ์ดรายละเอียด และโฟกัสจะกลับ
  ไปที่ปุ่มที่เปิดหน้าต่างนั้น
  (`Escape` closes the create dialog and the detail card, and focus returns to
  the control that opened them)
- โหมดนี้ยังเป็นเฟส 1 — ยังไม่มีระบบผู้ดูแล การลบกระทง หรือการลบภาพ

## ความทนทานของการเชื่อมต่อและคุณภาพการแสดงผล

- ทุกคำขอฐานข้อมูลมีเวลาสูงสุด 10 วินาที ถ้าเกินจะถูกยกเลิกและแสดงข้อความแนะนำให้ลองใหม่
- ข้อผิดพลาดที่เป็นชั่วคราว (เช่น การเชื่อมต่อหลุดหรือ timeout) จะถูกลองใหม่อัตโนมัติ
  สองครั้งแบบถอยหลังเวลา ส่วนข้อผิดพลาดเรื่องสิทธิ์หรือข้อมูลไม่ถูกต้องจะไม่ถูกลองซ้ำ
- ประวัติการโหวตโหลดแยกจากรายการกระทง ถ้าประวัติโหลดไม่สำเร็จ ฉากยังใช้งานได้
  และมีปุ่ม "ลองใหม่" เฉพาะส่วนนั้น
- ระบบตรวจจับ software renderer (SwiftShader, llvmpipe) ก่อนวาดเฟรมแรก
  และจะลดคุณภาพอัตโนมัติเมื่อพบเฟรมเรตต่ำต่อเนื่อง
- ทดสอบแต่ละระดับคุณภาพได้ด้วยพารามิเตอร์ `?quality=full` หรือ `?quality=degraded`
  เมื่อระบุพารามิเตอร์นี้ ระบบจะไม่เปลี่ยนระดับคุณภาพอัตโนมัติ
