import React from 'react';
import { motion } from 'framer-motion';

export const Card = ({ children, className = '' }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`game-panel relative bg-[#0d141c]/92 backdrop-blur-xl rounded-xl p-5 sm:p-6 shadow-[0_18px_60px_rgba(0,0,0,0.32)] border border-[#26323e] ${className}`}
        >
            {children}
        </motion.div>
    );
};
