// Game & Rigging State
let forcedRollValue = null;
let rigPreset = 'none';
let currentTurn = 0; // 0 = Red/Player 1, 1 = Green/Player 2
let peer = null;
let conn = null;

// Audio Synth Effects (Bina kisi audio file ke sound effect create karta hai)
function playDiceSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
    } catch(e) {}
}

// PeerJS Remote Controller Connection Logic
function initPeerConnection() {
    const randomRoom = 'ludo-' + Math.floor(1000 + Math.random() * 9000);
    peer = new Peer(randomRoom);

    peer.on('open', (id) => {
        document.getElementById('room-code-display').innerText = id;
    });

    peer.on('connection', (connection) => {
        conn = connection;
        setupDataListener();
    });
}

function setupDataListener() {
    if (!conn) return;
    conn.on('data', (data) => {
        if (data.type === 'FORCE_DICE') {
            forcedRollValue = parseInt(data.value);
            highlightForceBtn(data.value);
        } else if (data.type === 'SET_PRESET') {
            rigPreset = data.preset;
            document.getElementById('rig-preset').value = data.preset;
        }
    });
}

// Calculate Dice Outcome (Rigged or Random)
function getNextDiceRoll() {
    if (forcedRollValue !== null) {
        const val = forcedRollValue;
        forcedRollValue = null; // Single turn apply karke clear kar dega
        clearForceBtnHighlight();
        return val;
    }

    if (rigPreset === 'always6') return 6;
    if (rigPreset === 'lucky') return Math.random() < 0.6 ? (Math.random() < 0.5 ? 5 : 6) : Math.floor(Math.random() * 6) + 1;
    if (rigPreset === 'unlucky') return Math.random() < 0.7 ? (Math.random() < 0.5 ? 1 : 2) : Math.floor(Math.random() * 6) + 1;

    return Math.floor(Math.random() * 6) + 1;
}

// 3D Dice Rotation Animation
function animateDiceRoll(finalValue) {
    playDiceSound();
    const cube = document.getElementById('dice-cube');
    
    // Random rotations for 3D spin effect
    const rotX = (Math.floor(Math.random() * 4) + 4) * 360;
    const rotY = (Math.floor(Math.random() * 4) + 4) * 360;

    // Map outcome value to 3D cube face rotations
    let faceRot = { x: 0, y: 0 };
    switch(finalValue) {
        case 1: faceRot = { x: 0, y: 0 }; break;
        case 6: faceRot = { x: 0, y: 180 }; break;
        case 3: faceRot = { x: 0, y: -90 }; break;
        case 4: faceRot = { x: 0, y: 90 }; break;
        case 2: faceRot = { x: -90, y: 0 }; break;
        case 5: faceRot = { x: 90, y: 0 }; break;
    }

    cube.style.transform = `rotateX(${rotX + faceRot.x}deg) rotateY(${rotY + faceRot.y}deg)`;
}

// UI Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initPeerConnection();

    // Roll Dice Click
    document.getElementById('roll-btn').addEventListener('click', () => {
        const rollValue = getNextDiceRoll();
        animateDiceRoll(rollValue);

        // Switch turn indicator
        currentTurn = currentTurn === 0 ? 1 : 0;
        document.getElementById('card-p0').classList.toggle('active-turn', currentTurn === 0);
        document.getElementById('card-p1').classList.toggle('active-turn', currentTurn === 1);
    });

    // Stealth Modal Toggle
    const modal = document.getElementById('stealth-modal');
    document.getElementById('open-stealth-modal').addEventListener('click', () => modal.classList.remove('hidden'));
    document.getElementById('close-stealth-modal').addEventListener('click', () => modal.classList.add('hidden'));

    // Invisible Secret Hotspot Tap
    document.getElementById('secret-hotspot').addEventListener('click', () => {
        modal.classList.remove('hidden');
    });

    // Force Buttons Click (Local Control)
    document.querySelectorAll('.force-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const val = parseInt(e.target.dataset.val);
            forcedRollValue = val;
            highlightForceBtn(val);

            // Send signal to main game if running from remote phone
            if (conn) conn.send({ type: 'FORCE_DICE', value: val });
        });
    });

    // Preset Selection
    document.getElementById('rig-preset').addEventListener('change', (e) => {
        rigPreset = e.target.value;
        if (conn) conn.send({ type: 'SET_PRESET', preset: rigPreset });
    });

    // Connect from Remote Controller Phone
    document.getElementById('connect-peer-btn').addEventListener('click', () => {
        const targetRoom = document.getElementById('target-room-input').value.trim();
        if (!targetRoom) return;
        
        conn = peer.connect(targetRoom);
        conn.on('open', () => {
            document.getElementById('peer-status').innerText = 'Status: Connected to Game!';
            document.getElementById('peer-status').style.color = '#28a745';
        });
        setupDataListener();
    });
});

function highlightForceBtn(val) {
    document.querySelectorAll('.force-btn').forEach(btn => {
        btn.classList.toggle('selected', parseInt(btn.dataset.val) === val);
    });
}

function clearForceBtnHighlight() {
    document.querySelectorAll('.force-btn').forEach(btn => btn.classList.remove('selected'));
}
