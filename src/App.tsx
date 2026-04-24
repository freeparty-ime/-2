import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Settings2, Info, Layers, Plus, BookOpen, RefreshCw, Activity, FunctionSquare } from 'lucide-react';
import { WaveControls } from './components/WaveControls';
import { Visualizer } from './components/Visualizer';
import { ResultantPanel } from './components/ResultantPanel';
import { cn } from './lib/utils';

const WAVE_COLORS = [
  '#06b6d4', // cyan-500
  '#ec4899', // pink-500
  '#8b5cf6', // violet-500
  '#10b981', // emerald-500
  '#f97316', // orange-500
  '#3b82f6', // blue-500
];

const DEFAULT_WAVES = [
  { id: '1', A: 1, f: 0.5, phi: 0, type: 'sin' as const, show: true, color: WAVE_COLORS[0] },
  { id: '2', A: 0.5, f: 1, phi: 0, type: 'sin' as const, show: false, color: WAVE_COLORS[1] },
];

const DEFAULT_PARAMS = {
  waves: DEFAULT_WAVES,
  showResultant: true,
  timeScale: 1,
  isPlaying: true,
};

export default function App() {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const paramsRef = useRef(params);
  const nextId = useRef(3);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  const updateWave = (id: string, updates: Partial<typeof DEFAULT_WAVES[0]>) => {
    setParams(p => ({
      ...p,
      waves: p.waves.map(w => w.id === id ? { ...w, ...updates } : w)
    }));
  };

  const addWave = (type: 'sin' | 'custom' = 'sin') => {
    if (params.waves.length >= WAVE_COLORS.length) return;
    const newWave = {
      id: nextId.current.toString(),
      A: 0.5,
      f: 1,
      phi: 0,
      type,
      expr: type === 'custom' ? 'sin(x - t*2)' : undefined,
      isStatic: false,
      show: true,
      color: WAVE_COLORS[params.waves.length % WAVE_COLORS.length],
    };
    nextId.current += 1;
    setParams(p => ({ ...p, waves: [...p.waves, newWave] }));
  };

  const removeWave = (id: string) => {
    setParams(p => ({ ...p, waves: p.waves.filter(w => w.id !== id) }));
  };

  const applyPreset = (type: 'constructive' | 'destructive' | 'beat' | 'fourier' | 'math') => {
    let newWaves: typeof DEFAULT_WAVES = [];
    if (type === 'constructive') {
      newWaves = [
        { id: '1', A: 1, f: 1, phi: 0, type: 'sin', show: true, color: WAVE_COLORS[0] },
        { id: '2', A: 1, f: 1, phi: 0, type: 'sin', show: true, color: WAVE_COLORS[1] },
      ];
    } else if (type === 'destructive') {
      newWaves = [
        { id: '1', A: 1, f: 1, phi: 0, type: 'sin', show: true, color: WAVE_COLORS[0] },
        { id: '2', A: 1, f: 1, phi: Math.PI, type: 'sin', show: true, color: WAVE_COLORS[1] },
      ];
    } else if (type === 'beat') {
      newWaves = [
        { id: '1', A: 1, f: 1.0, phi: 0, type: 'sin', show: true, color: WAVE_COLORS[0] },
        { id: '2', A: 1, f: 1.1, phi: 0, type: 'sin', show: true, color: WAVE_COLORS[1] },
      ];
    } else if (type === 'fourier') {
      newWaves = Array.from({ length: 6 }).map((_, i) => {
        const n = i * 2 + 1; // 1, 3, 5, 7, 9, 11
        return {
          id: (i + 1).toString(),
          A: 1.2 / n,
          f: 0.5 * n,
          phi: 0,
          type: 'sin',
          show: true,
          color: WAVE_COLORS[i % WAVE_COLORS.length]
        };
      });
    } else if (type === 'math') {
      newWaves = [
        { id: '1', A: 1, f: 1, phi: 0, type: 'custom', expr: 'asin(x)', isStatic: true, show: true, color: WAVE_COLORS[0] },
        { id: '2', A: 1, f: 1, phi: 0, type: 'custom', expr: 'x^2 / 5', isStatic: true, show: true, color: WAVE_COLORS[1] },
        { id: '3', A: 1, f: 1, phi: 0, type: 'custom', expr: 'sin(x)/x', isStatic: true, show: true, color: WAVE_COLORS[2] },
      ];
    }
    setParams(p => ({ ...p, waves: newWaves, showResultant: type !== 'math' }));
    nextId.current = newWaves.length + 1;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col font-sans selection:bg-cyan-500/30">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center border border-cyan-500/30">
            <Activity className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Trig & Wave Factory</h1>
            <p className="text-xs text-slate-400 font-medium">Interactive Trigonometry & Wave Visualization</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-hidden max-w-[1600px] mx-auto w-full">
        {/* Visualization Area */}
        <div className="flex-1 min-h-[500px] bg-slate-900 rounded-2xl border border-slate-800 relative overflow-hidden shadow-2xl flex flex-col">
          <div className="absolute top-4 left-4 flex flex-wrap gap-3 z-10 max-w-[80%] pointer-events-none">
            {params.waves.filter(w => w.show).map((w, i) => (
              <div key={w.id} className="flex items-center gap-2 text-xs font-medium bg-slate-950/80 px-3 py-1.5 rounded-full border border-slate-800 backdrop-blur-md">
                <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: w.color, boxShadow: `0 0 8px ${w.color}cc` }}></div>
                <span className="text-slate-300">{w.type === 'custom' ? '自定义波' : `波 ${i + 1}`}</span>
              </div>
            ))}
            {params.waves.filter(w => w.show).length > 1 && params.showResultant && (
              <div className="flex items-center gap-2 text-xs font-medium bg-slate-950/80 px-3 py-1.5 rounded-full border border-slate-800 backdrop-blur-md">
                <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]"></div>
                <span className="text-slate-300">合成波 (叠加)</span>
              </div>
            )}
          </div>
          <Visualizer paramsRef={paramsRef} />
        </div>

        {/* Controls Sidebar */}
        <div className="w-full lg:w-[380px] flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar shrink-0">
          
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-slate-400" />
                全局设置
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setParams(p => ({ ...p, isPlaying: !p.isPlaying }))}
                  className="p-2 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 rounded-lg transition-colors border border-cyan-500/30"
                  title={params.isPlaying ? '暂停' : '播放'}
                >
                  {params.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setParams(p => ({ ...p, waves: [] }))}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
                  title="清空所有波形"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-4 mt-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-400">
                  <label>时间流速</label>
                  <span>{params.timeScale.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={3}
                  step={0.1}
                  value={params.timeScale}
                  onChange={(e) => setParams(p => ({ ...p, timeScale: parseFloat(e.target.value) }))}
                  className="w-full accent-slate-400 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="pt-3 border-t border-slate-800">
                <div className="flex items-center gap-2 mb-3 text-sm font-medium text-slate-300">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  教学场景一键预设
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => applyPreset('constructive')} className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 text-xs text-slate-300 transition-colors border border-slate-700/50">
                    <RefreshCw className="w-3 h-3 text-blue-400" /> 同频同相 (相长)
                  </button>
                  <button onClick={() => applyPreset('destructive')} className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 text-xs text-slate-300 transition-colors border border-slate-700/50">
                    <RefreshCw className="w-3 h-3 text-red-400" /> 同频反相 (相消)
                  </button>
                  <button onClick={() => applyPreset('beat')} className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 text-xs text-slate-300 transition-colors border border-slate-700/50">
                    <RefreshCw className="w-3 h-3 text-green-400" /> 频率相近 (拍频)
                  </button>
                  <button onClick={() => applyPreset('fourier')} className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-xs text-indigo-300 transition-colors border border-indigo-500/30">
                    <Activity className="w-3 h-3" /> 方波合成 (傅里叶)
                  </button>
                  <button onClick={() => applyPreset('math')} className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-xs text-emerald-300 transition-colors border border-emerald-500/30 col-span-2">
                    <FunctionSquare className="w-3 h-3" /> 静态数学函数图库 (倒三角/抛物线)
                  </button>
                  <button onClick={() => applyPreset('math')} className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-xs text-emerald-300 transition-colors border border-emerald-500/30 col-span-2">
                    <FunctionSquare className="w-3 h-3" /> 静态数学函数图库 (倒三角/抛物线)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {params.waves.filter(w => w.show).length > 1 && (
            <ResultantPanel 
              waves={params.waves} 
              show={params.showResultant} 
              onChangeShow={(show) => setParams(p => ({ ...p, showResultant: show }))} 
            />
          )}

          {params.waves.map((wave, index) => (
            <WaveControls 
              key={wave.id}
              title={wave.type === 'custom' ? `自定义波 ${index + 1}` : `波 ${index + 1}`} 
              params={wave} 
              onChange={(updates) => updateWave(wave.id, updates)}
              onRemove={params.waves.length > 1 ? () => removeWave(wave.id) : undefined}
            />
          ))}

          {params.waves.length < WAVE_COLORS.length && (
            <div className="flex gap-2">
              <button
                onClick={() => addWave('sin')}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-800/50 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">添加波</span>
              </button>
              <button
                onClick={() => addWave('custom')}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-purple-700/50 text-purple-400 hover:text-purple-300 hover:border-purple-500 hover:bg-purple-900/20 transition-all"
              >
                <FunctionSquare className="w-4 h-4" />
                <span className="text-sm font-medium">添加自定义波</span>
              </button>
            </div>
          )}

          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 text-xs text-slate-400 space-y-3">
            <p className="flex gap-2"><Info className="w-4 h-4 shrink-0 text-slate-500" /> <span><strong>振幅 (A):</strong> 波的高度。对应单位圆上的旋转半径。</span></p>
            <p className="flex gap-2"><Info className="w-4 h-4 shrink-0 text-slate-500" /> <span><strong>频率 (f):</strong> 每秒循环次数。对应单位圆上的旋转速度。</span></p>
            <p className="flex gap-2"><Info className="w-4 h-4 shrink-0 text-slate-500" /> <span><strong>相位 (φ):</strong> 初始角度。使波形左右平移。</span></p>
            <p className="flex gap-2"><Layers className="w-4 h-4 shrink-0 text-slate-500" /> <span><strong>波的叠加:</strong> 当多个波同时存在时，它们的振幅会相加（干涉现象）。</span></p>
          </div>

        </div>
      </main>
    </div>
  );
}
