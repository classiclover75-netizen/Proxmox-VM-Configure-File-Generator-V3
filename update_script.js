const fs = require('fs');
let data = fs.readFileSync('src/lib/data.ts', 'utf8');

const cpusToAdd = `, { base: "EPYC-Milan", name: "AMD Ryzen 5 5600X 6-Core Processor", codename: "Vermeer", threads: 12 }, { base: "EPYC-Milan", name: "AMD Ryzen 7 5800X 8-Core Processor", codename: "Vermeer", threads: 16 }, { base: "EPYC-Milan", name: "AMD Ryzen 7 5800X3D 8-Core Processor", codename: "Vermeer", threads: 16 }, { base: "EPYC-Milan", name: "AMD Ryzen 9 5900X 12-Core Processor", codename: "Vermeer", threads: 24 }, { base: "EPYC-Milan", name: "AMD Ryzen 9 5950X 16-Core Processor", codename: "Vermeer", threads: 32 }, { base: "EPYC-Milan", name: "AMD Ryzen 5 5600G with Radeon Graphics", codename: "Cezanne", threads: 12 }, { base: "EPYC", name: "AMD Ryzen 5 3600X 6-Core Processor", codename: "Matisse", threads: 12 }, { base: "EPYC", name: "AMD Ryzen 7 3800X 8-Core Processor", codename: "Matisse", threads: 16 }, { base: "EPYC", name: "AMD Ryzen 9 3900X 12-Core Processor", codename: "Matisse", threads: 24 }, { base: "EPYC", name: "AMD Ryzen 9 3950X 16-Core Processor", codename: "Matisse", threads: 32 }`;

const targetModels = [
  "Alienware Aurora R9",
  "Alienware Aurora R10",
  "Alienware Aurora R14",
  "Pavilion Gaming Desktop TG01",
  "HP Pavilion Desktop M01",
  "OMEN by HP 25L Gaming Desktop",
  "OMEN by HP 30L Gaming Desktop",
  "HP Victus 15L Gaming Desktop TG02",
  "HP Pavilion Gaming Desktop 690",
  "HP Victus TG01 Gaming",
  "IdeaCentre 3",
  "Legion Tower 5i",
  "IdeaCentre 5",
  "Legion T5 26AMR5",
  "IdeaCentre Gaming 5",
  "ROG Strix G10CE",
  "ROG Strix GA15",
  "ROG Strix GA35",
  "ROG Strix G10DK",
  "TUF Gaming GT501 PC",
  "TUF Gaming B550-PLUS PC",
  "ROG Crosshair VIII Dark Hero"
];

let lines = data.split('\n');

for (let i = 0; i < lines.length; i++) {
  let matched = false;
  for (const model of targetModels) {
    if (lines[i].includes(`p: "${model}"`)) {
      matched = true;
      break;
    }
  }
  
  if (matched) {
    if (lines[i].includes("AMD Ryzen 5 5600X 6-Core Processor")) {
      // already added
      continue;
    }
    // append to compatibleCpus array.
    // lines[i] ends with `] },` or `] }`
    if (lines[i].endsWith('] },')) {
      lines[i] = lines[i].slice(0, -4) + cpusToAdd + '] },';
    } else if (lines[i].endsWith('] }')) {
      lines[i] = lines[i].slice(0, -3) + cpusToAdd + '] }';
    }
  }
}

fs.writeFileSync('src/lib/data.ts', lines.join('\n'));
console.log('done');
