let currentFileIndex = 0;
let isTyping = false;
let typingInterval = null;
let countdownInterval = null;
let CONTENT = null;
let typingSound = null;
let terminalTypingSound = null;
let systemBeepSound = null;
let confirmationSound = null;
let documentOpenSound = null;
let audioEnabled = false;

const countdownPhase = document.getElementById('countdown-phase');
const releasePhase = document.getElementById('release-phase');
const docFilename = document.getElementById('doc-filename');
const docClassification = document.getElementById('doc-classification');
const docBody = document.getElementById('doc-body');
const nextBtn = document.getElementById('next-btn');
const skipBtn = document.getElementById('skip-btn');

async function init() {
    await loadContent();
    loadTypingSound();
    setupAudioUnlock();
    startCountdown();
    
    nextBtn.addEventListener('click', handleNext);
    skipBtn.addEventListener('click', skipTyping);
}

function loadTypingSound() {
    let audioContext = null;
    let contextReady = false;
    
    const initAudioContext = () => {
        if (!audioContext && audioEnabled) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                contextReady = true;
            } catch (e) {
                // no support audio
            }
        }
        return audioContext;
    };
    
    typingSound = {
        audioContext: null,
        play: function() {
            if (!audioEnabled) return;
            
            try {
                const ctx = initAudioContext();
                if (!ctx) return;
                this.audioContext = ctx;
                
                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);
                
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.02);
                
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.02);
            } catch (e) {
                // silent fail
            }
        }
    };
    
    terminalTypingSound = {
        audioContext: null,
        play: function() {
            if (!audioEnabled) return;
            
            try {
                const ctx = initAudioContext();
                if (!ctx) return;
                this.audioContext = ctx;
                
                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);
                
                oscillator.frequency.value = 400;
                oscillator.type = 'square';
                
                gainNode.gain.setValueAtTime(0.03, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
                
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.03);
            } catch (e) {
                // silent fail
            }
        }
    };

    systemBeepSound = {
        audioContext: null,
        play: function() {
            if (!audioEnabled) return;
            
            try {
                const ctx = initAudioContext();
                if (!ctx) return;
                this.audioContext = ctx;

                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gainNode = ctx.createGain();
                
                osc1.connect(gainNode);
                osc2.connect(gainNode);
                gainNode.connect(ctx.destination);
                
                osc1.frequency.value = 600;
                osc2.frequency.value = 900;
                osc1.type = 'sine';
                osc2.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
                
                osc1.start(ctx.currentTime);
                osc2.start(ctx.currentTime);
                osc1.stop(ctx.currentTime + 0.15);
                osc2.stop(ctx.currentTime + 0.15);
            } catch (e) {
                // silent fail
            }
        }
    };

    confirmationSound = {
        audioContext: null,
        play: async function() {
            if (!audioEnabled) return;
            
            try {
                const ctx = initAudioContext();
                if (!ctx) return;
                this.audioContext = ctx;
                
                const playTone = (freq, startTime, duration) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    
                    osc.frequency.value = freq;
                    osc.type = 'sine';
                    
                    gain.gain.setValueAtTime(0.08, startTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
                    
                    osc.start(startTime);
                    osc.stop(startTime + duration);
                };
                
                const now = ctx.currentTime;
                playTone(523, now, 0.15);        // C
                playTone(659, now + 0.12, 0.15); // E
                playTone(784, now + 0.24, 0.25); // G
            } catch (e) {
                // silent fail
            }
        }
    };

    documentOpenSound = {
        audioContext: null,
        play: function() {
            if (!audioEnabled) return;
            
            try {
                const ctx = initAudioContext();
                if (!ctx) return;
                this.audioContext = ctx;
                
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.type = 'sine';

                osc.frequency.setValueAtTime(1800, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.4);
                
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
                
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.3);
            } catch (e) {
                // silent fail
            }
        }
    };
}

function setupAudioUnlock() {
    const unlockAudio = () => {
        audioEnabled = true;
    };

    ['click', 'touchstart', 'keydown'].forEach(event => {
        document.addEventListener(event, unlockAudio, { once: true });
    });
}

