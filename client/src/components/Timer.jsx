import React, { useEffect, useState } from 'react';

export const Timer = ({ initialTime, onTick }) => {
    const [timeLeft, setTimeLeft] = useState(initialTime);

    const onTickRef = React.useRef(onTick);

    useEffect(() => {
        onTickRef.current = onTick;
    }, [onTick]);

    useEffect(() => {
        const endTime = Date.now() + initialTime * 1000;

        const intervalId = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));

            setTimeLeft(remaining);
            if (onTickRef.current) onTickRef.current(remaining);

            if (remaining <= 0) {
                clearInterval(intervalId);
            }
        }, 1000);

        return () => clearInterval(intervalId);
    }, [initialTime]);

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    const isUrgent = timeLeft <= 60;

    return (
        <div className={`inline-flex items-center gap-3 rounded-full border px-5 py-2.5 font-mono shadow-lg ${isUrgent ? 'border-[#ff4d75]/40 bg-[#ff4d75]/10 text-[#ff6b8c] shadow-[#ff4d75]/10' : 'border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-300 shadow-cyan-500/5'}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${isUrgent ? 'bg-[#ff4d75] animate-pulse' : 'bg-cyan-400'}`} />
            <span className="text-2xl font-black tracking-tight">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
        </div>
    );
};
