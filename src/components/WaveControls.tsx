import React, { useState, useEffect } from 'react';
import { Slider } from './Slider';
import { Activity, Power, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { compileExpression } from '../lib/math';

export interface WaveParams {
  id: string;
  A: number;
  f: number;
  phi: number;
  type: 'sin' | 'cos' | 'custom';
  expr?: string;
  isStatic?: boolean;
  show: boolean;
  color: string;
}

interface WaveControlsProps {
  title: string;
  params: WaveParams;
  onChange: (updates: Partial<WaveParams>) => void;
  onRemove?: () => void;
}

export function WaveControls({ title, params, onChange, onRemove }: WaveControlsProps) {
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    if (params.type === 'custom' && params.expr) {
      setIsValid(compileExpression(params.expr) !== null);
    }
  }, [params.expr, params.type]);

  return (
    <div className={cn("p-4 rounded-xl border bg-slate-900/50 transition-all", !params.show && "opacity-60 grayscale")} style={{ borderColor: `${params.color}40`, boxShadow: `0 0 15px ${params.color}10` }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" style={{ color: params.color }} />
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        <div className="flex items-center gap-1">
          {onRemove && (
            <button 
              onClick={onRemove}
              className="p-1.5 rounded-md transition-colors text-slate-500 hover:bg-red-500/20 hover:text-red-400"
              title="删除此波形"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={() => onChange({ show: !params.show })}
            className={cn("p-1.5 rounded-md transition-colors", params.show ? "bg-slate-700 text-white" : "text-slate-500 hover:bg-slate-800")}
            title={params.show ? "隐藏" : "显示"}
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {params.show && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {params.type !== 'custom' && (
            <div className="flex bg-slate-950 rounded-lg p-1">
              <button
                className={cn("flex-1 text-xs py-1 rounded-md transition-colors", params.type === 'sin' ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-300")}
                onClick={() => onChange({ type: 'sin' })}
              >
                正弦 (Sin)
              </button>
              <button
                className={cn("flex-1 text-xs py-1 rounded-md transition-colors", params.type === 'cos' ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-300")}
                onClick={() => onChange({ type: 'cos' })}
              >
                余弦 (Cos)
              </button>
            </div>
          )}
          
          {params.type === 'custom' ? (
            <div className="flex flex-col gap-1.5 mt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-400">y(x, t) = </label>
                <button
                  onClick={() => onChange({ isStatic: !params.isStatic })}
                  className={cn("text-[10px] px-2 py-0.5 rounded border transition-colors", params.isStatic ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30")}
                  title="静态函数会在整个坐标轴上绘制，动态波形仅随时间向右延伸"
                >
                  {params.isStatic ? "静态函数 (全轴)" : "动态波形 (t≥0)"}
                </button>
              </div>
              <input
                type="text"
                value={params.expr || ''}
                onChange={(e) => onChange({ expr: e.target.value })}
                placeholder="例如: sin(x - t*2) 或 asin(x)"
                className={cn(
                  "w-full bg-slate-950 border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 font-mono",
                  isValid ? "border-slate-700 focus:border-cyan-500 focus:ring-cyan-500" : "border-red-500/50 focus:border-red-500 focus:ring-red-500"
                )}
              />
              {!isValid && (
                <div className="flex items-center gap-1.5 text-xs text-red-400 mt-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>表达式无效，请检查语法</span>
                </div>
              )}
            </div>
          ) : (
            <>
              <Slider label="振幅 (A)" value={params.A} min={0} max={10} step={1} onChange={(v) => onChange({ A: v })} />
              <Slider label="频率 (f)" value={params.f} min={0} max={10} step={1} unit=" Hz" onChange={(v) => onChange({ f: v })} />
              <Slider label="相位 (φ)" value={params.phi} min={0} max={10} step={1} unit=" rad" onChange={(v) => onChange({ phi: v })} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
