const fs = require('fs');

const path = 'prisma/icuPatientSeed.js';
let content = fs.readFileSync(path, 'utf8');

// The file has blocks of:
// nationalId: "NID-xxx",
// ...
// age: Y,
// gender: "Z",

const blocks = [];
let match;

const rx = /nationalId:\s*"NID-\d+",\s*age:\s*(\d+),\s*gender:\s*"([^"]+)"/g;

content = content.replace(/nationalId:\s*"NID-\d+",([\s\S]*?)age:\s*(\d+),([\s\S]*?)gender:\s*"([^"]+)",/g, (match, p1, ageStr, p2, genderStr) => {
    const age = parseInt(ageStr, 10);
    const gender = genderStr.toLowerCase();
    
    // Estimate birth year from age (assuming 2026)
    const birthYear = 2026 - age;
    
    const century = birthYear >= 2000 ? '3' : '2';
    const yearStr = String(birthYear).slice(-2);
    const monthStr = '05';
    const dayStr = '12';
    const gov = '01'; // Cairo
    const seq = '123';
    const genderDigit = gender === 'male' ? '5' : '4';
    const check = '4';
    
    const newId = `${century}${yearStr}${monthStr}${dayStr}${gov}${seq}${genderDigit}${check}`;
    
    return `nationalId: "${newId}",${p1}age: ${age},${p2}gender: "${genderStr}",`;
});

fs.writeFileSync(path, content);
console.log('Done!');
