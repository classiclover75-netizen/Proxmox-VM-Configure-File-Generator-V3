import React, { useState } from 'react';

interface CodePanelProps {
  title: string;
  titleColor?: string;
  titleBg?: string;
  content: string;
  copyBtnColor?: string;
  downloadFilename?: string;
  borderColor?: string;
  singleLine?: boolean;
}

export function CodePanel({
  title,
  titleColor = '#ff7675',
  titleBg = '#000',
  content,
  copyBtnColor = '#e17055',
  downloadFilename,
  borderColor = '#4bcffa',
  singleLine = false,
}: CodePanelProps) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleSave = () => {
    if (!downloadFilename) return;
    const blob = new Blob([content], { type: 'text/plain' });
    const anchor = document.createElement('a');
    anchor.download = downloadFilename;
    anchor.href = window.URL.createObjectURL(blob);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const currentCopyColor = copied ? '#55efc4' : copyBtnColor;
  const currentCopyTextColor = copied ? '#2d3436' : 'white';
  
  const currentSaveColor = saved ? '#55efc4' : '#0984e3';
  const currentSaveTextColor = saved ? '#2d3436' : 'white';

  return (
    <div style={{ borderColor }} className="bg-[#1e272e] p-5 rounded-lg relative border mb-5 shadow-inner">
      <div
        className="font-mono p-3 rounded-md mb-4 text-sm font-semibold"
        style={{ color: titleColor, backgroundColor: titleBg }}
      >
        {title}
      </div>
      
      <div className="absolute top-[1.1rem] right-4 flex space-x-3">
        {downloadFilename && (
          <button
            onClick={handleSave}
            style={{ backgroundColor: currentSaveColor, color: currentSaveTextColor }}
            className="px-3 py-1.5 rounded-md text-xs font-bold transition-colors shadow-sm"
          >
            {saved ? 'SAVED!' : 'SAVE TO FILE'}
          </button>
        )}
        <button
          onClick={handleCopy}
          style={{ backgroundColor: currentCopyColor, color: currentCopyTextColor }}
          className="px-3 py-1.5 rounded-md text-xs font-bold transition-colors shadow-sm"
        >
          {copied ? 'COPIED!' : 'COPY COMMAND'}
        </button>
      </div>

      <textarea
        readOnly
        value={content}
        className={`w-full bg-transparent text-[#dff9fb] font-mono text-xs outline-none ${singleLine ? 'h-8 resize-none overflow-hidden whitespace-nowrap' : 'h-[350px] resize-vertical'}`}
      />
    </div>
  );
}
