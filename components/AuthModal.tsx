
import React, { useState } from 'react';

interface AuthModalProps {
  onClose: () => void;
  onLogin: (email: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@') || password.length < 4) {
        setError('Будь ласка, введіть дійсний email та пароль (мін. 4 символи)');
        return;
    }
    // Simulate API call
    setTimeout(() => {
        onLogin(email);
        onClose();
    }, 500);
  };

  return (
    <div className="absolute inset-0 z-50 bg-stone-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
      <div className="bg-stone-900 border border-stone-700 rounded-2xl p-8 w-full max-w-sm shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-500 hover:text-white">✕</button>
        
        <h2 className="text-2xl font-bold text-amber-400 mb-6 text-center">
            {isLogin ? 'Вхід в акаунт' : 'Реєстрація'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-stone-400 text-xs uppercase font-bold mb-1">Email</label>
                <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-600 rounded-lg p-3 text-white focus:border-amber-500 outline-none"
                    placeholder="name@example.com"
                />
            </div>
            <div>
                <label className="block text-stone-400 text-xs uppercase font-bold mb-1">Пароль</label>
                <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-600 rounded-lg p-3 text-white focus:border-amber-500 outline-none"
                    placeholder="••••••••"
                />
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <button 
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold rounded-xl transition-colors mt-2"
            >
                {isLogin ? 'Увійти' : 'Зареєструватися'}
            </button>
        </form>

        <div className="mt-6 text-center">
            <button 
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-stone-400 text-sm hover:text-amber-400 underline"
            >
                {isLogin ? 'Немає акаунту? Створити' : 'Вже є акаунт? Увійти'}
            </button>
        </div>
      </div>
    </div>
  );
};
