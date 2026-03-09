import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ManagerLogin from './pages/ManagerLogin';
import ManagerDashboard from './pages/ManagerDashboard';
import POSLogin from './pages/POSLogin';
import POS from './pages/POS';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/manager/login" element={<ManagerLogin />} />
        <Route path="/manager/dashboard" element={<ManagerDashboard />} />
        <Route path="/pos/login" element={<POSLogin />} />
        <Route path="/pos" element={<POS />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
