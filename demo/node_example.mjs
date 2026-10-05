import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. นำเข้าฟังก์ชันจากไลบรารีที่ Build ไว้แล้ว (แบบ ESM)
import { highlight, registerLanguage } from '../dist/lib-hidekov8.mjs';

// 2. นำเข้าไฟล์กฎของภาษาที่ต้องการ (Node.js สามารถโหลดได้โดยตรง)
import { language as jsLanguage } from '../src/languages-flat/javascript.js';

async function runNodeHighlighter() {
    console.log("🚀 เริ่มต้นรัน HidekoV8 บน Node.js...\n");

    // 3. ขึ้นทะเบียนภาษาในระบบ
    registerLanguage('javascript', jsLanguage);

    // 4. อ่านโค้ดจากไฟล์
    const targetFile = path.join(__dirname, '..', 'vite.config.js'); // ลองอ่านไฟล์ vite.config.js มาทดสอบ
    console.log(`กำลังอ่านไฟล์: ${targetFile}`);
    const codeContent = fs.readFileSync(targetFile, 'utf-8');

    // 5. สั่งไฮไลต์โค้ด พร้อมจับเวลา
    const startTime = performance.now();
    const result = highlight(codeContent, jsLanguage);
    const endTime = performance.now();

    // 6. ดูผลลัพธ์
    console.log(`\n⚡ ใช้เวลาไฮไลต์: ${(endTime - startTime).toFixed(2)} ms`);
    console.log("\n--- พรีวิว HTML ที่ได้ (200 ตัวอักษรแรก) ---");
    console.log(result.html.substring(0, 200) + '...\n');
    
    // หากต้องการเซฟ HTML ลงไฟล์:
    // fs.writeFileSync(path.join(__dirname, 'output.html'), result.html);
}

runNodeHighlighter();