async function loadContent() {
    try {
        const response = await fetch('content.json');
        CONTENT = await response.json();
    } catch (err) {
        console.error('Failed to load content.json:', err);
        alert('Error: Could not load content.json. Please check the file exists.');
    }
}

function startCountdown() {
    if (!CONTENT) return;
    const releaseTime = new Date(CONTENT.releaseAt).getTime();
    
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    
    let hasReleased = false;
    
    function updateCountdown() {
        const now = new Date().getTime();
        const distance = releaseTime - now;
        
        if (distance <= 0 && !hasReleased) {
            hasReleased = true;
            clearInterval(countdownInterval);
            startRelease();
            return;
        }
        
        const hours = Math.floor(distance / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        hoursEl.textContent = String(hours).padStart(2, '0');
        minutesEl.textContent = String(minutes).padStart(2, '0');
        secondsEl.textContent = String(seconds).padStart(2, '0');
    }
    
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
}

function startRelease() {
    countdownPhase.classList.add('hidden');
    const terminalPhase = document.getElementById('terminal-phase');
    terminalPhase.classList.remove('hidden');
    document.body.classList.add('release-phase-active');
    
    // Enable audio for terminal and document phases
    audioEnabled = true;
    
    startTerminal();
}

function displayDocument(index) {
    if (!CONTENT) return;
    const docs = CONTENT.documents;
    
    if (index >= docs.length) {
        endRelease();
        return;
    }
    
    currentFileIndex = index;
    const doc = docs[index];
    
    // Play document open sound
    if (documentOpenSound) {
        documentOpenSound.play();
    }
    
    // Check if this is a missing poster - redirect to separate page
    if (doc.isMissingPoster && doc.missingData) {
        const dataParam = encodeURIComponent(JSON.stringify(doc.missingData));
        window.location.href = `missing-poster.html?data=${dataParam}`;
        return;
    }
    
    docFilename.textContent = doc.filename;
    docClassification.textContent = doc.classification;
    docBody.innerHTML = '';
    
    nextBtn.disabled = true;
    skipBtn.disabled = false;
    
    if (doc.image) {
        displayImage(doc.image);
    }
    
    if (doc.body) {
        typeDocument(doc.body);
    } else {
        finishTyping('');
    }
}

function renderMissingPoster(data) {
    const html = `
        <div class="missing-poster">
            <div class="missing-header">MISSING</div>
            
            <div class="missing-image-container">
                <img src="${data.imageUrl}" alt="${data.name}" class="missing-image">
            </div>
            
            <div class="missing-section">
                <div class="missing-label">NAME</div>
                <div class="missing-name">"${data.name}"</div>
                <div class="missing-species">${data.species}</div>
            </div>
            
            <div class="missing-info-grid">
                <div class="missing-info-item">
                    <div class="missing-label">HEIGHT</div>
                    <div class="missing-value">${data.height}</div>
                </div>
                <div class="missing-info-item">
                    <div class="missing-label">WEIGHT</div>
                    <div class="missing-value">${data.weight}</div>
                </div>
                <div class="missing-info-item">
                    <div class="missing-label">LAST SEEN</div>
                    <div class="missing-value">${data.lastSeen}</div>
                </div>
                <div class="missing-info-item">
                    <div class="missing-label">LAST SEEN WITH</div>
                    <div class="missing-value missing-highlight">${data.lastSeenWith}</div>
                </div>
            </div>
            
            <div class="missing-section">
                <div class="missing-label">STATUS</div>
                <div class="missing-status">MISSING</div>
            </div>
            
            <div class="missing-section">
                <div class="missing-label">DISTINGUISHING FEATURES</div>
                <div class="missing-description">${data.features}</div>
            </div>
            
            <div class="missing-section">
                <div class="missing-label">NOTES</div>
                <div class="missing-notes">${data.notes}</div>
            </div>
            
            <div class="missing-section">
                <div class="missing-label">IF YOU HAVE ANY INFORMATION, CALL</div>
                <div class="missing-phone">${data.phone}</div>
                <div class="missing-subtext">◆ ALL TIPS TREATED AS CONFIDENTIAL ◆<br>◆ REWARD OFFERED FOR INFORMATION LEADING TO SAFE RETURN ◆</div>
            </div>
            
            <div class="missing-footer">${data.caseNumber}</div>
        </div>
    `;
    docBody.innerHTML = html;
}

function displayImage(imageData) {
    const imgContainer = document.createElement('div');
    const img = document.createElement('img');
    img.src = imageData.url;
    img.alt = imageData.alt || '';
    img.className = 'document-image';
    imgContainer.appendChild(img);
    
    if (imageData.caption) {
        const caption = document.createElement('div');
        caption.className = 'document-image-caption';
        caption.textContent = imageData.caption;
        imgContainer.appendChild(caption);
    }
    
    docBody.appendChild(imgContainer);
}

function typeDocument(text) {
    isTyping = true;
    const segments = parseTextSegments(text);
    let segmentIndex = 0;
    let charIndex = 0;
    
    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    docBody.appendChild(cursor);

    cursor.dataset.hasText = 'true';
    
    typingInterval = setInterval(() => {
        if (segmentIndex >= segments.length) {
            finishTyping();
            return;
        }
        
        const segment = segments[segmentIndex];
        
        if (segment.type === 'redaction') {
            const redactionSpan = document.createElement('span');
            redactionSpan.className = 'redaction';
            redactionSpan.setAttribute('data-reveal', segment.hidden);
            redactionSpan.textContent = segment.hidden;
            docBody.insertBefore(redactionSpan, cursor);
            
            // Initialize ASCII glitch
            if (window.createASCIIShift) {
                window.createASCIIShift(redactionSpan, { dur: 1000, spread: 0.6 });
            }
            
            segmentIndex++;
            charIndex = 0;
        } else {
            if (charIndex < segment.text.length) {
                const char = segment.text[charIndex];
                const textNode = document.createTextNode(char);
                docBody.insertBefore(textNode, cursor);
                charIndex++;

                if (typingSound && char.trim()) {
                    typingSound.play();
                }
            } else {
                segmentIndex++;
                charIndex = 0;
            }
        }

        cursor.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 40);
}

function parseTextSegments(text) {
    const segments = [];
    const redactionRegex = /\[\[REDACT:(.*?)\]\]/g;
    let lastIndex = 0;
    let match;
    
    while ((match = redactionRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            segments.push({
                type: 'text',
                text: text.substring(lastIndex, match.index)
            });
        }
        
        segments.push({
            type: 'redaction',
            hidden: match[1]
        });
        
        lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < text.length) {
        segments.push({
            type: 'text',
            text: text.substring(lastIndex)
        });
    }
    
    return segments;
}

function skipTyping() {
    if (!isTyping || !CONTENT) return;
    
    clearInterval(typingInterval);
    const doc = CONTENT.documents[currentFileIndex];
    
    // Check if there's text content before clearing
    const cursor = docBody.querySelector('.typing-cursor');
    const hasText = cursor && cursor.dataset.hasText === 'true';
    
    const existingImage = docBody.querySelector('.document-image');
    const imageHTML = existingImage ? existingImage.parentElement.outerHTML : '';
    
    docBody.innerHTML = imageHTML;
    
    if (doc.body) {
        const processedHTML = renderRedactions(doc.body);
        docBody.innerHTML += processedHTML;
    }
    
    finishTyping(hasText);
}

function finishTyping(hasTextParam) {
    clearInterval(typingInterval);
    isTyping = false;
    
    const cursor = docBody.querySelector('.typing-cursor');
    const hasText = hasTextParam !== undefined ? hasTextParam : (cursor && cursor.dataset.hasText === 'true');
    if (cursor) cursor.remove();
    
    nextBtn.disabled = false;
    skipBtn.disabled = true;
    
    // Play confirmation sound only for text documents
    if (hasText && confirmationSound) {
        confirmationSound.play();
    }

    if (window.initRedactionGlitch) {
        setTimeout(() => window.initRedactionGlitch(), 100);
    }
}

function renderRedactions(text) {
    const redactionRegex = /\[\[REDACT:(.*?)\]\]/g;
    
    let result = text;
    result = result.replace(/&/g, '&amp;')
                   .replace(/</g, '&lt;')
                   .replace(/>/g, '&gt;');
    
    result = result.replace(redactionRegex, (match, hidden) => {
        return `<span class="redaction" data-reveal="${hidden}">${hidden}</span>`;
    });
    
    return result;
}

function handleNext() {
    if (!CONTENT) return;
    const docs = CONTENT.documents;
    
    // Reset skip button visibility in case it was hidden
    skipBtn.style.display = '';
    
    if (currentFileIndex < docs.length - 1) {
        displayDocument(currentFileIndex + 1);
    } else {
        endRelease();
    }
}

function endRelease() {
    nextBtn.textContent = 'Close';
    nextBtn.disabled = false;
    skipBtn.disabled = true;
    
    nextBtn.removeEventListener('click', handleNext);
    nextBtn.addEventListener('click', () => {
        docBody.innerHTML = '<p style="text-align: center; color: #7a7f87; padding: 60px 0;">End of release.</p>';
        nextBtn.disabled = true;
        skipBtn.style.display = 'none';
    });
}

// Terminal Animation
let terminalOutput;

const RandomNumber = (min, max) => {
    return Math.floor(Math.random() * max) + min;
};

const Delay = (time) => {
    return new Promise((resolve) => setTimeout(resolve, time));
};

const Print = (text, className = '') => {
    if (className) {
        const span = document.createElement('span');
        span.className = className;
        span.textContent = text;
        terminalOutput.appendChild(span);
    } else {
        terminalOutput.appendChild(document.createTextNode(text));
    }
    
    // system beep for status messages
    if (systemBeepSound && (className === 'success' || className === 'highlight' || 
        text.includes('Connecting') || text.includes('established') || 
        text.includes('successful') || text.includes('OK') || text.includes('COMPLETE') || text.includes('drwxr'))) {
        systemBeepSound.play();
    }
};

const TypeText = async (text, className = '') => {
    const span = className ? document.createElement('span') : null;
    if (span) {
        span.className = className;
        terminalOutput.appendChild(span);
    }
    
    for (const char of text.split('')) {
        await Delay(RandomNumber(20, 50));
        if (span) {
            span.textContent += char;
        } else {
            terminalOutput.appendChild(document.createTextNode(char));
        }

        if (terminalTypingSound && char.trim()) {
            terminalTypingSound.play();
        }
    }
};

const DrawPromptAndCommand = async (user, host, path, command) => {
    Print(user, 'user');
    Print('@');
    Print(host, 'path');
    Print(path + ':~ ');
    await TypeText(command, 'command');
    Print('\n');
};

async function startTerminal() {
    terminalOutput = document.querySelector('.terminal-output');
    terminalOutput.innerHTML = '';
    
    await DrawPromptAndCommand('root', 'kali', '', 'ssh justice@gov.internal');
    await Delay(400);
    Print('Connecting to gov.internal...\n');
    await Delay(600);
    Print('Connection established.\n');
    await Delay(300);
    Print('justice@gov.internal password:', 'highlight');
    await Delay(1500);
    Print('\n');
    await Delay(200);
    Print('Authentication successful.\n\n');
    await Delay(400);
    
    await DrawPromptAndCommand('justice', 'gov.internal', '', 'cd /vault/classified');
    await Delay(100);
    await DrawPromptAndCommand('justice', 'gov.internal', '/vault/classified', 'ls -la');
    await Delay(300);
    Print('total 4\ndrwxr-x--- 2 root classified 4096 Feb  8 00:00 .\n-rw-r----- 1 root classified  encrypted_files.tar.gz.enc\n\n');
    await Delay(400);
    
    await DrawPromptAndCommand('justice', 'gov.internal', '/vault/classified', './decrypt.sh --key=BEARDBEARS2026');
    await Delay(500);
    Print('[*] Initializing decryption protocol...', 'success');
    Print('\n');
    await Delay(400);
    Print('[*] Loading encryption keys...', 'success');
    Print('\n');
    await Delay(500);
    Print('[*] Verifying credentials... ', 'success');
    await Delay(600);
    Print('OK', 'success');
    Print('\n');
    await Delay(300);
    Print('[*] Decrypting files: ', 'success');
    
    const fileCount = CONTENT ? CONTENT.documents.length : 4;
    for (let i = 0; i < fileCount; i++) {
        await Delay(250);
        Print('█');
    }
    
    await Delay(400);
    Print(' COMPLETE', 'success');
    Print('\n');
    await Delay(400);
    Print('[*] ' + fileCount + ' files decrypted successfully', 'success');
    Print('\n');
    await Delay(300);
    Print('[*] Preparing document viewer...', 'success');
    Print('\n\n');
    await Delay(500);
    Print('Ready. Press any key to view files...', 'highlight');
    
    await Delay(500);
    
    // Play confirmation sound
    if (confirmationSound) {
        confirmationSound.play();
    }
    
    await Delay(1500);
    
    // elease phase
    const terminalPhase = document.getElementById('terminal-phase');
    terminalPhase.classList.add('hidden');
    releasePhase.classList.remove('hidden');
    displayDocument(0);
}

// Bubble Button Effect Animation
function initBubbleButtons() {
    if (typeof gsap === 'undefined') return;
    
    document.querySelectorAll('.button--bubble').forEach(function(button) {
        const container = button.parentElement;
        const circlesTopLeft = container.querySelectorAll('.circle.top-left');
        const circlesBottomRight = container.querySelectorAll('.circle.bottom-right');
        const effectButton = container.querySelector('.button.effect-button');
        
        const btTl = gsap.timeline({ paused: true });
        
        // Top-left circles animation
        const tl = gsap.timeline();
        tl.set(circlesTopLeft, { x: 0, y: 0, rotation: -45 });
        tl.to(circlesTopLeft, { 
            duration: 1.2, 
            x: -25, 
            y: -25, 
            scaleY: 2, 
            ease: "slow(0.1, 0.7, false)" 
        });
        tl.to(circlesTopLeft[0], { duration: 0.1, scale: 0.2, x: '+=6', y: '-=2' });
        tl.to(circlesTopLeft[1], { duration: 0.1, scaleX: 1, scaleY: 0.8, x: '-=10', y: '-=7' }, '-=0.1');
        tl.to(circlesTopLeft[2], { duration: 0.1, scale: 0.2, x: '-=15', y: '+=6' }, '-=0.1');
        tl.to(circlesTopLeft[0], { duration: 1, scale: 0, x: '-=5', y: '-=15', opacity: 0 });
        tl.to(circlesTopLeft[1], { duration: 1, scaleX: 0.4, scaleY: 0.4, x: '-=10', y: '-=10', opacity: 0 }, '-=1');
        tl.to(circlesTopLeft[2], { duration: 1, scale: 0, x: '-=15', y: '+=5', opacity: 0 }, '-=1');
        
        // Bottom-right circles animation
        const tl2 = gsap.timeline();
        tl2.set(circlesBottomRight, { x: 0, y: 0, rotation: 45 });
        tl2.to(circlesBottomRight, { 
            duration: 1.1, 
            x: 30, 
            y: 30, 
            ease: "slow(0.1, 0.7, false)" 
        });
        tl2.to(circlesBottomRight[0], { duration: 0.1, scale: 0.2, x: '-=6', y: '+=3' });
        tl2.to(circlesBottomRight[1], { duration: 0.1, scale: 0.8, x: '+=7', y: '+=3' }, '-=0.1');
        tl2.to(circlesBottomRight[2], { duration: 0.1, scale: 0.2, x: '+=15', y: '-=6' }, '-=0.2');
        tl2.to(circlesBottomRight[0], { duration: 1, scale: 0, x: '+=5', y: '+=15', opacity: 0 });
        tl2.to(circlesBottomRight[1], { duration: 1, scale: 0.4, x: '+=7', y: '+=7', opacity: 0 }, '-=1');
        tl2.to(circlesBottomRight[2], { duration: 1, scale: 0, x: '+=15', y: '-=5', opacity: 0 }, '-=1');
        
        // Combine all animations
        btTl.add(tl, 0);
        btTl.to(effectButton, { duration: 0.8, scaleY: 1.1 }, 0.1);
        btTl.add(tl2, 0.2);
        btTl.to(effectButton, { duration: 1.8, scale: 1, ease: "elastic.out(1.2, 0.4)" }, 1.2);
        btTl.timeScale(2.6);
        
        button.addEventListener('mouseenter', function() {
            if (!button.disabled) {
                btTl.restart();
            }
        });
    });
}

// Initialize bubble buttons when document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBubbleButtons);
} else {
    initBubbleButtons();
}

init();
