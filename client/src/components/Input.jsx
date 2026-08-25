import React from 'react';

export const Input = ({ value, onChange, placeholder, className = '' }) => {
    return (
        <input
            type="text"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`min-h-13 min-w-0 bg-[#09101f]/80 border border-white/10 text-white text-base rounded-2xl focus:ring-4 focus:ring-[#ff4d75]/15 focus:border-[#ff6688]/70 block w-full px-4 py-3.5 outline-none transition-all placeholder:text-slate-500 shadow-inner shadow-black/10 ${className}`}
        />
    );
};
