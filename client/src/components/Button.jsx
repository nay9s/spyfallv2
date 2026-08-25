import React from 'react';
import { motion } from 'framer-motion';

export const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
    const baseStyle = "min-h-13 min-w-0 inline-flex items-center justify-center gap-2 font-extrabold py-3 px-5 rounded-2xl transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100";
    const variants = {
        primary: "bg-gradient-to-r from-[#ff4d75] to-[#ff7043] text-white shadow-[0_12px_28px_rgba(255,77,117,0.24)] hover:brightness-110",
        secondary: "bg-white/[0.07] hover:bg-white/[0.11] text-slate-100 border border-white/10 shadow-[0_8px_22px_rgba(0,0,0,0.16)]",
        outline: "bg-transparent border border-white/12 text-slate-300 hover:bg-white/[0.06] hover:text-white",
        success: "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-[0_12px_28px_rgba(16,185,129,0.2)] hover:brightness-110"
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
