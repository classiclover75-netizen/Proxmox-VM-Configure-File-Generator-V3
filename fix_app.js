const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldStateDecls = `  const [savedNotif, setSavedNotif] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);`;

const newStateDecls = `  const [savedNotif, setSavedNotif] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [blockedCombo, setBlockedCombo] = useState<string | null>(null);`;

code = code.replace(oldStateDecls, newStateDecls);

const generateStartOld = `  const generateIdentity = (recordHistory = false, currentInputs = inputs) => {
    // Current input references
    const { brand, model, emulatedCpu } = selectHardwareIdentity(
      pcDB,
      currentInputs.brandSelect,
      currentInputs.typeSelect,
      currentInputs.cpuVendor,
      currentInputs.cpuArch
    );

    const dKeyTarget = currentInputs.diskBrand === 'random' ? undefined : currentInputs.diskBrand;`;

const generateStartNew = `  const generateIdentity = (recordHistory = false, currentInputs = inputs) => {
    // Current input references
    const selectedHardware = selectHardwareIdentity(
      pcDB,
      currentInputs.brandSelect,
      currentInputs.typeSelect,
      currentInputs.cpuVendor,
      currentInputs.cpuArch
    );

    if (!selectedHardware) {
      setIdentity(null);
      setBlockedCombo("No PC model matches this combination (e.g. Dell/ASUS + AMD + Home/Office). Please change the Brand, Type, or CPU Vendor selection.");
      return;
    }

    setBlockedCombo(null);
    const { brand, model, emulatedCpu } = selectedHardware;

    const dKeyTarget = currentInputs.diskBrand === 'random' ? undefined : currentInputs.diskBrand;`;

code = code.replace(generateStartOld, generateStartNew);

const warningMarkup = `          {blockedCombo && (
            <div className="mt-4 p-4 bg-[#fdcb6e]/20 border-2 border-[#fdcb6e] rounded-md text-[#2d3436] font-bold flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#d6a54a]" />
              <span>{blockedCombo}</span>
            </div>
          )}
          
          <button
            onClick={handleGenerateClick}
            className="flex-grow max-w-[250px] bg-[#fdcb6e] text-[#2d3436] font-bold text-[15px] rounded-md transition-colors hover:bg-[#ffeaa7]"
          >
            Generate New Identity
          </button>
        </div>`;

code = code.replace(`          <button
            onClick={handleGenerateClick}
            className="flex-grow max-w-[250px] bg-[#fdcb6e] text-[#2d3436] font-bold text-[15px] rounded-md transition-colors hover:bg-[#ffeaa7]"
          >
            Generate New Identity
          </button>
        </div>`, warningMarkup);

fs.writeFileSync('src/App.tsx', code);
console.log('done');
