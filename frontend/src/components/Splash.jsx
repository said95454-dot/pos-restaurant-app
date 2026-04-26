import React from 'react';
import { motion } from 'framer-motion';

const Splash = ({ subtitle = 'Cargando…' }) => {
  return (
    <div className="fixed inset-0 z-50 bg-ink-950 flex items-center justify-center overflow-hidden" data-testid="splash-screen">
      <div className="aurora" />
      <div className="grain" />
      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0, rotate: -30 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative h-24 w-24 rounded-3xl flex items-center justify-center mb-6"
        >
          {/* Conic ring */}
          <div className="absolute inset-0 rounded-3xl conic-border" />
          {/* Inner */}
          <div className="absolute inset-1 rounded-3xl bg-ink-900 flex items-center justify-center">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="font-heading text-4xl font-black text-gradient text-glow-cyan"
            >P</motion.span>
          </div>
          {/* Glow ring */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -inset-2 rounded-[2rem] border border-primary-500/40"
          />
        </motion.div>
        <motion.h1
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="font-heading text-2xl font-bold text-gradient"
        >POS Restaurante</motion.h1>
        <motion.p
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.6 }}
          className="text-sm text-foreground/50 mt-2"
        >{subtitle}</motion.p>
      </div>
    </div>
  );
};

export default Splash;
