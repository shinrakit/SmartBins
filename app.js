document.addEventListener('DOMContentLoaded', () => {
    // ============================================================================
    // ⚠️ ตั้งค่า OLLAMA API
    // ============================================================================
    const WINDOWS_IP = 'localhost'; 
    const OLLAMA_HOST = `http://${WINDOWS_IP}:11434`;
    const OLLAMA_API_URL = `${OLLAMA_HOST}/api/chat`;
    const OLLAMA_TAGS_URL = `${OLLAMA_HOST}/api/tags`;

    // กำหนดโมเดลสำหรับแปลภาษา
    const TRANSLATION_MODEL = 'gemma3:4b';

    // ============================================================================
    // 1. DOM Elements Mapping
    // ============================================================================
    const navLogo = document.getElementById('nav-logo');
    const navHome = document.getElementById('nav-home');
    const navAbout = document.getElementById('nav-about');
    const pageHome = document.getElementById('home-page');
    const pageAbout = document.getElementById('about-page');

    const uploadZone = document.getElementById('upload-zone');
    const uploadEmpty = document.getElementById('upload-empty-state');
    const fileInput = document.getElementById('file-input');
    const previewContainer = document.getElementById('preview-container');
    const imgPreview = document.getElementById('image-preview');
    const btnDeleteImg = document.getElementById('btn-delete-img');

    const modelSelect = document.getElementById('modelSelect');
    const promptInput = document.getElementById('prompt-input');

    const btnAnalyze = document.getElementById('btn-analyze');
    const btnReset = document.getElementById('btn-reset');

    const loadingOverlay = document.getElementById('loading-overlay');
    const resultCard = document.getElementById('result-card');
    const resultIcon = document.getElementById('result-icon');
    const resultTitle = document.getElementById('result-title');
    const resultDesc = document.getElementById('result-description');
    const resultItemName = document.getElementById('result-item-name');
    const btnCopy = document.getElementById('btn-copy');
    const msgBox = document.getElementById('msg-box');

    // State Management
    let selectedFile = null;
    let currentMode = 'dispose';
    let selectedTags = [];

    // ============================================================================
    // 1.5 Hero Particles Effect
    // ============================================================================
    const particleLayer = document.getElementById('particle-layer');
    if (particleLayer) {
        const createParticle = () => {
            const particle = document.createElement('div');
            particle.className = 'particle';
            const icons = ['✨', '🍃', '🫧', '♻️', '💚', '🌟'];
            particle.textContent = icons[Math.floor(Math.random() * icons.length)];
            particle.style.left = Math.random() * 100 + '%';
            particle.style.fontSize = (Math.random() * 16 + 12) + 'px';
            
            const duration = Math.random() * 3 + 3;
            particle.style.animationDuration = duration + 's';
            particleLayer.appendChild(particle);

            setTimeout(() => {
                if(particle.parentNode) particle.remove();
            }, duration * 1000);
        };
        setInterval(createParticle, 450);
    }

    // ============================================================================
    // 2. Fetch Available Models from Ollama
    // ============================================================================
    const showMessage = (msg, type = 'success') => {
        msgBox.textContent = msg;
        msgBox.className = `msg-box show ${type}`;
        setTimeout(() => { msgBox.className = 'msg-box'; }, 4000);
    };

    async function checkOllamaModels() {
        try {
            const response = await fetch(OLLAMA_TAGS_URL);
            if (!response.ok) throw new Error('ไม่สามารถเชื่อมต่อ Ollama API ได้');
            
            const data = await response.json();
            const models = data.models.map(m => m.name);
            
            modelSelect.innerHTML = ''; // เคลียร์ Option เดิม
            modelSelect.disabled = false;

            if (models.length === 0) {
                modelSelect.innerHTML = '<option value="">ไม่มีโมเดลติดตั้งในเครื่อง</option>';
                modelSelect.disabled = true;
                showMessage('ไม่พบโมเดลใดๆ ใน Ollama กรุณาดึงโมเดลก่อนใช้งาน', 'error');
                return;
            }

            // โมเดลที่เราต้องการให้เป็น Recommend
            const targetModels = ['qwen2.5-vl', 'qwen2.5vl', 'llava'];
            let hasVisionModel = false;

            models.forEach(modelName => {
                const option = document.createElement('option');
                option.value = modelName;
                option.textContent = modelName;

                // ตรวจสอบว่าเป็น Vision model ตัวเก่งหรือไม่
                if (targetModels.some(target => modelName.toLowerCase().includes(target))) {
                    option.textContent += ' (แนะนำ)';
                    hasVisionModel = true;
                    // ถ้ายังไม่มีการเลือกตัวแนะนำ ให้เลือกตัวนี้เป็น Default
                    if(modelSelect.options.length === 0 || !modelSelect.options[0].textContent.includes('(แนะนำ)')) {
                        option.selected = true;
                    }
                }
                modelSelect.appendChild(option);
            });

            if (!hasVisionModel) {
                showMessage('ไม่พบโมเดล Vision (เช่น qwen2.5-vl หรือ llava) ระบบอาจวิเคราะห์รูปภาพไม่ได้', 'warning');
            }
            
            // แจ้งเตือนถ้าไม่มีโมเดลแปลภาษา
            if (!models.some(m => m.includes(TRANSLATION_MODEL))) {
                showMessage(`คำเตือน: ไม่พบโมเดล ${TRANSLATION_MODEL} สำหรับการแปลภาษาไทย`, 'warning');
            }

        } catch (error) {
            console.error('Ollama connection error:', error);
            modelSelect.innerHTML = '<option value="">ไม่สามารถเชื่อมต่อ Ollama ได้</option>';
            modelSelect.disabled = true;
            showMessage('ไม่สามารถเชื่อมต่อ Ollama ได้ โปรดตรวจสอบว่ารัน Docker และตั้งค่า OLLAMA_ORIGINS="*" แล้ว', 'error');
        }
    }
    
    // เรียกฟังก์ชันเช็คโมเดลทันทีตอนเปิดเว็บ
    checkOllamaModels();

    // ============================================================================
    // 3. Navigation & Page Switcher
    // ============================================================================
    function switchPage(pageName) {
        navHome.classList.toggle('active', pageName === 'home');
        navAbout.classList.toggle('active', pageName === 'about');

        if (pageName === 'home') {
            pageAbout.classList.remove('active');
            setTimeout(() => pageHome.classList.add('active'), 300);
        } else {
            pageHome.classList.remove('active');
            setTimeout(() => pageAbout.classList.add('active'), 300);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (navLogo) navLogo.addEventListener('click', () => switchPage('home'));
    if (navHome) navHome.addEventListener('click', () => switchPage('home'));
    if (navAbout) navAbout.addEventListener('click', () => switchPage('about'));

    // ============================================================================
    // 4. UI Event Listeners
    // ============================================================================
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
        });
    });

    document.querySelectorAll('.tag-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            
            // เก็บเป็น Object { en: ภาษาอังกฤษเพื่อส่ง AI, th: ภาษาไทยเพื่อเช็ค Theme }
            const tagTh = btn.innerText.trim();
            const tagEn = btn.dataset.en || tagTh;
            const tagObj = { th: tagTh, en: tagEn };
            
            if (btn.classList.contains('active')) {
                if (!selectedTags.some(t => t.th === tagTh)) selectedTags.push(tagObj);
            } else {
                selectedTags = selectedTags.filter(t => t.th !== tagTh);
            }
        });
    });

    document.querySelectorAll('.qq-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const currentText = promptInput.value.trim();
            const newText = btn.innerText.trim();
            promptInput.value = currentText ? `${currentText} ${newText}` : newText;
            promptInput.focus();
        });
    });

    // ============================================================================
    // 5. File Upload Handlers
    // ============================================================================
    uploadZone.addEventListener('click', (e) => {
        if (e.target.id !== 'btn-delete-img' && !selectedFile) {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFile(file);
    });

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!selectedFile) uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0 && !selectedFile) {
            handleFile(files[0]);
        }
    });

    btnDeleteImg.addEventListener('click', (e) => {
        e.stopPropagation();
        clearImage();
    });

    function handleFile(file) {
        if (!file.type.match('image.*')) {
            showMessage('กรุณาอัปโหลดไฟล์รูปภาพ (JPG, PNG) เท่านั้น', 'error');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showMessage('ไฟล์มีขนาดใหญ่เกินไป กรุณาอัปโหลดรูปที่ไม่เกิน 10MB', 'error');
            return;
        }
        
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            imgPreview.src = e.target.result;
            uploadEmpty.style.display = 'none';
            previewContainer.style.display = 'block';
            
            uploadZone.style.borderStyle = 'solid';
            uploadZone.style.padding = '16px';
            
            btnAnalyze.disabled = false;
            resultCard.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    function clearImage() {
        selectedFile = null;
        fileInput.value = '';
        
        previewContainer.style.display = 'none';
        imgPreview.src = '';
        uploadEmpty.style.display = 'flex';
        uploadZone.style.borderStyle = 'dashed';
        uploadZone.style.padding = 'var(--sp-2xl) var(--sp-lg)';
        
        btnAnalyze.disabled = true;
        resultCard.style.display = 'none';
    }

    // ============================================================================
    // 6. Action Handlers
    // ============================================================================
    btnReset.addEventListener('click', () => {
        clearImage();
        promptInput.value = '';
        document.querySelectorAll('.tag-btn').forEach(btn => btn.classList.remove('active'));
        selectedTags = [];
        resultCard.style.display = 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    btnCopy.addEventListener('click', () => {
        const title = resultTitle.innerText;
        const item = resultItemName.innerText;
        const desc = resultDesc.innerText;

        const textToCopy = `♻️ ผลการวิเคราะห์ Smart Bin AI ♻️\n\nจัดอยู่ใน: ${title}\nหมวดหมู่: ${item}\n\n📝 คำอธิบายและวิธีจัดการ:\n${desc}`;

        navigator.clipboard.writeText(textToCopy).then(() => {
            btnCopy.innerText = '✅ คัดลอกแล้ว!';
            btnCopy.style.background = 'var(--color-bg-alt)';
            setTimeout(() => {
                btnCopy.innerText = '📋 คัดลอก';
                btnCopy.style.background = 'white';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            const textarea = document.createElement('textarea');
            textarea.value = textToCopy;
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showMessage('คัดลอกคำแนะนำเรียบร้อยแล้ว');
            } catch (e) {
                showMessage('ไม่สามารถคัดลอกได้ ระบบไม่รองรับคลิปบอร์ด', 'error');
            }
            document.body.removeChild(textarea);
        });
    });

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ============================================================================
    // 7. AI Logic & Ollama API (2-Step: Vision -> Translate -> Stream)
    // ============================================================================
    btnAnalyze.addEventListener('click', async () => {
        if (!selectedFile) {
            showMessage('กรุณาอัปโหลดรูปภาพก่อนวิเคราะห์', 'error');
            return;
        }

        const targetModel = modelSelect.value;
        if (!targetModel) {
            showMessage('กรุณาเลือกโมเดล AI ก่อนทำการวิเคราะห์', 'error');
            return;
        }
        
        // รับข้อความภาษาไทยจากช่องกรอก
        const userQuestionThai = promptInput.value.trim();
        let userQuestionEnglish = "What is this item and how should I dispose of it?";
        
        // --- STEP 1: PROMPT ENGINEERING (ENGLISH) ---
        // เปลี่ยน Prompt เป็นภาษาอังกฤษเพื่อให้ Vision model ทำงานได้แม่นยำที่สุด
        let systemContext = "";
        if (currentMode === 'dispose') {
            systemContext = "Role: You are an expert in environmental science and waste management in Thailand.\n" +
                            "Task: Analyze the image of this waste and clearly state which color bin it should be thrown into (Yellow = Recycle, Blue = General, Green = Organic/Wet, Red = Hazardous/Chemical).\n" +
                            "Format: Provide the explanation in bullet points as follows:\n1. Name of the item\n2. The recommended bin color and the reason\n3. Preparation steps before disposal\n4. Environmental impact if disposed of incorrectly.\n" +
                            "Language: Answer in English.";
        } else {
            systemContext = "Role: You are an inventor and a DIY (Upcycling) expert.\n" +
                            "Task: Propose 3 highly creative ideas to upcycle or modify the waste in this image into useful items, so it doesn't need to be thrown away.\n" +
                            "Format: Explain in 3 numbered points with short, actionable steps.\n" +
                            "Language: Answer in English.";
        }

        let extraContext = "";
        if (selectedTags.length > 0) {
            // ดึงเฉพาะภาษาอังกฤษจาก tag ที่เลือกไปรวมใน Prompt
            const enTags = selectedTags.map(t => t.en).join(', ');
            extraContext = `[Additional info from user: The condition of this item is "${enTags}"]\nPlease consider these conditions in your recommendation.\n`;
        }

        loadingOverlay.classList.add('active');
        btnAnalyze.disabled = true;
        
        // เตรียมกล่อง UI
        resultCard.style.display = 'block';
        resultCard.className = 'result-card'; 
        resultItemName.textContent = '🔄 กำลังเตรียมข้อมูล...';
        resultTitle.textContent = 'กำลังประมวลผล...';
        resultIcon.textContent = '⏳';
        resultDesc.textContent = 'Preparing data...';
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        try {
            const base64Image = await fileToBase64(selectedFile);

            // --- STEP 1.5: TRANSLATE USER QUESTION TO ENGLISH (If provided) ---
            if (userQuestionThai) {
                resultItemName.textContent = '🇹🇭 ➜ 🇬🇧 กำลังแปลคำถามของคุณ...';
                
                const preTranslatePrompt = `Translate the following Thai text to English. Provide ONLY the English translation without any extra explanation or quotes:\n\n${userQuestionThai}`;

                const preTranslateResponse = await fetch(OLLAMA_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: TRANSLATION_MODEL, // ใช้โมเดลแปลภาษาตัวเดิม
                        messages: [{ role: 'user', content: preTranslatePrompt }],
                        stream: false // ปิดสตรีมเพราะแค่ต้องการแปลเร็วๆ เบื้องหลัง
                    })
                });

                if (preTranslateResponse.ok) {
                    const preTranslateData = await preTranslateResponse.json();
                    userQuestionEnglish = preTranslateData.message.content.trim();
                    console.log("📝 คำถามที่แปลเป็นภาษาอังกฤษก่อนส่งให้ Vision:", userQuestionEnglish);
                }
            }

            const finalVisionPrompt = `${systemContext}\n${extraContext}\nUser question: ${userQuestionEnglish}`;
            console.log(`👁️ ส่งคำสั่งวิเคราะห์ภาพไปยัง Ollama (${targetModel}):\n`, finalVisionPrompt); 
            
            // --- STEP 2: ส่งข้อมูลไปวิเคราะห์ภาพ (รอจนเสร็จ ไม่ Stream เพื่อให้ได้ Text เต็มๆ ก่อนแปล) ---
            resultItemName.textContent = '👁️ กำลังให้ AI วิเคราะห์รูปภาพ (รอสักครู่)...';
            const visionResponse = await fetch(OLLAMA_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: targetModel,
                    messages: [
                        {
                            role: 'user',
                            content: finalVisionPrompt,
                            images: [base64Image.split(',')[1]]
                        }
                    ],
                    stream: false // ปิด stream เพราะเราต้องการรับข้อความอังกฤษทั้งหมดไปแปลทีเดียว
                })
            });
            
            if (!visionResponse.ok) throw new Error(`Vision Model HTTP error! status: ${visionResponse.status}`);
            const visionData = await visionResponse.json();
            const englishResult = visionData.message.content;
            console.log("📝 ผลลัพธ์ภาษาอังกฤษจาก Vision Model:", englishResult);

            // --- STEP 3: ส่งข้อความไปแปลเป็นภาษาไทยด้วย Gemma3:4b (ใช้ Streaming โชว์ทีละตัวอักษร) ---
            resultItemName.textContent = '🇹🇭 กำลังแปลเป็นภาษาไทย...';
            resultDesc.textContent = ''; // ล้างข้อความเพื่อรอการ Stream

            const translatePrompt = `คุณคือนักแปลภาษาไทยที่เชี่ยวชาญด้านสิ่งแวดล้อม หน้าที่ของคุณคือแปลข้อความภาษาอังกฤษต่อไปนี้ให้เป็นภาษาไทยที่อ่านง่าย เป็นธรรมชาติ และถูกต้องตามบริบทของการจัดการขยะในประเทศไทย \n\nข้อห้าม: ไม่ต้องเพิ่มข้อความสนทนา ไม่ต้องเกริ่นนำ ให้แปลตรงๆ เท่านั้น\n\nข้อความที่ต้องแปล:\n${englishResult}`;

            const translateResponse = await fetch(OLLAMA_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: TRANSLATION_MODEL, // ใช้โมเดลแปลภาษาที่กำหนดไว้บนสุด
                    messages: [
                        {
                            role: 'user',
                            content: translatePrompt
                        }
                    ],
                    stream: true // เปิด Stream เพื่อให้หน้าเว็บดูมีชีวิตชีวา
                })
            });

            if (!translateResponse.ok) throw new Error(`Translation Model HTTP error! status: ${translateResponse.status}`);

            loadingOverlay.classList.remove('active'); // เอา overlay หมุนๆ ออก ให้ผู้ใช้ดูการพิมพ์ได้ชัดๆ

            const reader = translateResponse.body.getReader();
            const decoder = new TextDecoder();
            let fullThaiResponse = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const json = JSON.parse(line);
                            if (json.message && json.message.content) {
                                fullThaiResponse += json.message.content;
                                resultDesc.textContent = fullThaiResponse; // พิมพ์ข้อความภาษาไทยลงหน้าเว็บทันที
                            }
                        } catch (e) {
                            // ข้ามบรรทัด JSON ที่ส่งมาไม่สมบูรณ์ชั่วคราว
                        }
                    }
                }
            }
            
            // --- STEP 4: อัปเดตสีกล่องตามคำหลักในภาษาไทย ---
            updateResultTheme(fullThaiResponse, currentMode, selectedTags);
            
        } catch (error) {
            console.error('Error:', error);
            showMessage('เกิดข้อผิดพลาดในการเชื่อมต่อ Ollama อาจหาโมเดลสำหรับแปลไม่พบ หรือเซิร์ฟเวอร์มีปัญหา', 'error');
            resultItemName.textContent = '❌ เกิดข้อผิดพลาด';
            resultDesc.textContent = error.message;
            loadingOverlay.classList.remove('active');
        } finally {
            btnAnalyze.disabled = false;
        }
    });

    // ============================================================================
    // 8. Dynamic UI Updater
    // ============================================================================
    function updateResultTheme(aiText, mode, tags) {
        const lowerText = aiText.toLowerCase();

        if (mode === 'diy' || lowerText.includes('ประดิษฐ์') || lowerText.includes('upcycle') || lowerText.includes('ดัดแปลง')) {
            resultCard.className = 'result-card type-diy';
            resultIcon.textContent = '🎨';
            resultTitle.textContent = 'ไอเดีย DIY ประดิษฐ์ของใช้';
            resultItemName.textContent = '✨ นำกลับมาใช้ใหม่ให้เกิดประโยชน์';
            
        } else {
            // โหมดแนะนำการทิ้ง: ตัดปัญหาการแยกสีผิดพลาด ใช้กรอบสีรุ้งเสมอ
            resultCard.className = 'result-card type-rainbow';
            resultIcon.textContent = '💡';
            resultTitle.textContent = 'ผลการวิเคราะห์การทิ้งขยะ';
            resultItemName.textContent = 'โปรดอ่านคำแนะนำด้านล่างอย่างละเอียด';
        }
    }
});
