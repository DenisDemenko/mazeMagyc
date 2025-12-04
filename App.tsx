
import React, { useState, useEffect, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { Fireworks } from './components/Fireworks';
import { AuthModal } from './components/AuthModal';
import { LandingPage } from './components/LandingPage';
import { LogoCube } from './components/LogoCube';
import { audioManager } from './utils/audioManager';
import { MazeData } from './types';

export type MazeSize = 'small' | 'medium' | 'large' | 'xl' | 'hardcore';

// --- ART COMPONENT ---
const StartScreenArt = () => (
  <div className="absolute inset-0 flex items-center justify-center opacity-60 pointer-events-none overflow-hidden">
    <svg viewBox="0 0 800 600" className="w-full h-full max-w-4xl" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="isoGrid" width="40" height="24" patternUnits="userSpaceOnUse">
           <path d="M0 12 L20 0 L40 12 L20 24 Z" fill="none" stroke="#ffffff" strokeWidth="0.5" opacity="0.3"/>
        </pattern>
        <linearGradient id="darkness" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#1c1917" stopOpacity="1" />
            <stop offset="100%" stopColor="#1c1917" stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Isometric Floor */}
      <rect x="-50%" y="0" width="200%" height="100%" fill="url(#isoGrid)" transform="scale(1.5) rotate(0)" />
      
      {/* The Maze Walls (Abstract) */}
      <g transform="translate(400, 300) scale(1.2)" stroke="white" strokeWidth="2" fill="none">
         <path d="M-200 100 L0 200 L200 100 L200 -100 L0 0 L-200 -100 Z" fill="#000" opacity="0.8" />
         <path d="M-200 100 L-200 -100 L0 0" />
         <path d="M200 100 L200 -100 L0 0" />
         <path d="M0 200 L0 0" />
      </g>

      {/* The Archway */}
      <g transform="translate(400, 280)" fill="none" stroke="white" strokeWidth="3">
         {/* Pillars */}
         <path d="M-120 180 L-120 -50" strokeWidth="8" />
         <path d="M120 180 L120 -50" strokeWidth="8" />
         {/* Arch */}
         <path id="archCurve" d="M-140 -40 Q0 -150 140 -40" strokeWidth="4" />
         {/* Decorative stones */}
         <path d="M-130 -40 L-110 -40" strokeWidth="2" />
         <path d="M130 -40 L110 -40" strokeWidth="2" />
      </g>

      {/* Characters */}
      <g transform="translate(400, 400)">
         {/* Boy */}
         <g transform="translate(-40, 0)">
             <circle cx="0" cy="-35" r="10" fill="white" />
             <line x1="0" y1="-25" x2="0" y2="10" stroke="white" strokeWidth="4" />
             <line x1="0" y1="10" x2="-10" y2="40" stroke="white" strokeWidth="4" />
             <line x1="0" y1="10" x2="10" y2="40" stroke="white" strokeWidth="4" />
             <line x1="0" y1="-15" x2="-15" y2="5" stroke="white" strokeWidth="3" />
             <line x1="0" y1="-15" x2="15" y2="5" stroke="white" strokeWidth="3" />
         </g>

         {/* Girl */}
         <g transform="translate(40, 0)">
             <circle cx="0" cy="-30" r="9" fill="white" />
             {/* Dress */}
             <path d="M0 -20 L-15 30 L15 30 Z" fill="white" />
             <line x1="0" y1="30" x2="-5" y2="45" stroke="white" strokeWidth="3" />
             <line x1="0" y1="30" x2="5" y2="45" stroke="white" strokeWidth="3" />
             {/* Arm holding thread */}
             <line x1="0" y1="-15" x2="-20" y2="-5" stroke="white" strokeWidth="2" />
             <circle cx="-20" cy="-5" r="3" fill="white" /> 
         </g>
      </g>

      {/* The Thread of Ariadne */}
      <path 
        d="M420 395 Q 410 380 400 350 T 400 250" 
        stroke="white" 
        strokeWidth="1.5" 
        fill="none" 
        strokeDasharray="4 2"
      />
      
      {/* Fade into darkness at the bottom */}
      <rect x="0" y="300" width="800" height="300" fill="url(#darkness)" />
    </svg>
  </div>
);

