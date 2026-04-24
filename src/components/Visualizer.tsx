import React, { useRef, useEffect, useState } from 'react';
import { WaveParams } from './WaveControls';
import { compileExpression } from '../lib/math';
import { ZoomIn, ZoomOut, Maximize, Hand, MousePointer2 } from 'lucide-react';

interface AppState {
  waves: WaveParams[];
  showResultant: boolean;
  timeScale: number;
  isPlaying: boolean;
}

export function Visualizer({ paramsRef }: { paramsRef: React.MutableRefObject<AppState> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const compiledFnsCache = useRef<Record<string, { expr: string, fn: ((x: number, t: number) => number) | null }>>({});
  
  // Interaction mode
  const [mode, setMode] = useState<'pan' | 'inspect'>('pan');
  const modeRef = useRef<'pan' | 'inspect'>('pan');
  const simulationTimeRef = useRef(0);
  const prevWavesLengthRef = useRef(paramsRef.current.waves.length);
  const inspectedPointRef = useRef<{ t: number, waveId: string, color: string } | null>(null);

  // Transform state for pan and zoom
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Initialize transform to center the origin
    if (canvasRef.current) {
      const rect = canvasRef.current.parentElement?.getBoundingClientRect();
      if (rect) {
        transformRef.current = {
          x: rect.width * 0.3, // Put origin at 30% of screen width
          y: rect.height / 2,  // Center vertically
          scale: 1
        };
      }
    }
  }, []);

  useEffect(() => {
    modeRef.current = mode;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = mode === 'pan' ? 'grab' : 'crosshair';
    }
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const params = paramsRef.current;
      
      if (prevWavesLengthRef.current === 0 && params.waves.length > 0) {
        simulationTimeRef.current = 0;
        // Also reset view transform so the user can see the new wave starting at t=0
        if (canvasRef.current) {
          const rect = canvasRef.current.parentElement?.getBoundingClientRect();
          if (rect) {
            transformRef.current = {
              x: rect.width * 0.3,
              y: rect.height / 2,
              scale: 1
            };
          }
        }
      }
      prevWavesLengthRef.current = params.waves.length;

      if (params.isPlaying) {
        simulationTimeRef.current += dt * params.timeScale;
      }

      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect && (canvas.width !== rect.width || canvas.height !== rect.height)) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }

      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      // Compile custom expressions if changed
      const compiledFns: Record<string, ((x: number, t: number) => number) | null> = {};
      params.waves.forEach(w => {
        if (w.type === 'custom' && w.expr) {
          let cacheEntry = compiledFnsCache.current[w.id];
          if (!cacheEntry || cacheEntry.expr !== w.expr) {
            cacheEntry = { expr: w.expr, fn: compileExpression(w.expr) };
            compiledFnsCache.current[w.id] = cacheEntry;
          }
          compiledFns[w.id] = cacheEntry.fn;
        }
      });

      draw(ctx, width, height, simulationTimeRef.current, params, compiledFns, transformRef.current, inspectedPointRef.current);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Event listeners for Pan and Zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSensitivity = 0.002;
      const delta = -e.deltaY * zoomSensitivity;
      const newScale = Math.max(0.1, Math.min(20, transformRef.current.scale * Math.exp(delta)));
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const scaleRatio = newScale / transformRef.current.scale;
      transformRef.current.x = mouseX - (mouseX - transformRef.current.x) * scaleRatio;
      transformRef.current.y = mouseY - (mouseY - transformRef.current.y) * scaleRatio;
      transformRef.current.scale = newScale;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (modeRef.current === 'pan') {
        isDragging.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        canvas.style.cursor = 'grabbing';
      } else {
        // Inspect mode
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const invScale = 1 / transformRef.current.scale;
        const localX = (mouseX - transformRef.current.x) * invScale;
        const localY = (mouseY - transformRef.current.y) * invScale;

        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);
        const R = Math.min(width * 0.15, height * 0.35);
        const pixelsPerSec = width * 0.2;
        const waveStartX = 0;

        if (localX >= 0) {
          const tEval = localX / pixelsPerSec;
          const clickedVal = -localY / R;

          let closestWaveId = '';
          let closestDist = Infinity;
          let closestColor = '';

          const params = paramsRef.current;
          const activeWaves = params.waves.filter(w => w.show);

          for (const w of activeWaves) {
            let val = 0;
            if (w.type === 'custom') {
              const fn = compiledFnsCache.current[w.id]?.fn;
              if (fn) val = fn(tEval);
            } else {
              const aEval = 2 * Math.PI * w.f * tEval + w.phi + (w.type === 'cos' ? Math.PI / 2 : 0);
              val = w.A * Math.sin(aEval);
            }
            const dist = Math.abs(val - clickedVal);
            if (dist < closestDist) {
              closestDist = dist;
              closestWaveId = w.id;
              closestColor = w.color;
            }
          }

          if (params.showResultant && activeWaves.length > 1) {
            let sumVal = 0;
            for (const w of activeWaves) {
              if (w.type === 'custom') {
                const fn = compiledFnsCache.current[w.id]?.fn;
                if (fn) sumVal += fn(tEval);
              } else {
                const aEval = 2 * Math.PI * w.f * tEval + w.phi + (w.type === 'cos' ? Math.PI / 2 : 0);
                sumVal += w.A * Math.sin(aEval);
              }
            }
            const dist = Math.abs(sumVal - clickedVal);
            if (dist < closestDist) {
              closestDist = dist;
              closestWaveId = 'sum';
              closestColor = '#eab308';
            }
          }

          if (closestDist < 0.3) {
            inspectedPointRef.current = { t: tEval, waveId: closestWaveId, color: closestColor };
          } else {
            inspectedPointRef.current = null;
          }
        } else {
          inspectedPointRef.current = null;
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || modeRef.current !== 'pan') return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      transformRef.current.x += dx;
      transformRef.current.y += dy;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      if (modeRef.current === 'pan') {
        canvas.style.cursor = 'grab';
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.style.cursor = 'grab';

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleZoomIn = () => {
    const newScale = Math.min(20, transformRef.current.scale * 1.5);
    zoomToCenter(newScale);
  };

  const handleZoomOut = () => {
    const newScale = Math.max(0.1, transformRef.current.scale / 1.5);
    zoomToCenter(newScale);
  };

  const handleReset = () => {
    if (canvasRef.current) {
      const rect = canvasRef.current.parentElement?.getBoundingClientRect();
      if (rect) {
        transformRef.current = {
          x: rect.width * 0.3,
          y: rect.height / 2,
          scale: 1
        };
      }
    }
  };

  const zoomToCenter = (newScale: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = rect.width / 2;
    const mouseY = rect.height / 2;
    const scaleRatio = newScale / transformRef.current.scale;
    transformRef.current.x = mouseX - (mouseX - transformRef.current.x) * scaleRatio;
    transformRef.current.y = mouseY - (mouseY - transformRef.current.y) * scaleRatio;
    transformRef.current.scale = newScale;
  };

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full touch-none" />
      <div className="absolute bottom-4 right-4 flex gap-2 z-20">
        <div className="flex bg-slate-800/80 rounded-lg backdrop-blur-sm border border-slate-700 shadow-lg p-1 mr-2">
          <button
            onClick={() => setMode('pan')}
            className={`p-2 rounded-md transition-colors ${mode === 'pan' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}
            title="平移/缩放模式"
          >
            <Hand className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMode('inspect')}
            className={`p-2 rounded-md transition-colors ${mode === 'inspect' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}
            title="坐标拾取模式"
          >
            <MousePointer2 className="w-4 h-4" />
          </button>
        </div>
        <button onClick={handleZoomIn} className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg backdrop-blur-sm border border-slate-700 transition-colors shadow-lg" title="放大">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={handleZoomOut} className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg backdrop-blur-sm border border-slate-700 transition-colors shadow-lg" title="缩小">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={handleReset} className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg backdrop-blur-sm border border-slate-700 transition-colors shadow-lg" title="重置视图">
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}

function draw(
  ctx: CanvasRenderingContext2D, 
  width: number, 
  height: number, 
  time: number, 
  params: AppState, 
  compiledFns: Record<string, ((x: number, t: number) => number) | null>,
  transform: { x: number, y: number, scale: number },
  inspectedPoint: { t: number, waveId: string, color: string } | null
) {
  ctx.clearRect(0, 0, width, height);

  ctx.save();
  ctx.translate(transform.x, transform.y);
  ctx.scale(transform.scale, transform.scale);

  const invScale = 1 / transform.scale;
  
  // Calculate visible bounds in local coordinates
  const viewMinX = -transform.x * invScale;
  const viewMaxX = (width - transform.x) * invScale;
  const viewMinY = -transform.y * invScale;
  const viewMaxY = (height - transform.y) * invScale;

  // Base sizes
  const R = Math.min(width * 0.15, height * 0.35);
  const pixelsPerSec = width * 0.2; // 1 second = 20% of width
  
  const waveStartX = 0;
  // Fix unit circle to 15% of screen width
  const screenCx = width * 0.15;
  const cx = (screenCx - transform.x) * invScale; 
  const cy = 0; // Unit circle center Y

  const cGrid = '#334155';
  const cAxis = '#64748b';
  const cSum = '#eab308';

  // --- Draw Grids ---
  ctx.lineWidth = 1 * invScale;
  ctx.strokeStyle = cGrid;
  ctx.beginPath();
  
  // Horizontal grids (shared)
  const minI = Math.floor(viewMinY / R);
  const maxI = Math.ceil(viewMaxY / R);
  for (let i = minI; i <= maxI; i++) {
    const y = i * R;
    ctx.moveTo(viewMinX, y); ctx.lineTo(viewMaxX, y);
  }

  // Vertical grids for Time
  const minT = Math.floor(viewMinX / pixelsPerSec);
  const maxT = Math.ceil(viewMaxX / pixelsPerSec);
  for (let t = minT; t <= maxT; t++) {
    const x = t * pixelsPerSec;
    ctx.moveTo(x, viewMinY); ctx.lineTo(x, viewMaxY);
  }
  ctx.stroke();

  // --- Main Axes ---
  ctx.lineWidth = 2 * invScale;
  ctx.strokeStyle = cAxis;
  ctx.beginPath();
  // X axis
  ctx.moveTo(viewMinX, 0); ctx.lineTo(viewMaxX, 0);
  // Y axis for Time (t=0)
  ctx.moveTo(0, viewMinY); ctx.lineTo(0, viewMaxY);
  // Y axis for Unit Circle
  ctx.moveTo(cx, viewMinY); ctx.lineTo(cx, viewMaxY);
  // X axis for Unit Circle (just a crosshair)
  ctx.moveTo(cx - R - 20 * invScale, 0); ctx.lineTo(cx + R + 20 * invScale, 0);
  ctx.stroke();

  // --- Labels ---
  ctx.fillStyle = '#94a3b8';
  ctx.font = `${10 * invScale}px Inter, sans-serif`;
  
  // Y-axis labels (Amplitude)
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = minI; i <= maxI; i++) {
    if (i === 0) continue;
    const y = i * R;
    ctx.fillText(`${-i}`, -8 * invScale, y);
  }

  // Time axis labels
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let t = minT; t <= maxT; t++) {
    const x = t * pixelsPerSec;
    ctx.fillText(`${t}s`, x, 8 * invScale);
  }

  // --- Draw Unit Circle Base ---
  ctx.lineWidth = 1 * invScale;
  ctx.strokeStyle = cAxis;
  ctx.beginPath();
  ctx.arc(cx, 0, R, 0, 2 * Math.PI);
  ctx.stroke();

  const activeWaves = params.waves.filter(w => w.show);
  const showSum = params.showResultant && activeWaves.length > 1;

  // --- Calculate Vectors ---
  let currentVx = cx;
  let currentVy = cy;
  const vectors: { startX: number, startY: number, endX: number, endY: number, color: string }[] = [];

  for (const w of activeWaves) {
    if (w.type === 'custom') continue; // Custom waves don't have a simple vector representation
    const a = 2 * Math.PI * w.f * time + w.phi + (w.type === 'cos' ? Math.PI / 2 : 0);
    const vx = currentVx + w.A * R * Math.cos(a);
    const vy = currentVy - w.A * R * Math.sin(a);
    vectors.push({ startX: currentVx, startY: currentVy, endX: vx, endY: vy, color: w.color });
    currentVx = vx;
    currentVy = vy;
  }

  // --- Draw Waveforms ---
  ctx.lineWidth = 2 * invScale;
  const drawEndX = time * pixelsPerSec;
  const step = Math.min(2, 2 * invScale); // dynamic step based on zoom, capped at 2px
  
  const drawWave = (waveParams: WaveParams | null, color: string, isSum: boolean = false) => {
    ctx.strokeStyle = color;
    ctx.beginPath();
    
    // Determine if this wave (or sum of waves) is static
    const isStatic = waveParams ? waveParams.isStatic : activeWaves.every(w => w.isStatic);

    // Only draw the visible portion of the wave
    let startX = viewMinX;
    let endX = viewMaxX;

    if (!isStatic) {
      startX = Math.max(0, viewMinX);
      endX = Math.min(drawEndX, viewMaxX);
    }
    
    if (startX > endX) return; // Wave is not in view

    let isDrawing = false;

    for (let x = startX; x <= endX; x += step) {
      const xEval = x / pixelsPerSec;
      const tGlobal = time;
      
      let yVal = 0;
      if (isSum) {
         for (const w of activeWaves) {
           if (w.type === 'custom') {
             const fn = compiledFns[w.id];
             if (fn) {
               const val = fn(xEval, tGlobal);
               if (!isNaN(val)) yVal += val;
             }
           } else {
             // Standard waves only contribute if x >= 0 or if they are marked static (though standard waves don't have the toggle, they are dynamic by default)
             if (xEval >= 0 || w.isStatic) {
               const aEval = 2 * Math.PI * w.f * xEval + w.phi + (w.type === 'cos' ? Math.PI / 2 : 0);
               yVal += w.A * Math.sin(aEval);
             }
           }
         }
      } else if (waveParams) {
         if (waveParams.type === 'custom') {
           const fn = compiledFns[waveParams.id];
           if (fn) yVal = fn(xEval, tGlobal);
         } else {
           const aEval = 2 * Math.PI * waveParams.f * xEval + waveParams.phi + (waveParams.type === 'cos' ? Math.PI / 2 : 0);
           yVal = waveParams.A * Math.sin(aEval);
         }
      }
      
      if (isNaN(yVal) || !isFinite(yVal)) {
        isDrawing = false;
      } else {
        const y = cy - yVal * R;
        if (!isDrawing) {
          ctx.moveTo(x, y);
          isDrawing = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();
  };

  for (const w of activeWaves) {
    drawWave(w, w.color);
  }
  
  if (showSum) {
    drawWave(null, cSum, true);
  }

  // --- Draw Vectors and Connecting Lines ---
  const drawVector = (startX: number, startY: number, endX: number, endY: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2 * invScale;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    const angle = Math.atan2(endY - startY, endX - startX);
    const arrowSize = 8 * invScale;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - arrowSize * Math.cos(angle - Math.PI / 6), endY - arrowSize * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(endX - arrowSize * Math.cos(angle + Math.PI / 6), endY - arrowSize * Math.sin(angle + Math.PI / 6));
    ctx.fill();
  };

  const drawConnectingLine = (y: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1 * invScale;
    ctx.setLineDash([4 * invScale, 4 * invScale]);
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(drawEndX, y);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(drawEndX, y, 4 * invScale, 0, 2 * Math.PI);
    ctx.fill();
  };

  if (showSum) {
    for (const v of vectors) {
      drawVector(v.startX, v.startY, v.endX, v.endY, v.color);
    }
    if (vectors.length > 0) {
      const lastV = vectors[vectors.length - 1];
      drawVector(cx, cy, lastV.endX, lastV.endY, cSum);
      drawConnectingLine(lastV.endY, cSum);
    }
    for (const w of activeWaves) {
      if (w.type === 'custom') {
        const fn = compiledFns[w.id];
        if (!fn) continue;
        const yVal = fn(time);
        const y = cy - yVal * R;
        drawConnectingLine(y, w.color);
      }
    }
  } else {
    for (const w of activeWaves) {
      if (w.type === 'custom') {
        const fn = compiledFns[w.id];
        if (!fn) continue;
        const yVal = fn(time);
        const y = cy - yVal * R;
        drawConnectingLine(y, w.color);
      } else {
        const a = 2 * Math.PI * w.f * time + w.phi + (w.type === 'cos' ? Math.PI / 2 : 0);
        const vx = cx + w.A * R * Math.cos(a);
        const vy = cy - w.A * R * Math.sin(a);
        drawVector(cx, cy, vx, vy, w.color);
        drawConnectingLine(vy, w.color);
      }
    }
  }

  // --- Draw Inspected Point ---
  if (inspectedPoint) {
    const x = inspectedPoint.t * pixelsPerSec;

    let yVal = 0;
    if (inspectedPoint.waveId === 'sum') {
      for (const w of activeWaves) {
        if (w.type === 'custom') {
          const fn = compiledFns[w.id];
          if (fn) yVal += fn(inspectedPoint.t);
        } else {
          const aEval = 2 * Math.PI * w.f * inspectedPoint.t + w.phi + (w.type === 'cos' ? Math.PI / 2 : 0);
          yVal += w.A * Math.sin(aEval);
        }
      }
    } else {
      const w = activeWaves.find(w => w.id === inspectedPoint.waveId);
      if (w) {
        if (w.type === 'custom') {
          const fn = compiledFns[w.id];
          if (fn) yVal = fn(inspectedPoint.t);
        } else {
          const aEval = 2 * Math.PI * w.f * inspectedPoint.t + w.phi + (w.type === 'cos' ? Math.PI / 2 : 0);
          yVal += w.A * Math.sin(aEval);
        }
      }
    }

    const y = cy - yVal * R;

    // Draw point
    ctx.fillStyle = inspectedPoint.color;
    ctx.beginPath();
    ctx.arc(x, y, 6 * invScale, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2 * invScale;
    ctx.stroke();

    // Draw tooltip
    const text = `t: ${inspectedPoint.t.toFixed(2)}s, y: ${yVal.toFixed(2)}`;
    ctx.font = `bold ${12 * invScale}px Inter, sans-serif`;
    const textWidth = ctx.measureText(text).width;
    const padding = 6 * invScale;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'; // slate-900
    ctx.beginPath();
    ctx.roundRect(x - textWidth/2 - padding, y - 30 * invScale - padding, textWidth + padding * 2, 20 * invScale + padding * 2, 4 * invScale);
    ctx.fill();
    ctx.strokeStyle = inspectedPoint.color;
    ctx.lineWidth = 1 * invScale;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc'; // slate-50
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y - 20 * invScale);
  }

  ctx.restore();
}
