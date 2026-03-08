import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();
  const [pulse, setPulse] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => p === 1 ? 1.1 : 1);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-blue-900 relative overflow-hidden">
      {/* Círculos de fondo */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-400 rounded-full opacity-10 -mr-24 -mt-24"></div>
      <div className="absolute bottom-20 left-0 w-36 h-36 bg-pink-400 rounded-full opacity-10 -ml-12"></div>
      <div className="absolute bottom-0 right-1/4 w-44 h-44 bg-purple-400 rounded-full opacity-10 -mb-12"></div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-between py-10 px-6">
        {/* Header */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div 
              className="inline-block bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400 p-6 rounded-full shadow-2xl shadow-cyan-500/50 mb-6"
              style={{ transform: `scale(${pulse})`, transition: 'transform 1.5s ease-in-out' }}
            >
              <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
              </svg>
            </div>
            <h1 className="text-5xl font-black text-white mb-3 tracking-wider" style={{ textShadow: '0 0 30px rgba(0, 240, 255, 0.8)' }}>
              SISTEMA POS
            </h1>
            <p className="text-cyan-400 text-sm tracking-widest font-bold uppercase">
              PUNTO DE VENTA DEL FUTURO
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="w-full max-w-md space-y-4">
          <button
            onClick={() => navigate('/pos/login')}
            className="w-full bg-gradient-to-r from-cyan-400 via-blue-500 to-blue-700 hover:from-cyan-500 hover:via-blue-600 hover:to-blue-800 text-white rounded-2xl py-7 px-6 shadow-xl shadow-cyan-500/40 hover:shadow-2xl hover:shadow-cyan-500/60 transition-all duration-300 transform hover:scale-105"
          >
            <div className="flex flex-col items-center gap-2">
              <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
              </svg>
              <span className="text-2xl font-extrabold tracking-wide">PUNTO DE VENTA</span>
              <span className="text-xs font-semibold tracking-widest opacity-90">TOMAR ÓRDENES</span>
            </div>
          </button>

          <button
            onClick={() => navigate('/manager/login')}
            className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-purple-700 hover:from-pink-600 hover:via-purple-600 hover:to-purple-800 text-white rounded-2xl py-7 px-6 shadow-xl shadow-purple-500/40 hover:shadow-2xl hover:shadow-purple-500/60 transition-all duration-300 transform hover:scale-105"
          >
            <div className="flex flex-col items-center gap-2">
              <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              <span className="text-2xl font-extrabold tracking-wide">ADMINISTRACIÓN</span>
              <span className="text-xs font-semibold tracking-widest opacity-90">PANEL DE GERENTE</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
