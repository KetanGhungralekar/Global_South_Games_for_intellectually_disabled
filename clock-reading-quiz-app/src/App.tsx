import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, RefreshCw, Trophy, Star, Volume2, VolumeX, BookOpen, MousePointer2 } from 'lucide-react';
import confetti from 'canvas-confetti';

// --- Types ---
type Difficulty = 'easy' | 'medium' | 'hard';
type GameMode = 'set-hands' | 'read-clock';

interface Time {
  hours: number;
  minutes: number;
}

// --- Utils ---
const getAngle = (x: number, y: number, cx: number, cy: number) => {
  const dx = x - cx;
  const dy = y - cy;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  angle = (angle + 90 + 360) % 360; // Normalize so 0 is at 12 o'clock
  return angle;
};

const playSound = (freq: number, duration: number, type: OscillatorType = 'sine') => {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duration);
};

const playSuccessSound = () => {
  playSound(523.25, 0.5, 'triangle'); // C5
  setTimeout(() => playSound(659.25, 0.5, 'triangle'), 100); // E5
  setTimeout(() => playSound(783.99, 0.5, 'triangle'), 200); // G5
};

const playErrorSound = () => {
  playSound(220, 0.3, 'sawtooth'); // A3
};

// --- Components ---

const ClockHand = ({ 
  angle, 
  onDrag, 
  color, 
  length, 
  width,
  isGhost = false,
  interactive = true
}: { 
  angle: number;
  onDrag?: (angle: number, isFinal?: boolean) => void;
  color: string;
  length: number;
  width: number;
  isGhost?: boolean;
  interactive?: boolean;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const gRef = useRef<SVGGElement | null>(null);

  const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !interactive || isGhost || !onDrag) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    const svg = gRef.current?.ownerSVGElement;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const newAngle = getAngle(clientX, clientY, cx, cy);
    onDrag(newAngle);
  }, [isDragging, isGhost, onDrag, interactive]);

  const handleUp = useCallback(() => {
    if (isDragging && onDrag) {
      // Trigger one last drag with isFinal=true to snap the hand
      onDrag(angle, true);
    }
    setIsDragging(false);
  }, [isDragging, onDrag, angle]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMove, { passive: false });
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging, handleMove, handleUp]);

  const handEndX = 100 + Math.sin(angle * (Math.PI / 180)) * length;
  const handEndY = 100 - Math.cos(angle * (Math.PI / 180)) * length;

  return (
    <g 
      ref={gRef}
      style={{ 
        cursor: (!interactive || isGhost) ? 'default' : (isDragging ? 'grabbing' : 'grab'),
        touchAction: 'none' 
      }}
      onMouseDown={(e) => { 
        if (!interactive || isGhost) return;
        e.preventDefault(); 
        setIsDragging(true); 
      }}
      onTouchStart={(e) => { 
        if (!interactive || isGhost) return;
        e.preventDefault(); 
        setIsDragging(true); 
      }}
    >
      {/* Invisible larger hit area for easier dragging */}
      <line
        x1="100" y1="100"
        x2={handEndX}
        y2={handEndY}
        stroke="rgba(0,0,0,0)" // Fully transparent but still interactive
        strokeWidth="30"
        strokeLinecap="round"
        style={{ pointerEvents: 'all' }}
      />
      
      {/* Visual Hand */}
      <line
        x1="100" y1="100"
        x2={handEndX}
        y2={handEndY}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        opacity={isGhost ? 0.2 : 1}
      />
      
      {/* Knob at the end of hand for tactile feel */}
      {!isGhost && interactive && (
        <circle
          cx={handEndX}
          cy={handEndY}
          r={width * 1.8}
          fill={color}
          className="shadow-lg filter drop-shadow-md"
        />
      )}
    </g>
  );
};

