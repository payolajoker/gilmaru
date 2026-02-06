const fs = require('fs');
const path = require('path');

// 1. Load Data
const wordDataPath = path.join(__dirname, 'word_data.js');
const content = fs.readFileSync(wordDataPath, 'utf8');

const extractArray = (name) => {
    const regex = new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`);
    const match = content.match(regex);
    if (!match) return [];
    let arrayStr = match[1]
        .replace(/'/g, '"')
        .replace(/\/\/.*/g, '')
        .replace(/,\s*$/, '');
    return arrayStr.split(',')
        .map(s => s.trim())
        .map(s => s.replace(/^"|"$/g, ''))
        .filter(s => s.length > 0);
};

const wordA = extractArray('wordA');
const wordB = extractArray('wordB');
const wordC = extractArray('wordC');
const wordD = extractArray('wordD');

// 2. Logic from app.js
const originLat = 33.0;
const originLng = 124.0;
const blockSize = 0.005; // 0.005 degree ~ 550m
const subBlockSize = 500; // 500x500 grid

function getCodeFromLatLon(lat, lng) {
    const y = Math.floor((lat - originLat) / blockSize);
    const x = Math.floor((lng - originLng) / blockSize);

    const codeY = "Y" + String(y).padStart(3, '0');
    const codeX = "X" + String(x).padStart(3, '0');

    // Inner Grid
    const latOffset = (lat - originLat) % blockSize;
    const lngOffset = (lng - originLng) % blockSize;

    // blockSize (approx 550m) / 500 = approx 1.1m (No, this logic is index based)
    // In app.js: 
    // const innerX = Math.floor(((lng - originLng) % blockSize) / (blockSize / subBlockSize));
    // const innerY = Math.floor(((lat - originLat) % blockSize) / (blockSize / subBlockSize));

    // Wait, let's look at app.js exact logic.
    // Actually, subBlockSize is purely integer count (500).
    const innerX = Math.floor((lngOffset / blockSize) * subBlockSize);
    const innerY = Math.floor((latOffset / blockSize) * subBlockSize);

    const codeC = "C" + String(innerX + 1).padStart(3, '0');
    const codeD = "D" + String(innerY + 1).padStart(3, '0');

    return {
        code: `${codeX}.${codeY}.${codeC}.${codeD}`,
        x: x * 500 + innerX,
        y: y * 500 + innerY
    };
}

function getWordsFromCode(code) {
    const parts = code.split('.');
    if (parts.length !== 4) return [];

    const X = parseInt(parts[0].substring(1)) || 0;
    const Y = parseInt(parts[1].substring(1)) || 0;
    const C = parseInt(parts[2].substring(1)) || 0;
    const D = parseInt(parts[3].substring(1)) || 0;

    return [
        wordA[((X + C) * 11) % wordA.length],
        wordB[((Y + D) * 17) % wordB.length],
        wordC[((X + Y + C) * 23) % wordC.length],
        wordD[((Y + C + D) * 29) % wordD.length]
    ];
}

function hasJongseong(char) {
    if (!char) return false;
    const code = char.charCodeAt(0) - 44032;
    if (code < 0 || code > 11171) return false;
    return code % 28 !== 0;
}

function getJosa(word, type) {
    const lastChar = word.charAt(word.length - 1);
    const has = hasJongseong(lastChar);
    if (type === 'iga') return has ? '이' : '가';
    if (type === 'eunneun') return has ? '은' : '는';
    if (type === 'eulreul') return has ? '을' : '를';
    if (type === 'wagwa') return has ? '과' : '와';
    if (type === 'irang') return has ? '이랑' : '랑';
    return '';
}

function generateSentence(words, seed) {
    if (words.length < 4) return "";

    const shuffledIdx = [0, 1, 2, 3];
    let randomVal = seed;
    const seededRandom = () => {
        randomVal = (randomVal * 9301 + 49297) % 233280;
        return randomVal / 233280;
    };

    for (let i = shuffledIdx.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom() * (i + 1));
        [shuffledIdx[i], shuffledIdx[j]] = [shuffledIdx[j], shuffledIdx[i]];
    }

    const W = shuffledIdx.map(idx => words[idx]);
    const H = (w) => `<span class="highlight-word">${w}</span>`;
    const templateIdx = Math.floor(seededRandom() * 5);
    const [w1, w2, w3, w4] = W;

    if (templateIdx === 0) {
        return `${H(w1)}${getJosa(w1, 'iga')} ${H(w2)}에서 ${H(w3)}${getJosa(w3, 'wagwa')} ${H(w4)}`;
    } else if (templateIdx === 1) {
        return `${H(w1)}${getJosa(w1, 'eunneun')} ${H(w2)}, ${H(w3)} 그리고 ${H(w4)}`;
    } else if (templateIdx === 2) {
        return `${H(w1)}${getJosa(w1, 'wagwa')} ${H(w2)}의 ${H(w3)}, ${H(w4)}`;
    } else if (templateIdx === 3) {
        return `${H(w1)}, ${H(w2)}${getJosa(w2, 'irang')} ${H(w3)}에서 ${H(w4)}`;
    } else {
        return `${H(w1)}${getJosa(w1, 'iga')} ${H(w2)}${getJosa(w2, 'eulreul')} 만나 ${H(w3)}${getJosa(w3, 'wagwa')} ${H(w4)}`;
    }
}

// Target: National Assembly Library
const lat = 37.531111;
const lng = 126.917222;

const result = getCodeFromLatLon(lat, lng);
const words = getWordsFromCode(result.code);
const sentence = generateSentence(words, result.x + result.y);

console.log(`Lat: ${lat}, Lng: ${lng}`);
console.log(`Code: ${result.code}`);
console.log(`Words: ${words.join(', ')}`);
console.log(`Sentence: ${sentence}`);
