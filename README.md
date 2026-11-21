# สารทนศีลมหาพระ · ลอยกระทงออนไลน์

แอป 3D ในเว็บสำหรับลอยกระทงพร้อมคำอธิษฐานลงในแม่น้ำ
(Vite + React 19 + TypeScript + Three.js / React Three Fiber) เชื่อมต่อ
Supabase เป็น backend

## คำสั่ง

```bash
npm install
cp .env.example .env.local   # ใส่ VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY
npm run dev                  # เซิร์ฟเวอร์สำหรับพัฒนา
npm run build                # tsc -b แล้ว build สำหรับ production
npm run lint                 # oxlint
```

## โครงสร้าง

```
src/
  lib/          ชั้นข้อมูล: client, API, สไตล์กระทง, สี, layout, เวลาไทย, fingerprint
  types/        นิยามชนิดของข้อมูล (db.ts) และ UI (ui.ts)
  hooks/        useKrathongFeed (โหลด + Realtime), useReducedEffects
  scene/        ฉาก 3D: แม่น้ำ, กระทงแต่ละแบบ, เทียน และแสงสะท้อน
  ui/           TopBar, รายการกระทง, กล่องคำอธิษฐาน, กล่องสร้างกระทง, toast
```

## สัญญากับฐานข้อมูล (ตรวจสอบกับ Supabase โดยตรง)

ตาราง `krathongs` — `id, owner_name, wish_text, style_id, color_hex, photo_url,
vote_count, created_at`

- RLS: อ่านได้ทุกคน, สร้างได้ทุกคน (บังคับ `vote_count = 0` ตอน insert)
- ไม่มีสิทธิ์ UPDATE/DELETE — ตัวนับคะแนนอัปเดตผ่าน RPC เท่านั้น
- `REPLICA IDENTITY FULL` ทำให้ Realtime ส่งข้อมูลแถวเต็มทุกครั้งที่โหวต

RPC

| ชื่อ | ผลลัพธ์ | หมายเหตุ |
| --- | --- | --- |
| `increment_vote(target_krathong_id uuid, voter_id text)` | `(vote_count int, already_voted bool)` | `SECURITY DEFINER`, ล็อกแถวด้วย `FOR UPDATE`, โหวตซ้ำได้ไม่ (unique constraint) |
| `get_my_votes(voter_id text)` | `SETOF uuid` | ใช้ดึงรายการที่ผู้ใช้เคยโหวต |

Storage — bucket `krathong-photos` (public, 5 MB, png/jpeg/webp/avif)

## การระบุตัวผู้โหวต

ไม่มีระบบล็อกอิน ผู้ใช้แต่ละเครื่องจะได้ UUID สุ่มที่เก็บใน `localStorage`
(คีย์ `kathonng.voter-fingerprint`) แล้วใช้เป็น `voter_fingerprint` ซึ่งยาว
8-128 ตัวอักษรตามที่ฐานข้อมูลกำหนด ใช้กับ constraint
`vote_logs_one_vote_per_voter` เพื่อบังคับหนึ่งคะแนนต่อหนึ่งกระทงต่อหนึ่งผู้ใช้

## หมายเหตุ

- ตัวเลขคะแนนรวมในหน้าจอคือจำนวนคำอธิษฐานทั้งหมด ไม่ใช่จำนวนผู้โหวต
- ปุ่มสลับเอฟเฟกต์ปิดการสะท้อนแสง ดาว และการเคลื่อนไหวของกระทง และ
  เคารพค่า `prefers-reduced-motion` ของระบบปฏิบัติการ
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
