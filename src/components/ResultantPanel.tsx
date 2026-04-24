import React from 'react';
import { Power, Sigma } from 'lucide-react';
import { cn } from '../lib/utils';
import { WaveParams } from './WaveControls';

interface ResultantPanelProps {
  waves: WaveParams[];
  show: boolean;
  onChangeShow: (show: boolean) => void;
}

export function ResultantPanel({ waves, show, onChangeShow }: ResultantPanelProps) {
  const activeWaves = waves.filter(w => w.show);

  return (
    <div className={cn("p-4 rounded-xl border bg-slate-900/50 transition-all border-yellow-500/40 shadow-[0_0_15px_rgba(234,179,8,0.1)]", !show && "opacity-60 grayscale")}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sigma className="w-4 h-4 text-yellow-500" />
          <h3 className="font-semibold text-sm text-yellow-500">合成波 (Superposition)</h3>
        </div>
        <button
          onClick={() => onChangeShow(!show)}
          className={cn("p-1.5 rounded-md transition-colors", show ? "bg-slate-700 text-white" : "text-slate-500 hover:bg-slate-800")}
          title={show ? "隐藏" : "显示"}
        >
          <Power className="w-4 h-4" />
        </button>
      </div>

      {show && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="text-xs text-slate-400 mb-1">实时数学表达式:</div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] leading-relaxed text-slate-300 overflow-x-auto custom-scrollbar whitespace-nowrap">
            <span className="text-yellow-500 font-bold">y(t) = </span>
            {activeWaves.length === 0 ? (
              <span className="text-slate-500">0</span>
            ) : (
              activeWaves.map((w, i) => {
                const sign = i === 0 ? '' : ' + ';
                if (w.type === 'custom') {
                  return (
                    <span key={w.id}>
                      {sign}
                      <span style={{ color: w.color }}>
                        ({w.expr || '0'})
                      </span>
                    </span>
                  );
                }
                const A = w.A.toFixed(3);
                const f = w.f.toFixed(3);
                const phiDeg = (w.phi * 180 / Math.PI).toFixed(1);
                const phiStr = w.phi === 0 ? '' : ` ${w.phi > 0 ? '+' : '-'} ${Math.abs(Number(phiDeg))}°`;
                const func = w.type === 'sin' ? 'sin' : 'cos';
                return (
                  <span key={w.id}>
                    {sign}
                    <span style={{ color: w.color }}>
                      {A}{func}(2π·{f}t{phiStr})
                    </span>
                  </span>
                );
              })
            )}
          </div>
          <div className="text-[10px] text-slate-500 flex justify-between">
            <span>包含 {activeWaves.length} 个有效波形</span>
            <span>参数精度: 0.001</span>
          </div>
        </div>
      )}
    </div>
  );
}
