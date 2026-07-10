const fs = require('fs');

const broadwellCpus = [
  { base: "Broadwell-noTSX-IBRS", name: "Intel(R) Core(TM) i5-5675C CPU @ 3.10GHz", codename: "Broadwell", threads: 4 },
  { base: "Broadwell-noTSX-IBRS", name: "Intel(R) Core(TM) i7-5775C CPU @ 3.30GHz", codename: "Broadwell", threads: 8 },
  { base: "Broadwell-noTSX-IBRS", name: "Intel(R) Core(TM) i7-6800K CPU @ 3.40GHz", codename: "Broadwell-E", threads: 12 },
  { base: "Broadwell-noTSX-IBRS", name: "Intel(R) Core(TM) i7-6850K CPU @ 3.60GHz", codename: "Broadwell-E", threads: 12 },
  { base: "Broadwell-noTSX-IBRS", name: "Intel(R) Core(TM) i7-6900K CPU @ 3.20GHz", codename: "Broadwell-E", threads: 16 },
  { base: "Broadwell-noTSX-IBRS", name: "Intel(R) Core(TM) i7-6950X CPU @ 3.00GHz", codename: "Broadwell-E", threads: 20 }
];

let data = fs.readFileSync('src/lib/data.ts', 'utf8');

// A quick and dirty way to parse/modify string representation of pcDB
// Actually, since pcDB is a JS object, let's just parse it, modify, and regenerate it, BUT regenerating might reorder things or lose exact formatting.

// A better way: find the right models and inject the string.
