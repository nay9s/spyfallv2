import React from 'react';

export const Input = ({ value, onChange, placeholder, className = '' }) => {
    return (
        <input
            type="text"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`min-h-13 min-w-0 bg-[#070c11]/90 border border-[#2b3743] text-white text-base rounded-lg focus:ring-4 focus:ring-[#22d3c5]/10 focus:border-[#36cfc2]/60 block w-full px-4 py-3.5 outline-none transition-all placeholder:text-[#526474] shadow-inner shadow-black/20 ${className}`}
        />
    );
};
