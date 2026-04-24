import React, { useState, useEffect } from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  unit?: string;
}

export function Slider({ label, value, min, max, step, onChange, unit = '' }: SliderProps) {
  const [inputValue, setInputValue] = useState(value.toString());

  useEffect(() => {
    // Only update if the parsed value is different to avoid interrupting typing
    if (parseFloat(inputValue) !== value) {
      setInputValue(value.toString());
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    const parsed = parseFloat(e.target.value);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center text-xs font-medium text-slate-400">
        <label className="flex items-center gap-2">
          {label}
          <span className="text-[9px] text-slate-500 font-normal bg-slate-800/50 px-1.5 py-0.5 rounded">精度: {step}</span>
        </label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={inputValue}
            onChange={handleInputChange}
            step={step}
            className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-right text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-xs"
          />
          <span className="w-4">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );
}