export default function App() {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'won'>('start');
  const [gameId, setGameId] = useState(0); // Used to force regeneration
  const [isLandscape, setIsLandscape] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false); // Default to false to prevent blocking desktop on load
  const [speedPercent, setSpeedPercent] = useState(100);
  const [mazeSize, setMazeSize] = useState<MazeSize>('medium');
  const [showRules, setShowRules] = useState(false);
  const [showLanding, setShowLanding] = useState(false);
  
  // Generator Config
  const [enableTeleport, setEnableTeleport] = useState(true);
  const [enableKeys, setEnableKeys] = useState(false);
  const [enableKitten, setEnableKitten] = useState(false);
  const [enableRobots, setEnableRobots] = useState(false);
  
  // Auth State
  const [showAuth, setShowAuth] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Custom Maze Loader
  const [customMaze, setCustomMaze] = useState<MazeData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    
    const checkDevice = () => {
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        setIsTouchDevice(isTouch);
    };
    
    checkOrientation();
    checkDevice();
    window.addEventListener('resize', checkOrientation);
    
    // Check local storage for login
    const savedUser = localStorage.getItem('maze_user');
    if (savedUser) setUserEmail(savedUser);

    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // Auto-return to start screen after winning
  useEffect(() => {
    if (gameState === 'won') {
        const timer = setTimeout(() => {
            setGameState('start');
        }, 15000); // 15 seconds
        return () => clearTimeout(timer);
    }
  }, [gameState]);

  const handleLogin = (email: string) => {
      setUserEmail(email);
      localStorage.setItem('maze_user', email);
  };

  const handleLogout = () => {
      setUserEmail(null);
      localStorage.removeItem('maze_user');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const text = event.target?.result as string;
              let json: any = null;

              if (file.name.toLowerCase().endsWith('.svg')) {
                  const regex = /<!-- MAZE_DATA_START (.*?) MAZE_DATA_END -->/s;
                  const match = text.match(regex);
                  if (match && match[1]) {
                      json = JSON.parse(match[1]);
                  } else {
                      throw new Error('Цей SVG файл не містить даних лабіринту.');
                  }
              } else {
                  json = JSON.parse(text);
              }

              if (json && json.width && json.height && json.grid && json.bridges) {
                  setCustomMaze(json);
                  // Only try to lock orientation on mobile
                  if (isTouchDevice && screen.orientation && typeof (screen.orientation as any).lock === 'function') {
                     try { (screen.orientation as any).lock('portrait'); } catch (e) {}
                  }
                  audioManager.init();
                  setGameId(prev => prev + 1);
                  setGameState('playing');
              } else {
                  alert('Невірний формат файлу лабіринту.');
              }
          } catch (err: any) {
              console.error(err);
              alert('Помилка читання файлу: ' + (err.message || 'Невідома помилка'));
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  const startGame = async () => {
    setCustomMaze(null); 
    audioManager.init();
    if (isTouchDevice && screen.orientation && typeof (screen.orientation as any).lock === 'function') {
        try { await (screen.orientation as any).lock('portrait'); } catch (e) {}
    }
    setGameId(prev => prev + 1); // FORCE NEW RANDOM SEED/GENERATION
    setGameState('playing');
  };

  if (showLanding) {
      return <LandingPage onBack={() => setShowLanding(false)} />;
  }

  // Only block if it is landscape AND a touch device (phone/tablet)
  // Desktop users can play in landscape
  const showRotateWarning = isLandscape && isTouchDevice;

  return (
    <div className="w-full h-screen bg-stone-950 flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-amber-500/30 touch-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-stone-900 via-black to-black opacity-90 pointer-events-none" />
      
      {gameState === 'start' && <StartScreenArt />}
      
      {gameState === 'start' && !showRules && !showRotateWarning && (
          <div className="absolute top-4 right-4 z-30">
              {userEmail ? (
                  <div className="flex items-center gap-2 bg-stone-800/80 backdrop-blur-sm px-4 py-2 rounded-full border border-stone-700">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs text-stone-300 max-w-[100px] truncate">{userEmail}</span>
                      <button onClick={handleLogout} className="text-xs text-red-400 font-bold ml-2 hover:underline">Вийти</button>
                  </div>
              ) : (
                  <button 
                    onClick={() => setShowAuth(true)}
                    className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-amber-400 text-xs font-bold rounded-full border border-stone-600 transition-all"
                  >
                    👤 Вхід / Реєстрація
                  </button>
              )}
          </div>
      )}

      {showRotateWarning && (
        <div className="absolute z-50 inset-0 bg-black flex flex-col items-center justify-center text-center p-10 text-white">
            <h1 className="text-2xl font-bold mb-2 text-amber-500">Поверніть телефон</h1>
            <p className="text-stone-500 text-sm">Ця гра оптимізована для портретного режиму.</p>
        </div>
      )}

      {gameState === 'start' && !showRotateWarning && !showRules && !showAuth && (
        <div className="absolute top-16 z-20 flex flex-col items-center p-6 bg-stone-900/60 backdrop-blur-md rounded-2xl border border-stone-600/50 shadow-2xl text-white text-center max-w-md mx-4 transition-all animate-in fade-in slide-in-from-top-10 duration-500 w-full h-[85vh] overflow-y-auto">
          
          <div className="mb-6 flex flex-col items-center">
            <div className="w-24 h-24 mb-4 relative animate-in zoom-in duration-700">
                 <LogoCube />
            </div>
            <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-b from-white to-stone-400 bg-clip-text text-transparent mb-1 uppercase" style={{ fontFamily: 'Impact, sans-serif' }}>
                AMAZING MAZES
            </h1>
            <p className="text-xs text-amber-500 font-bold tracking-[0.2em] uppercase">Енциклопедія Лабіринтів</p>
          </div>
          
          {/* LEGEND OF THE BOOK BUTTON (Moved Top) */}
          <div className="w-full mb-6 p-1 bg-indigo-900/20 border border-indigo-500/30 rounded-2xl shadow-[0_0_30px_rgba(79,70,229,0.15)]">
            <button 
                onClick={() => setShowLanding(true)}
                className="relative px-6 py-4 bg-gradient-to-r from-indigo-900 to-purple-900 hover:from-indigo-800 hover:to-purple-800 text-indigo-100 font-bold text-sm rounded-xl border border-indigo-500/30 transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-purple-900/40 w-full flex items-center justify-center gap-3 overflow-hidden group"
            >
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <span className="text-2xl filter drop-shadow-lg group-hover:scale-110 transition-transform duration-300">📜</span>
                <div className="flex flex-col items-start">
                    <span className="uppercase text-[10px] text-indigo-300 tracking-widest">Історія Світу</span>
                    <span className="font-bold text-white tracking-wide text-lg">ЛЕГЕНДА КНИГИ</span>
                </div>
            </button>
          </div>

          <div className="w-full mb-4">
            <label className="text-[10px] text-stone-400 uppercase tracking-wider font-bold mb-2 block text-left">Оберіть складність</label>
            <div className="grid grid-cols-3 gap-2 mb-2">
                {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                        key={size}
                        onClick={() => setMazeSize(size)}
                        className={`py-2 rounded text-xs font-bold transition-all border ${
                            mazeSize === size 
                            ? 'bg-amber-500 text-stone-900 border-amber-500 shadow-lg shadow-amber-500/20' 
                            : 'bg-stone-800/80 text-stone-400 border-stone-700 hover:bg-stone-700'
                        }`}
                    >
                        {size === 'small' ? 'Малий' : size === 'medium' ? 'Середній' : 'Великий'}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
                {(['xl', 'hardcore'] as const).map((size) => (
                    <button
                        key={size}
                        onClick={() => setMazeSize(size)}
                        className={`py-2 rounded text-xs font-bold transition-all border uppercase ${
                            mazeSize === size 
                            ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/30' 
                            : 'bg-stone-800/80 text-red-900/70 border-stone-700 hover:bg-stone-700'
                        }`}
                    >
                        {size === 'xl' ? 'Екстра' : '🔥 Хардкор'}
                    </button>
                ))}
            </div>
          </div>

          {/* ADVANCED SETTINGS PANEL */}
          <div className="w-full mb-6 bg-stone-800/50 p-3 rounded-xl border border-stone-700">
              <h3 className="text-[10px] uppercase font-bold text-stone-500 mb-2 tracking-wider text-left">Налаштування генерації</h3>
              
              <label className="flex items-center justify-between mb-2 cursor-pointer group">
                  <div className="flex items-center gap-2">
                      <span className="text-lg">🌀</span>
                      <div className="text-left">
                          <span className="text-xs font-bold text-stone-300 block group-hover:text-white">Телепорти</span>
                          <span className="text-[10px] text-stone-500 block">Розрив шляху</span>
                      </div>
                  </div>
                  <div className="relative">
                      <input 
                          type="checkbox" 
                          checked={enableTeleport}
                          onChange={(e) => setEnableTeleport(e.target.checked)}
                          className="sr-only peer"
                          disabled={mazeSize === 'small'}
                      />
                      <div className="w-9 h-5 bg-stone-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </div>
              </label>
              
              <label className="flex items-center justify-between cursor-pointer group mb-2">
                   <div className="flex items-center gap-2">
                      <span className="text-lg">🔑</span>
                      <div className="text-left">
                          <span className="text-xs font-bold text-stone-300 block group-hover:text-white">Ключі та Бар'єри</span>
                          <span className="text-[10px] text-stone-500 block">Збір слів</span>
                      </div>
                  </div>
                  <div className="relative">
                      <input 
                          type="checkbox" 
                          checked={enableKeys}
                          onChange={(e) => setEnableKeys(e.target.checked)}
                          className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-stone-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer group mb-2">
                   <div className="flex items-center gap-2">
                      <span className="text-lg">🐈</span>
                      <div className="text-left">
                          <span className="text-xs font-bold text-stone-300 block group-hover:text-white">Грайливе Кошеня</span>
                          <span className="text-[10px] text-stone-500 block">Додаткова складність</span>
                      </div>
                  </div>
                  <div className="relative">
                      <input 
                          type="checkbox" 
                          checked={enableKitten}
                          onChange={(e) => setEnableKitten(e.target.checked)}
                          className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-stone-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </div>
              </label>

              {/* NEW ROBOT TOGGLE */}
              <label className="flex items-center justify-between cursor-pointer group">
                   <div className="flex items-center gap-2">
                      <span className="text-lg">🤖</span>
                      <div className="text-left">
                          <span className="text-xs font-bold text-stone-300 block group-hover:text-white">Роботи-Вартові</span>
                          <span className="text-[10px] text-stone-500 block">Небезпечні вороги</span>
                      </div>
                  </div>
                  <div className="relative">
                      <input 
                          type="checkbox" 
                          checked={enableRobots}
                          onChange={(e) => setEnableRobots(e.target.checked)}
                          className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-stone-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                  </div>
              </label>
          </div>

          <div className="w-full flex flex-col gap-3">
            <button 
                onClick={startGame}
                className="group relative px-10 py-4 bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-stone-900 font-black text-xl rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-amber-500/20 w-full touch-none uppercase tracking-wide"
            >
                <span className="relative z-10">ПОЧАТИ ГРУ</span>
            </button>
            
            <div className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">
                {isTouchDevice 
                    ? 'Керування: 1 палець - джойстик, 2 пальці - зум' 
                    : 'Керування: Мишка (клік+тягнути) або Стрілки клавіатури'}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-400 font-bold text-[10px] uppercase rounded-lg border border-stone-600 transition-colors flex flex-col items-center justify-center gap-1"
                >
                    <span className="text-lg">📂</span>
                    Завантажити
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json, .svg" className="hidden" />
                
                <button 
                    onClick={() => setShowRules(true)}
                    className="px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-400 font-bold text-[10px] uppercase rounded-lg border border-stone-600 transition-colors flex flex-col items-center justify-center gap-1"
                >
                    <span className="text-lg">📖</span>
                    Правила
                </button>
            </div>
          </div>
        </div>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onLogin={handleLogin} />}

      {showRules && (
          <div className="absolute inset-0 z-50 bg-stone-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
              <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[85vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6 border-b border-stone-700 pb-4">
                      <h2 className="text-2xl font-bold text-amber-400">Правила Світу</h2>
                      <button onClick={() => setShowRules(false)} className="text-stone-400 hover:text-white p-2">✕</button>
                  </div>
                  <div className="space-y-6 text-stone-300 text-sm leading-relaxed">
                      <section>
                          <h3 className="text-white font-bold text-lg mb-2 text-amber-500">🎯 Мета</h3>
                          <p>Проведіть Сферу Світла від <span className="text-green-400">START</span> до <span className="text-red-400">EXIT</span>, долаючи перешкоди.</p>
                      </section>
                      <section>
                          <h3 className="text-white font-bold text-lg mb-2 text-blue-400">🌉 Ефірні Мости</h3>
                          <p>Сині тунелі прискорюють рух! Увійти в них можна лише через <span className="text-red-400 font-bold">червоний портал</span>. Будьте обережні — всередині не можна зупинитися.</p>
                      </section>
                      <section>
                          <h3 className="text-white font-bold text-lg mb-2 text-fuchsia-400">🌀 Розрив Простору</h3>
                          <p>Якщо шлях обірвано прірвою, шукайте фіолетові кола телепортації. Вони активні лише короткий проміжок часу.</p>
                      </section>
                      
                      <section>
                          <h3 className="text-white font-bold text-lg mb-2 text-orange-400">🐈 Грайливий Супутник</h3>
                          <p>Час від часу в лабіринті з'являється примарне кошеня. Воно не бажає зла, але дуже любить гратися!</p>
                          <p className="text-stone-400 text-xs mt-1">Увага: Якщо кошеня наздожене сферу, воно штовхне її лапою, змінюючи ваш шлях.</p>
                      </section>

                      {/* ROBOT RULES */}
                      <section>
                          <h3 className="text-white font-bold text-lg mb-2 text-red-500">🤖 Роботи-Вартові</h3>
                          <p>Раптово з'являються групами та переслідують вас протягом 10 секунд.</p>
                          <p className="text-red-400 font-bold text-xs mt-1">НЕБЕЗПЕКА: Дотик до робота знищує сферу і повертає вас на СТАРТ!</p>
                      </section>

                      <section className="bg-indigo-950/40 p-4 rounded-xl border border-indigo-500/40 relative overflow-hidden">
                          <div className="absolute top-0 right-0 text-6xl opacity-10 pointer-events-none">📖</div>
                          <h3 className="text-cyan-300 font-bold text-lg mb-3 flex items-center gap-2">
                              🔐 Таємниця Великої Книги
                          </h3>
                          <p className="mb-3 text-indigo-100 leading-relaxed">
                              Сила, що відкриває фінальну перепону, прихована не в телефоні, а на сторінках <strong>Великої Книги "Amazing Mazes"</strong>.
                          </p>
                          <p className="text-indigo-200 mb-3">
                              Слова-ключі розкидані по паперових лабіринтах, наче стародавні руни. Тільки той, хто уважно вивчить кожну сторінку реальної книги, зможе знайти потрібний <strong>Код</strong> і зібрати <strong>Букви</strong>, що зруйнують магічний бар'єр.
                          </p>
                      </section>
                  </div>
                  <button onClick={() => setShowRules(false)} className="mt-8 w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold rounded-xl transition-colors uppercase tracking-widest shadow-lg shadow-amber-500/20">Зрозуміло</button>
              </div>
          </div>
      )}

      {gameState === 'won' && !showRotateWarning && (
        <>
          <Fireworks />
          <div className="absolute z-20 flex flex-col items-center p-8 bg-emerald-900/90 backdrop-blur-lg rounded-2xl border border-emerald-500/30 shadow-2xl text-white text-center max-w-sm mx-4 animate-in bounce-in duration-500">
            <div className="w-20 h-20 bg-emerald-500 rounded-full mb-6 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-4xl">🎉</div>
            <h1 className="text-4xl font-bold mb-2 text-white">Перемога!</h1>
            <p className="mb-8 text-emerald-200">Лабіринт пройдено.</p>
            <div className="flex flex-col gap-3 w-full">
                 <button onClick={() => setGameState('start')} className="px-8 py-3 bg-white text-emerald-900 font-bold rounded-full transition-transform hover:scale-105 shadow-lg z-30 cursor-pointer w-full">Меню</button>
            </div>
          </div>
        </>
      )}

      {!showRotateWarning && (
        <>
          <GameCanvas 
            isActive={gameState === 'playing'} 
            onWin={() => setGameState('won')}
            onExit={() => setGameState('start')}
            speedPercent={speedPercent}
            mazeSize={mazeSize}
            customMazeData={customMaze}
            isLoggedIn={!!userEmail}
            config={{ enableTeleport, enableKeys, enableKitten, enableRobots }}
            gameId={gameId}
          />
          {gameState === 'playing' && (
            <div className="absolute bottom-6 left-0 right-0 px-8 z-30 flex flex-col items-center gap-2 animate-in slide-in-from-bottom-10 duration-500 pointer-events-none">
              <div className="w-full max-w-md bg-stone-800/90 backdrop-blur-sm p-4 rounded-xl border border-stone-700 shadow-xl pointer-events-auto">
                 <div className="flex justify-between items-center mb-2">
                   <label className="text-amber-500 text-xs font-bold uppercase tracking-wider">Швидкість</label>
                   <span className="text-white font-mono text-sm">{speedPercent}%</span>
                 </div>
                 <input type="range" min="0" max="100" value={speedPercent} onChange={(e) => setSpeedPercent(Number(e.target.value))} className="w-full h-2 bg-stone-600 rounded-lg appearance-none cursor-pointer accent-amber-500 touch-action-manipulation" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
