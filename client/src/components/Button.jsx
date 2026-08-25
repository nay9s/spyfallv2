import React from 'react';
import { motion } from 'framer-motion';

export const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
    const baseStyle = "game-button min-h-13 min-w-0 inline-flex items-center justify-center gap-2 font-extrabold py-3 px-5 rounded-lg transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100";
    const variants = {
        primary: "border border-[#f0646c]/50 bg-[#d83f48] text-white shadow-[0_10px_28px_rgba(216,63,72,0.2)] hover:bg-[#e44b54]",
        secondary: "border border-[#33404d] bg-[#18212b] text-slate-100 shadow-[0_8px_22px_rgba(0,0,0,0.16)] hover:border-[#4b5b6b] hover:bg-[#202b36]",
        outline: "border border-[#2b3743] bg-transparent text-[#93a4b1] hover:border-[#526474] hover:bg-white/[0.035] hover:text-white",
        success: "border border-[#39d8c9]/40 bg-[#128c82] text-white shadow-[0_10px_28px_rgba(18,140,130,0.18)] hover:bg-[#16a094]"
    };

    return (
        <motion.button
            whileTap={disabled ? undefined : { scale: 0.97 }}
            className={`${baseStyle} ${variants[variant] || variants.primary} ${className}`}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </motion.button>
    );
};