export default function App() {
  const [level, setLevel] = useState<Difficulty>('easy');
  const [gameMode, setGameMode] = useState<GameMode>('set-hands');
  const [targetTime, setTargetTime] = useState<Time>({ hours: 3, minutes: 0 });
  const [userHours, setUserHours] = useState(12);
  const [userMinutes, setUserMinutes] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [score, setScore] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  const formatTime = (h: number, m: number) => {
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  // Generate a new target time and options for "read-clock" mode
  const generateTime = useCallback((difficulty: Difficulty, mode: GameMode) => {
    let h = Math.floor(Math.random() * 12) + 1;
    let m = 0;

    if (difficulty === 'medium') {
      m = Math.random() > 0.5 ? 0 : 30;
    } else if (difficulty === 'hard') {
      m = Math.floor(Math.random() * 12) * 5;
    }

    setTargetTime({ hours: h, minutes: m });
    setUserHours(12);
    setUserMinutes(0);
    setShowHelp(false);
    setShowSuccess(false);

    if (mode === 'read-clock') {
      const correct = formatTime(h, m);
      const opts = new Set<string>();
      opts.add(correct);
      
      while (opts.size < 4) {
        const rh = Math.floor(Math.random() * 12) + 1;
        let rm = 0;
        if (difficulty === 'medium') rm = Math.random() > 0.5 ? 0 : 30;
        else if (difficulty === 'hard') rm = Math.floor(Math.random() * 12) * 5;
        opts.add(formatTime(rh, rm));
      }
      setOptions(Array.from(opts).sort(() => Math.random() - 0.5));
    }
  }, []);

  useEffect(() => {
    generateTime(level, gameMode);
  }, [level, gameMode, generateTime]);

  const handleCorrect = () => {
    if (isSoundEnabled) playSuccessSound();
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 }
    });
    setShowSuccess(true);
    setScore(s => s + 10);
    setTimeout(() => {
      generateTime(level, gameMode);
    }, 2500);
  };

  const handleWrong = () => {
    if (isSoundEnabled) playErrorSound();
    const clockElement = document.getElementById('clock-face');
    clockElement?.classList.add('animate-shake');
    setTimeout(() => clockElement?.classList.remove('animate-shake'), 500);
  };

  const checkSetAnswer = () => {
    const targetH = targetTime.hours % 12 || 12;
    const userH = userHours % 12 || 12;

    if (targetH === userH && targetTime.minutes === userMinutes) {
      handleCorrect();
    } else {
      handleWrong();
    }
  };

  const checkReadAnswer = (selected: string) => {
    if (selected === formatTime(targetTime.hours, targetTime.minutes)) {
      handleCorrect();
    } else {
      handleWrong();
    }
  };

  const handleHourDrag = useCallback((angle: number, isFinal = false) => {
    if (isFinal) {
      // Snap to the nearest hour proportionally
      let h = Math.round(angle / 30 - userMinutes / 60);
      if (h <= 0) h += 12;
      if (h > 12) h -= 12;
      setUserHours(h);
    } else {
      // Smooth movement: hand follows mouse exactly
      setUserHours((angle / 30) - (userMinutes / 60));
    }
  }, [userMinutes]);

  const handleMinuteDrag = useCallback((angle: number, isFinal = false) => {
    let m = Math.round(angle / 6) % 60;
    
    if (isFinal) {
      // Snapping logic on release
      if (level === 'easy') {
        // Option A: Let them get it wrong. Option B: Snap to nearest 60/0 if that's the intention.
        // Let's allow any position but maybe snap if they are close.
        // Actually, for Easy mode, target is always 0. Let's just snap to 5 min for all modes on release.
        m = Math.round(m / 5) * 5 % 60;
      } else if (level === 'medium') {
        m = m < 15 || m > 45 ? 0 : 30;
      } else {
        m = Math.round(m / 5) * 5 % 60;
      }
    }

    setUserMinutes(m);
  }, [level]);

  const speakTime = () => {
    const timeStr = `${targetTime.hours} ${targetTime.minutes === 0 ? "o'clock" : targetTime.minutes}`;
    const utterance = new SpeechSynthesisUtterance(timeStr);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-sky-50 font-sans text-slate-800 p-4 md:p-8 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-3xl flex justify-between items-center mb-8 bg-white/50 p-4 rounded-3xl backdrop-blur-sm shadow-sm border border-white">
        <div>
          <h1 className="text-3xl font-black text-sky-600 flex items-center gap-2">
            <RefreshCw className="w-8 h-8" /> Clock Fun
          </h1>
          <p className="text-slate-500 font-bold">Time for learning!</p>
        </div>
        
        <div className="flex gap-3 items-center">
           <button 
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className="p-3 rounded-2xl bg-white shadow-sm hover:bg-sky-100 transition-colors border border-sky-100"
          >
            {isSoundEnabled ? <Volume2 className="text-sky-600" /> : <VolumeX className="text-slate-400" />}
          </button>
          <div className="bg-yellow-100 px-5 py-2 rounded-2xl flex items-center gap-2 border-2 border-yellow-200 shadow-inner">
            <Trophy className="text-yellow-600 w-6 h-6" />
            <span className="font-black text-yellow-700 text-2xl">{score}</span>
          </div>
        </div>
      </header>

      {/* Mode Switcher */}
      <div className="flex bg-white p-2 rounded-3xl shadow-lg border-2 border-sky-100 mb-8 w-full max-w-md">
        <button
          onClick={() => setGameMode('set-hands')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all ${
            gameMode === 'set-hands' ? 'bg-sky-600 text-white shadow-md' : 'text-sky-600 hover:bg-sky-50'
          }`}
        >
          <MousePointer2 className="w-5 h-5" /> Move Hands
        </button>
        <button
          onClick={() => setGameMode('read-clock')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all ${
            gameMode === 'read-clock' ? 'bg-sky-600 text-white shadow-md' : 'text-sky-600 hover:bg-sky-50'
          }`}
        >
          <BookOpen className="w-5 h-5" /> Read Time
        </button>
      </div>

      {/* Main Game Area */}
      <main className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-start">
        
        {/* Left Side: Instructions & Interaction */}
        <div className="flex flex-col gap-6 order-2 md:order-1">
          <div className="bg-white p-8 rounded-[2rem] shadow-xl border-4 border-sky-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-full -mr-16 -mt-16 opacity-50" />
            
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-lg font-bold text-slate-400 uppercase tracking-widest relative">
                {gameMode === 'set-hands' ? 'Your Target:' : 'Pick the time:'}
              </h2>
              <button
                onClick={speakTime}
                className="p-2 bg-sky-100 text-sky-600 rounded-xl hover:bg-sky-200 transition-colors"
                title="Speak the time"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            {gameMode === 'set-hands' ? (
              <>
                <div className="text-7xl font-black text-sky-600 mb-4 tracking-tighter relative">
                  {formatTime(targetTime.hours, targetTime.minutes)}
                </div>
                <p className="text-slate-500 font-medium mb-8">
                  Move the hands to match the time above.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 bg-blue-50 p-3 rounded-2xl border border-blue-100">
                    <div className="w-4 h-10 rounded-full bg-blue-500" />
                    <span className="font-bold text-blue-700">Short Hand = Hour (Blue)</span>
                  </div>
                  <div className="flex items-center gap-4 bg-red-50 p-3 rounded-2xl border border-red-100">
                    <div className="w-4 h-14 rounded-full bg-red-500" />
                    <span className="font-bold text-red-700">Long Hand = Minute (Red)</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4 mt-4">
                {options.map((opt, idx) => (
                  <button
                    key={idx}
                    disabled={showSuccess}
                    onClick={() => checkReadAnswer(opt)}
                    className="py-6 rounded-2xl text-3xl font-black bg-sky-50 text-sky-700 border-2 border-sky-200 hover:bg-sky-100 hover:border-sky-300 transition-all active:scale-95 shadow-sm"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white/60 p-4 rounded-3xl border-2 border-white flex flex-col gap-4">
            <p className="text-center font-bold text-slate-500 text-sm uppercase">Choose Level:</p>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setLevel(d)}
                  className={`flex-1 py-4 px-4 rounded-2xl font-black capitalize transition-all border-b-4 ${
                    level === d 
                    ? 'bg-sky-600 text-white border-sky-800 translate-y-1' 
                    : 'bg-white text-sky-600 border-sky-100 hover:bg-sky-50 active:translate-y-1'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {gameMode === 'set-hands' && (
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center justify-center gap-2 w-full py-5 bg-amber-400 text-amber-900 rounded-3xl font-black text-xl border-b-4 border-amber-600 hover:bg-amber-300 transition-all active:translate-y-1"
            >
              <HelpCircle className="w-6 h-6" /> {showHelp ? 'Hide Ghost Clock' : 'Show Ghost Clock'}
            </button>
          )}
        </div>

        {/* Right Side: Clock */}
        <div className="flex flex-col items-center gap-8 order-1 md:order-2 sticky top-8">
          <div 
            id="clock-face"
            className="relative w-72 h-72 md:w-[400px] md:h-[400px] bg-white rounded-full border-[16px] border-slate-800 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] flex items-center justify-center overflow-visible"
          >
            <svg 
              viewBox="0 0 200 200" 
              className="w-full h-full select-none touch-none overflow-visible"
              style={{ touchAction: 'none' }}
            >
              <circle cx="100" cy="100" r="95" fill="white" />
              
              {/* Numbers */}
              {[...Array(12)].map((_, i) => {
                const angle = (i + 1) * 30;
                const rad = (angle - 90) * (Math.PI / 180);
                const x = 100 + 72 * Math.cos(rad);
                const y = 100 + 72 * Math.sin(rad);
                return (
                  <text
                    key={i}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[18px] font-black fill-slate-800 select-none pointer-events-none"
                  >
                    {i + 1}
                  </text>
                );
              })}

              {/* Ticks */}
              {[...Array(60)].map((_, i) => {
                const angle = i * 6;
                const isHour = i % 5 === 0;
                const rad = (angle - 90) * (Math.PI / 180);
                const offset = isHour ? 12 : 8;
                const x1 = 100 + (92 - offset) * Math.cos(rad);
                const y1 = 100 + (92 - offset) * Math.sin(rad);
                const x2 = 100 + 92 * Math.cos(rad);
                const y2 = 100 + 92 * Math.sin(rad);
                return (
                  <line
                    key={i}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={isHour ? '#1e293b' : '#94a3b8'}
                    strokeWidth={isHour ? 3 : 1}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Ghost Hands (Help) */}
              {showHelp && gameMode === 'set-hands' && (
                <>
                  <ClockHand
                    angle={targetTime.hours * 30 + (targetTime.minutes / 60) * 30}
                    color="#3b82f6"
                    length={45}
                    width={8}
                    isGhost
                  />
                  <ClockHand
                    angle={targetTime.minutes * 6}
                    color="#ef4444"
                    length={70}
                    width={6}
                    isGhost
                  />
                </>
              )}

              {/* Actual Hands */}
              {gameMode === 'set-hands' ? (
                <>
                  <ClockHand
                    angle={userHours * 30 + (userMinutes / 60) * 30}
                    color="#3b82f6"
                    length={50}
                    width={10}
                    onDrag={handleHourDrag}
                    interactive={!showSuccess}
                  />
                  <ClockHand
                    angle={userMinutes * 6}
                    color="#ef4444"
                    length={80}
                    width={7}
                    onDrag={handleMinuteDrag}
                    interactive={!showSuccess}
                  />
                </>
              ) : (
                <>
                  <ClockHand
                    angle={targetTime.hours * 30 + (targetTime.minutes / 60) * 30}
                    color="#3b82f6"
                    length={50}
                    width={10}
                    interactive={false}
                  />
                  <ClockHand
                    angle={targetTime.minutes * 6}
                    color="#ef4444"
                    length={80}
                    width={7}
                    interactive={false}
                  />
                </>
              )}

              {/* Center Dot */}
              <circle cx="100" cy="100" r="7" fill="#0f172a" />
              <circle cx="100" cy="100" r="3" fill="#64748b" />
            </svg>

            <AnimatePresence>
              {showSuccess && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 rounded-full z-20"
                >
                  <motion.div
                    animate={{ 
                      y: [0, -20, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                  >
                    <Star className="w-32 h-32 text-yellow-500 fill-yellow-400 mb-2 drop-shadow-xl" />
                  </motion.div>
                  <p className="text-4xl font-black text-sky-600 mb-1">YOU DID IT!</p>
                  <p className="text-slate-500 font-bold text-xl">+10 Points</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {gameMode === 'set-hands' && (
            <button
              disabled={showSuccess}
              onClick={checkSetAnswer}
              className={`w-full py-6 rounded-[2.5rem] font-black text-3xl shadow-[0_10px_0_0_rgba(0,0,0,0.1)] transition-all active:translate-y-1 active:shadow-none flex items-center justify-center gap-4 ${
                showSuccess 
                ? 'bg-green-500 text-white cursor-not-allowed border-b-8 border-green-700' 
                : 'bg-emerald-500 text-white hover:bg-emerald-400 border-b-8 border-emerald-700'
              }`}
            >
              {showSuccess ? (
                <>AMAZING! <Star className="w-8 h-8 fill-white" /></>
              ) : (
                'CHECK ANSWER!'
              )}
            </button>
          )}
        </div>
      </main>

      {/* Footer / Instructions */}
      <footer className="mt-12 text-slate-400 text-center max-w-lg">
        <p className="mb-2">Drag the hands with your finger or mouse.</p>
        <div className="flex justify-center gap-4">
          <span className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400" /> Easy: Whole Hours</span>
          <span className="flex items-center gap-1"><Star className="w-4 h-4 text-orange-400" /> Medium: 30 Mins</span>
          <span className="flex items-center gap-1"><Star className="w-4 h-4 text-red-400" /> Hard: 5 Mins</span>
        </div>
      </footer>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
}
