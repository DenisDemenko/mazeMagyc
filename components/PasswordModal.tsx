
import React, { useState } from 'react';

interface PasswordModalProps {
  onUnlock: () => void;
  onCancel: () => void;
  correctPair: [string, string];
  codeId: number;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({ onUnlock, onCancel, correctPair, codeId }) => {
  const [w1, setW1] = useState('');
  const [w2, setW2] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const input1 = w1.trim().toLowerCase();
    const input2 = w2.trim().toLowerCase();
    
    const target1 = correctPair[0].toLowerCase();
    const target2 = correctPair[1].toLowerCase();
    
    // Debug / Master Code bypass
    const debug1 = "аум";
    const debug2 = "тат";

    // Check against the random pair for this round OR the universal debug code
    if ((input1 === target1 && input2 === target2) || (input1 === debug1 && input2 === debug2)) {
        onUnlock();
    } else {
        // Hint for debugging (shows what the actual required words are in console)
        console.log(`Required: ${target1} - ${target2}`);
        setError('Невірні слова. Спробуйте ще раз.');
    }
  };

  return (
    <div className="absolute inset-0 z-[60] bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-stone-900 border border-cyan-500/50 rounded-2xl p-6 w-full max-w-sm shadow-[0_0_50px_rgba(6,182,212,0.15)]">
        <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center border border-cyan-500 text-3xl shadow-lg shadow-cyan-500/20">
                🗝️
            </div>
        </div>
        
        <h2 className="text-xl font-bold text-cyan-400 mb-1 text-center uppercase tracking-wider">Майстер-Ключ</h2>
        <h3 className="text-lg font-bold text-white mb-2 text-center">КОД #{codeId}</h3>
        <p className="text-stone-400 text-xs text-center mb-6">
            Знайдіть цей код у книзі та введіть два таємних слова.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-cyan-700 text-[10px] uppercase font-bold mb-1">Слово 1</label>
                    <input 
                        type="text" 
                        value={w1}
                        onChange={(e) => setW1(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-700 rounded-lg p-2 text-white text-center focus:border-cyan-500 outline-none"
                        placeholder="???"
                    />
                </div>
                <div>
                    <label className="block text-cyan-700 text-[10px] uppercase font-bold mb-1">Слово 2</label>
                    <input 
                        type="text" 
                        value={w2}
                        onChange={(e) => setW2(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-700 rounded-lg p-2 text-white text-center focus:border-cyan-500 outline-none"
                        placeholder="???"
                    />
                </div>
            </div>

            {error && <p className="text-red-400 text-xs text-center bg-red-900/20 py-1 rounded">{error}</p>}

            <button 
                type="submit"
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-cyan-900/50 mt-2"
            >
                ВІДКРИТИ
            </button>
             <button 
                type="button"
                onClick={onCancel}
                className="w-full py-2 bg-transparent text-stone-500 text-xs hover:text-stone-300 transition-colors"
            >
                Відмінити (Повернутися до гри)
            </button>
        </form>
      </div>
    </div>
  );
};
