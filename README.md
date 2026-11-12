# Rice Trial App (Methane C5)

## โครงสร้าง
- `sheets/` เทมเพลต Google Sheets (นำเข้าแล้วกรอก Varieties, Plots, Config ก่อน)
- `apps-script/` Code.gs (หลัก) + PhotoDrive2.gs (Drive ที่ 2) + appsscript.json
- `frontend/` เว็บแอป PWA (index.html, app.js, app.css, ui.js, sw.js, manifest, config.js)

## ขั้นตอนติดตั้ง
1. อัปโหลด `sheets/Rice_Methane_C5_Template.xlsx` ไป Google Drive > เปิดด้วย Google Sheets (Save as Google Sheets) แล้วกรอกข้อมูล
2. ใน Sheet: Extensions > Apps Script วาง `Code.gs` (และ appsscript.json ผ่าน Project Settings > Show manifest) แล้วรันฟังก์ชัน `setup()` หนึ่งครั้ง (อนุญาตสิทธิ์) จะได้ชีตข้อมูล, Translations และโฟลเดอร์ Drive A
3. Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone) คัดลอก URL ที่ลงท้าย /exec
4. วาง URL ใน `frontend/config.js` แล้วอัปโหลดโฟลเดอร์ `frontend` ขึ้นโฮสต์ HTTPS (Cloudflare Pages / GitHub Pages)
5. เปิดใน Chrome มือถือ > เมนู > Install app

## Drive ที่ 2 (ไม่บังคับ)
1. บัญชี Google อีกบัญชี: สร้างโปรเจกต์ Apps Script วาง `PhotoDrive2.gs`, ตั้ง Script property `TOKEN` แล้ว Deploy เป็น Web app
2. ในสคริปต์หลัก: Project Settings > Script properties ตั้ง `DRIVE2_URL` และ `DRIVE2_TOKEN`
3. ในชีต Config ตั้ง `Photos_Daily_Drive` หรือ `Photos_Problem_Drive` เป็น `A` หรือ `B`

## แก้ข้อความ/ภาษา
แก้ในชีต `Translations` (คอลัมน์ lo / en) แล้วเปิดแอปตอนมีสัญญาณ ข้อความจะอัปเดตเอง
