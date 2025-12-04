
import React, { useEffect, useState, useRef } from 'react';
import { LogoCube } from './LogoCube';

interface LandingPageProps {
  onBack: () => void;
}

// Hook for Parallax Scroll
const useScrollPosition = () => {
  const [scroll, setScroll] = useState(0);
  useEffect(() => {
    const handleScroll = () => setScroll(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return scroll;
};

// Component for Scroll Reveal Animation
const RevealOnScroll: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div 
            ref={ref} 
            className={`transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

// SVG Divider (Torn Paper Effect)
const PaperEdge = ({ inverted = false }: { inverted?: boolean }) => (
    <div className={`absolute left-0 w-full h-16 z-20 ${inverted ? '-top-14 scale-y-[-1]' : '-bottom-14'} pointer-events-none`}>
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full fill-[#f5e6d3] drop-shadow-xl">
            <path d="M0,0V46.29c47,0,47,40,94,40s47-40,94-40,47,40,94,40,47-40,94-40,47,40,94,40,47-40,94-40,47,40,94-40V0Z" opacity=".5"></path>
            <path d="M0,0V15.81C13,15.81,13,64,26,64s13-48.19,26-48.19,13,48.19,26,48.19,13-48.19,26,48.19,13-48.19,26,48.19,13-48.19,26,48.19,13-48.19,26,48.19,13-48.19,26,48.19,13-48.19,26,48.19,13-48.19,26,48.19,13-48.19,26,48.19,13-48.19,26,48.19,13-48.19,26,48.19V0Z"></path>
        </svg>
    </div>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onBack }) => {
  const scrollY = useScrollPosition();

  return (
    <div className="absolute inset-0 z-[60] bg-[#1c1917] text-[#2c1810] overflow-x-hidden overflow-y-auto font-serif scroll-smooth">
      
      {/* --- PARALLAX HERO SECTION --- */}
      <div className="relative h-[120vh] overflow-hidden flex items-center justify-center perspective-1000">
        
        {/* Layer 0: Mystic Sky */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1e1b4b] via-[#312e81] to-[#4c1d95] z-0"></div>
        
        {/* Layer 1: Stars/Snow */}
        <div 
            className="absolute inset-0 z-0 opacity-70" 
            style={{ transform: `translateY(${scrollY * 0.1}px)` }}
        >
            <div className="absolute top-10 left-10 text-blue-200 text-xs opacity-50">❄️</div>
            <div className="absolute top-40 left-1/4 text-white text-xs opacity-70">✨</div>
            <div className="absolute top-20 right-1/3 text-blue-100 text-xs opacity-40">❄️</div>
            <div className="absolute top-60 right-10 text-white text-xs opacity-60">✨</div>
        </div>

        {/* Layer 2: Crystal Mountains (Back) */}
        <div 
            className="absolute bottom-0 left-0 right-0 h-[70%] z-10"
            style={{ transform: `translateY(${scrollY * 0.2}px)` }}
        >
             <svg viewBox="0 0 1440 320" className="absolute bottom-0 w-full h-full fill-[#4338ca] drop-shadow-2xl opacity-80">
                <path fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,112C672,96,768,96,864,112C960,128,1056,160,1152,160C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
             </svg>
        </div>

        {/* Layer 3: Wolf Silhouette (Mid) */}
        <div 
            className="absolute bottom-0 right-[-10%] h-[60%] w-[80%] z-20 opacity-90"
            style={{ transform: `translateY(${scrollY * 0.4}px)` }}
        >
             <div className="w-full h-full bg-gradient-to-t from-[#c7d2fe] to-transparent" style={{
                 clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
                 filter: "blur(60px)",
                 opacity: 0.4
             }}></div>
        </div>

        {/* Layer 4: Title & Logo */}
        <div className="absolute z-30 text-center top-[20%] w-full px-4" style={{ transform: `translateY(${scrollY * 0.6}px)` }}>
            <div className="w-48 h-48 mx-auto mb-8 animate-in zoom-in duration-1000 drop-shadow-[0_0_50px_rgba(165,180,252,0.6)]">
                 <LogoCube />
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-indigo-300 drop-shadow-lg tracking-tighter uppercase font-sans mb-4">
                Легенда про<br/>Срібну Нитку
            </h1>
            <p className="text-lg md:text-xl text-indigo-100 font-serif italic tracking-widest border-t border-b border-indigo-400/30 py-4 inline-block">
                Історія Оріанди та Абетка Лабіринтів
            </p>
        </div>

        {/* Layer 5: Foreground Paper */}
        <div className="absolute bottom-0 w-full h-[20vh] z-40 bg-[#f5e6d3]">
             <PaperEdge inverted />
        </div>
      </div>

      {/* --- CONTENT SECTION --- */}
      <div className="relative z-50 bg-[#f5e6d3] pb-20 px-4 md:px-0 overflow-hidden">
        
        {/* Background Texture */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/paper-fibers.png')" }}></div>

        <div className="max-w-4xl mx-auto relative pt-10">
            
            {/* STORY PART 1: The Source */}
            <RevealOnScroll>
                <div className="flex flex-col md:flex-row gap-8 items-center mb-20">
                    <div className="w-full md:w-1/3">
                        <div className="w-full h-64 bg-stone-800 rounded-full overflow-hidden border-4 border-[#4a3b32] shadow-2xl relative">
                             {/* Abstract visual for 'Maze of Mists' */}
                             <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-slate-700">
                                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl opacity-50">🌫️</div>
                             </div>
                        </div>
                    </div>
                    <div className="w-full md:w-2/3">
                        <h2 className="text-3xl font-bold text-[#4a3b32] mb-4 font-serif">Великий Лабіринт Туманів</h2>
                        <p className="text-lg leading-relaxed text-[#5c4d45] italic">
                            "Давним-давно, коли світ був ще зовсім юним, а стихії природи ще не поділили землю між собою, існував Великий Лабіринт Туманів. У його центрі, за високими стінами з чорного базальту, було сховане Джерело Життя — кришталева чаша, що давала силу всім водам світу: від могутніх океанів до найменшої ранкової росинки."
                        </p>
                    </div>
                </div>
            </RevealOnScroll>

            <div className="w-full h-px bg-[#4a3b32]/20 my-12"></div>

            {/* STORY PART 2: The Hero & Orianda */}
            <RevealOnScroll delay={100}>
                <div className="mb-20 text-center max-w-3xl mx-auto">
                    <p className="text-lg leading-relaxed text-[#2c1810] mb-6">
                        Але шлях до Джерела був заплутаним і небезпечним. Стіни Лабіринту постійно змінювалися, зсуваючись і перекриваючи дороги. Багато відважних мандрівників намагалися знайти Джерело, щоб напоїти посушливі землі, але губилися у нескінченних глухих кутах.
                    </p>
                    <div className="bg-white/50 p-8 rounded-2xl border border-[#4a3b32]/20 shadow-inner mb-6">
                        <p className="text-xl font-serif text-indigo-900 font-bold mb-4">
                            "Тоді з’явився Герой — не силою м’язів він вирізнявся, а чистотою серця."
                        </p>
                        <p className="text-md text-[#4a3b32]">
                            Він став перед входом у Лабіринт і, не знаючи куди йти, звернувся до небес. Його почула <strong>Оріанда</strong> — давня дух-хранителька водних шляхів, що жила у хмарах над Лабіринтом.
                        </p>
                    </div>
                </div>
            </RevealOnScroll>

            {/* STORY PART 3: The Bracelet */}
            <RevealOnScroll delay={200}>
                <div className="flex flex-col md:flex-row-reverse gap-8 items-center mb-24">
                    <div className="w-full md:w-1/3 flex justify-center">
                         <div className="relative">
                             <div className="absolute inset-0 bg-cyan-400 blur-2xl opacity-30 animate-pulse"></div>
                             <div className="text-9xl drop-shadow-2xl relative z-10">🧵</div>
                         </div>
                    </div>
                    <div className="w-full md:w-2/3">
                        <h3 className="text-2xl font-bold text-cyan-900 mb-4">Подарунок Оріанди</h3>
                        <p className="text-lg leading-relaxed text-[#2c1810] mb-4">
                            Оріанда не могла спуститися вниз, адже її стихія — це повітря і пара. Але вона бачила весь Лабіринт згори. Вона зрозуміла, що вказати шлях голосом неможливо — вітер губився серед стін.
                        </p>
                        <p className="text-lg leading-relaxed text-[#2c1810] mb-4">
                            Тоді Оріанда зняла зі свого зап'ястя браслет, сплетений з місячного сяйва і чистої води, і кинула його Герою. Браслет розсипався, перетворившись на одну довгу, нескінченну <strong>Срібну Нитку</strong>.
                        </p>
                        <blockquote className="border-l-4 border-cyan-500 pl-4 py-2 italic text-cyan-800 bg-cyan-50 rounded-r-lg">
                            — Тримайся цієї нитки, — прошепотіла Оріанда голосом дощу. — Вона не плутається і не рветься. Вона тече, як вода, знаходячи найменші щілини.
                        </blockquote>
                    </div>
                </div>
            </RevealOnScroll>

            {/* STORY PART 4: The Alphabet */}
            <RevealOnScroll delay={300}>
                <div className="bg-[#2c1810] text-amber-100 rounded-3xl shadow-2xl relative overflow-hidden border-4 border-[#4a3b32] mb-24 p-8 md:p-12">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    
                    <div className="relative z-10">
                        <h2 className="text-3xl md:text-4xl font-bold text-amber-500 mb-8 font-serif text-center">Народження Абетки Лабіринтів</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                            <div className="space-y-4 text-amber-100/90">
                                <p>
                                    Герой пішов за ниткою. Там, де стіна здавалася суцільною, нитка знаходила прихований прохід. Там, де чекала пастка, нитка огинала її хитромудрою петлею.
                                </p>
                                <p>
                                    Кожен поворот, кожен вигин, який робила нитка, долаючи перешкоди, утворював дивний візерунок.
                                </p>
                                <ul className="space-y-2 mt-4 text-sm bg-black/20 p-4 rounded-xl">
                                    <li className="flex gap-2">↪️ <span className="italic">Коли нитка різко повертала вправо, утворювався знак, схожий на кут.</span></li>
                                    <li className="flex gap-2">🌀 <span className="italic">Коли вона закручувалася у вир, з’являлася спіраль.</span></li>
                                    <li className="flex gap-2">⏹️ <span className="italic">Коли шлях вів у глухий кут, нитка малювала замкнений квадрат.</span></li>
                                </ul>
                            </div>
                            
                            <div className="bg-[#f5e6d3] p-6 rounded-xl transform rotate-1 text-[#2c1810] font-bold shadow-lg">
                                <p className="text-sm text-[#5c4d45] mb-4 italic text-center">
                                    "Герой почав замальовувати ці вигини на стінах. Кожен візерунок нитки він назвав звуком, який чув у той момент..."
                                </p>
                                <div className="grid grid-cols-3 gap-2 text-center font-mono text-2xl">
                                    <div className="p-3 border-2 border-[#2c1810] flex flex-col items-center justify-center">
                                        <span className="text-xs text-gray-500 mb-1">Вітер</span>
                                        <span>Ш</span>
                                    </div>
                                    <div className="p-3 border-2 border-[#2c1810] flex flex-col items-center justify-center">
                                        <span className="text-xs text-gray-500 mb-1">Крапля</span>
                                        <span>Д</span>
                                    </div>
                                    <div className="p-3 border-2 border-[#2c1810] flex flex-col items-center justify-center">
                                        <span className="text-xs text-gray-500 mb-1">Потік</span>
                                        <span>Г</span>
                                    </div>
                                </div>
                                <p className="text-xs text-center mt-4 font-bold uppercase tracking-widest text-amber-700">Так народилася Абетка</p>
                            </div>
                        </div>

                        <p className="mt-8 text-center text-amber-200/80 italic">
                            "Це не просто літери — це мапа першого проходження до Джерела. Чорні стіни літер — це каміння Лабіринту, а білі проходи між ними — це шлях Срібної Нитки Оріанди."
                        </p>
                    </div>
                </div>
            </RevealOnScroll>

            {/* STORY PART 5: Conclusion */}
            <RevealOnScroll delay={400}>
                <div className="mb-24 text-center max-w-3xl mx-auto">
                    <div className="text-5xl mb-4 text-blue-400 drop-shadow-md">💧</div>
                    <h3 className="text-2xl font-bold text-[#2c1810] mb-4">Спадщина Води</h3>
                    <p className="text-lg leading-relaxed text-[#5c4d45] mb-6">
                        Кажуть, що нитка й досі існує. Вона перетворилася на підземні ріки, що течуть у глибинах планети. А той, хто знає таємницю Абетки Лабіринтів, може прочитати послання води і знайти вихід з будь-якої скрути, адже вода завжди знаходить шлях.
                    </p>
                    <p className="text-lg leading-relaxed text-[#2c1810] font-bold">
                        Саме тому наша маленька Крапелька, героїня книги, інтуїтивно розуміє ці знаки. Адже в кожній краплинці води живе пам'ять про ту саму Нитку Оріанди, що колись врятувала світ від спраги.
                    </p>
                </div>
            </RevealOnScroll>

            {/* INTERACTIVE TIPS */}
            <RevealOnScroll delay={500}>
                <div className="bg-white p-8 rounded-2xl border-l-8 border-amber-500 shadow-xl mb-20 transform hover:scale-[1.02] transition-transform">
                    <h3 className="text-xl font-bold text-amber-800 mb-4 flex items-center gap-2">
                        <span>💡</span> Як використати це в книзі:
                    </h3>
                    <ul className="space-y-4 text-[#4a3b32]">
                        <li className="flex gap-3 items-start">
                            <span className="text-amber-600 font-bold">•</span>
                            <span>
                                <strong>Інтерактивний елемент:</strong> Коли Крапелька знаходить напис на браслеті, вона може відчути "тяжіння" або "течію" всередині літер.
                            </span>
                        </li>
                        <li className="flex gap-3 items-start">
                            <span className="text-amber-600 font-bold">•</span>
                            <span>
                                <strong>Мораль:</strong> "Щоб прочитати цей шифр, ти маєш думати не як камінь, що стоїть на місці, а як вода, що тече крізь перешкоди."
                            </span>
                        </li>
                        <li className="flex gap-3 items-start">
                            <span className="text-amber-600 font-bold">•</span>
                            <span className="italic font-serif text-lg text-amber-900">
                                "Анаграми - це кодові слова для проходження лабіринту та вони діють як ключі."
                            </span>
                        </li>
                    </ul>
                </div>
            </RevealOnScroll>

            {/* CTA */}
            <div className="text-center pb-20">
                <button 
                    onClick={onBack}
                    className="px-12 py-6 bg-[#854d0e] hover:bg-[#a16207] text-white font-black text-2xl rounded-full shadow-2xl hover:shadow-[0_20px_40px_rgba(133,77,14,0.5)] transition-all transform hover:scale-105 active:scale-95 uppercase tracking-widest border-4 border-[#f5e6d3]"
                >
                    Почати Гру
                </button>
                <p className="mt-6 text-[#5c4d45] font-bold text-sm uppercase tracking-[0.3em]">Денис Деменко © 2024</p>
            </div>

        </div>
      </div>
    </div>
  );
};
