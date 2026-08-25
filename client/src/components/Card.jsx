import React from 'react';
import { motion } from 'framer-motion';

export const Card = ({ children, className = '' }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`bg-[#111a2e]/88 backdrop-blur-xl rounded-[1.75rem] p-5 sm:p-6 shadow-[0_18px_60px_rgba(0,0,0,0.28)] border border-white/[0.08] ${className}`}
        >
            {children}
        </motion.div>
    );
};
