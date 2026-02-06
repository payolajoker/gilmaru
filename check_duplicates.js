const fs = require('fs');
const path = require('path');

// Read word_data.js
const wordDataPath = path.join(__dirname, 'word_data.js');
const content = fs.readFileSync(wordDataPath, 'utf8');

// Extract arrays using regex because simple require won't work without module.exports
const extractArray = (name) => {
    const regex = new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`);
    const match = content.match(regex);
    if (!match) return [];

    // Clean up string to be JSON parseable
    let arrayStr = match[1]
        .replace(/'/g, '"') // Replace single quotes with double quotes
        .replace(/\/\/.*/g, '') // Remove comments
        .replace(/,\s*$/, ''); // Remove trailing comma if exists

    // Split by comma and clean up whitespace and quotes
    return arrayStr.split(',')
        .map(s => s.trim())
        .map(s => s.replace(/^"|"$/g, ''))
        .filter(s => s.length > 0);
};

const wordA = extractArray('wordA');
const wordB = extractArray('wordB');
const wordC = extractArray('wordC');
const wordD = extractArray('wordD');

console.log(`Word Counts: A=${wordA.length}, B=${wordB.length}, C=${wordC.length}, D=${wordD.length}`);

// Check for duplicates across arrays
const allWords = [
    { name: 'A', words: wordA },
    { name: 'B', words: wordB },
    { name: 'C', words: wordC },
    { name: 'D', words: wordD }
];

let hasDuplicates = false;

for (let i = 0; i < allWords.length; i++) {
    for (let j = i + 1; j < allWords.length; j++) {
        const group1 = allWords[i];
        const group2 = allWords[j];

        const duplicates = group1.words.filter(word => group2.words.includes(word));

        if (duplicates.length > 0) {
            hasDuplicates = true;
            console.log(`\n[Overlap between ${group1.name} and ${group2.name}]: ${duplicates.length} words`);
            console.log(duplicates.join(', '));
        }
    }
}

// Check duplicates within same array (Self-duplication)
allWords.forEach(group => {
    const unique = new Set(group.words);
    if (unique.size !== group.words.length) {
        hasDuplicates = true;
        console.log(`\n[Self-duplication in ${group.name}]:`);
        const seen = new Set();
        const dups = group.words.filter(w => {
            if (seen.has(w)) return true;
            seen.add(w);
            return false;
        });
        console.log(dups.join(', '));
    }
});

if (!hasDuplicates) {
    console.log("\nNo duplicates found! All clean.");
} else {
    console.log("\nDuplicates found as listed above.");
}
