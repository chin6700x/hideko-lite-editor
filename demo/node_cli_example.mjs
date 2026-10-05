import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. นำเข้าฟังก์ชันแกนหลักจากไลบรารี
import { highlight, registerLanguage } from '../dist/lib-hidekov8.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ฟังก์ชันช่วยเหลือสำหรับโหลดไฟล์ภาษาแบบ Dynamic
async function loadLang(langName) {
    try {
        // ใช้ Dynamic Import เพื่อดึงไฟล์ .js จาก src/languages-flat
        const langModule = await import(`../src/languages-flat/${langName}.js`);
        if (langModule.language) {
            registerLanguage(langName, langModule.language);
            return langModule;
        }
    } catch (e) {
        console.error(`❌ ไม่พบไฟล์ภาษา: ${langName}`);
        return null;
    }
}

async function generateHighlightedFile() {
    console.log("🚀 HidekoV8 File Generator\n");

    // ==========================================
    // 2. ตั้งค่า Options (รองรับผ่าน Command line argument)
    // ==========================================
    const inputArg = process.argv[2];
    const outputArg = process.argv[3];
    
    const options = {
        inputFile: inputArg ? path.resolve(inputArg) : path.join(__dirname, '..', 'vite.config.js'), 
        outputFile: outputArg ? path.resolve(outputArg) : path.join(__dirname, 'output.html'),
        lang: 'javascript',                                      // ภาษาที่ต้องการไฮไลต์
        theme: 'dark',                                           // ธีม: 'dark' หรือ 'light'
        showLineNumbers: true                                    // สมมติว่าอนาคตมีออปชันนี้
    };

    console.log(`[1] กำลังโหลดภาษา: ${options.lang}...`);
    const mod = await loadLang(options.lang);
    if (!mod) return;

    console.log(`[2] กำลังอ่านไฟล์: ${options.inputFile}`);
    const codeContent = fs.readFileSync(options.inputFile, 'utf-8');

    console.log(`[3] กำลังไฮไลต์โค้ด...`);
    const startTime = performance.now();
    
    // โยน config เข้าไปใน highlight ได้ด้วย
    const result = highlight(codeContent, mod.language, mod.conf || {});
    
    const endTime = performance.now();
    console.log(`⚡ ใช้เวลาในการประมวลผล: ${(endTime - startTime).toFixed(2)} ms`);

    console.log(`[4] กำลังสร้างไฟล์ HTML ผลลัพธ์...`);
    
    // ดึง CSS ของ Hideko มาฝัง (Inline CSS) เพื่อให้ไฟล์เดียวจบ
    const cssPath = path.join(__dirname, '..', 'dist', 'style.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    // กำหนดสีพื้นหลังหน้าเว็บตามธีม
    const bgColor = options.theme === 'dark' ? '#121212' : '#f5f5f5';
    const textColor = options.theme === 'dark' ? '#d4d4d4' : '#333333';

    // 5. สร้าง HTML Template หุ้มผลลัพธ์
    const htmlOutput = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hideko Export - ${path.basename(options.inputFile)}</title>
    <style>
        /* ฝัง CSS ของไลบรารี */
        ${cssContent}

        /* ตกแต่งหน้าเว็บเพิ่มเติม */
        body { 
            background-color: ${bgColor}; 
            color: ${textColor}; 
            padding: 2rem; 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
        }
        .header {
            margin-bottom: 1rem;
            border-bottom: 1px solid #555;
            padding-bottom: 0.5rem;
        }
        .hideko-pre-block {
            padding: 1rem;
            border-radius: 8px;
            overflow-x: auto;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            margin: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>📄 ${path.basename(options.inputFile)}</h2>
            <p>Language: <strong>${options.lang}</strong> | Generated in: <strong>${(endTime - startTime).toFixed(2)} ms</strong></p>
        </div>
        
        <!-- แท็กหุ้มที่ใส่ data-theme ให้ตรงกับ options -->
        <div class="hideko-theme-block" data-theme="${options.theme}">
            <pre class="hideko-pre-block"><code>${result.html}</code></pre>
        </div>
    </div>
</body>
</html>
    `.trim();

    // 6. บันทึกลงไฟล์
    fs.writeFileSync(options.outputFile, htmlOutput, 'utf-8');
    console.log(`✅ บันทึกไฟล์เสร็จสิ้น: ${options.outputFile}`);
    console.log(`💡 ลองเปิดไฟล์ output.html ในเบราว์เซอร์ดูสิครับ!`);
}

generateHighlightedFile();
