// Placeholder components
import React from 'react';
import { useNavigate } from 'react-router-dom';

export const POSLogin = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center">
      <div className="text-center">
        <button onClick={() => navigate('/')} className="text-white mb-8">
          <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-3xl font-bold text-white mb-4">Login de Cajeros</h1>
        <p className="text-gray-300">Funcionalidad en desarrollo</p>
        <button 
          onClick={() => navigate('/pos')} 
          className="mt-6 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg"
        >
          Ir al POS (sin login)
        </button>
      </div>
    </div>
  );
};

export const POS = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-6">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <button onClick={() => navigate('/')} className="hover:text-gray-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold">Punto de Venta</h1>
          <div className="w-6"></div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto p-6 text-center">
        <p className="text-gray-600 text-lg">Pantalla POS en desarrollo</p>
      </div>
    </div>
  );
};

export default POSLogin;
