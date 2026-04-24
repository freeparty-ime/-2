import React, { useState, useEffect } from 'react';
import { FunctionSquare, Power, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { compileExpression } from '../lib/math';

export interface CustomExpressionParams {
  expr: string;
  show: boolean;
  color: string;
}

interface Props {
  params: CustomExpressionParams;
  onChange: (updates: Partial<CustomExpressionParams>) => void;
}

export function CustomExpressionPanel({ params, onChange }: Props) {
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    const fn = compileExpression(params.expr);
    setIsValid(fn !== null);
  }, [params.expr]);

  return (
    <div className={cn("p-4 rounded-xl border bg-slate-900/50 transition-all", !params.show && "opacity-60 grayscale")} style={{ borderColor: `${params.color}40`, boxShadow: `0 0 15px ${params.color}10` }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FunctionSquare className="w-4 h-4" style={{ color: params.color }} />
          <h3 className="font-semibold text-sm" style={{ color: params.color }}>自定义数学表达式</h3>
        </div>
        <button
          onClick={() => onChange({ show: !params.show })}
          className={cn("p-1.5 rounded-md transition-colors", params.show ? "bg-slate-700 text-white" : "text-slate-500 hover:bg-slate-800")}
          title={params.show ? "隐藏" : "显示"}
        >
          <Power className="w-4 h-4" />
        </button>
      </div>

      {params.show && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">y(t) = </label>
            <input
              type="text"
              value={params.expr}
              onChange={(e) => onChange({ expr: e.target.value })}
              placeholder="例如: sin(2*PI*t) + 0.5*cos(t)"
              className={cn(
                "w-full bg-slate-950 border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 font-mono",
                isValid ? "border-slate-700 focus:border-cyan-500 focus:ring-cyan-500" : "border-red-500/50 focus:border-red-500 focus:ring-red-500"
              )}
            />
            {!isValid && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 mt-1">
                <AlertCircle className="w-3 h-3" />
                <span>表达式无效，请检查语法 (如: sin, cos, PI, t)</span>
              </div>
            )}
          </div>
          <div className="text-[10px] text-slate-500 leading-relaxed">
            支持的变量和函数: <code className="text-slate-400">t</code> (时间), <code className="text-slate-400">PI</code>, <code className="text-slate-400">sin()</code>, <code className="text-slate-400">cos()</code>, <code className="text-slate-400">tan()</code>, <code className="text-slate-400">abs()</code>, <code className="text-slate-400">sqrt()</code>, <code className="text-slate-400">^</code> (指数) 等。
          </div>
        </div>
      )}
    </div>
  );
}
