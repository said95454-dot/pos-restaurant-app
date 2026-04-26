import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

/** Animated number counter — plays nice spring count when value changes. */
const AnimatedNumber = ({ value, format = (n) => n, className = '', testId }) => {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 90, damping: 18, mass: 0.8 });
  const display = useTransform(spring, (v) => format(v));
  const [text, setText] = useState(format(0));

  useEffect(() => {
    motionValue.set(value || 0);
  }, [value, motionValue]);

  useEffect(() => {
    return display.on('change', (v) => setText(v));
  }, [display]);

  return (
    <motion.span className={className} data-testid={testId}>
      {text}
    </motion.span>
  );
};

export default AnimatedNumber;
