import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface ClockProps {
  hour: number;
  minute: number;
  targetHour?: number;
  targetMinute?: number;
  showHint?: boolean;
  onChange?: (hour: number, minute: number) => void;
  interactive?: boolean;
  snapMode?: 'hour' | 'half' | 'quarter' | 'five' | 'free';
}

const Clock: React.FC<ClockProps> = ({ 
  hour, 
  minute, 
  targetHour, 
  targetMinute, 
  showHint = false,
  onChange, 
  interactive = true, 
  snapMode = 'five' 
}) => {
  const clockRef = useRef<SVGSVGElement>(null);
  const [isDraggingMinute, setIsDraggingMinute] = useState(false);
  const [isDraggingHour, setIsDraggingHour] = useState(false);

  const calculateAngle = (clientX: number, clientY: number) => {
    if (!clockRef.current) return 0;
    const rect = clockRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (angle < 0) angle += 360;
    return angle;
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!interactive || (!isDraggingMinute && !isDraggingHour)) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const angle = calculateAngle(clientX, clientY);

    if (isDraggingMinute) {
      let newMinute = Math.round((angle / 360) * 60) % 60;
      
      // Snapping logic
      if (snapMode === 'five') {
        newMinute = Math.round(newMinute / 5) * 5 % 60;
      } else if (snapMode === 'quarter') {
        newMinute = Math.round(newMinute / 15) * 15 % 60;
      } else if (snapMode === 'half') {
        newMinute = Math.round(newMinute / 30) * 30 % 60;
      } else if (snapMode === 'hour') {
        newMinute = 0;
      }

      onChange?.(hour, newMinute);
    } else if (isDraggingHour) {
      const newHour = (Math.round((angle / 360) * 12) % 12) || 12;
      onChange?.(newHour, minute);
    }
  }, [isDraggingMinute, isDraggingHour, hour, minute, onChange, interactive, snapMode]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingMinute(false);
    setIsDraggingHour(false);
  }, []);

  useEffect(() => {
    if (isDraggingMinute || isDraggingHour) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDraggingMinute, isDraggingHour, handleMouseMove, handleMouseUp]);

  const minuteAngle = minute * 6;
  const hourAngle = (hour % 12) * 30 + minute * 0.5;

  return (
    <div className="relative w-64 h-64 md:w-96 md:h-96 select-none">
      <svg
        ref={clockRef}
        viewBox="0 0 400 400"
        className="w-full h-full drop-shadow-xl"
      >
        {/* Clock Plate */}
        <circle cx="200" cy="200" r="190" fill="white" stroke="#333" strokeWidth="8" />
        
        {/* Minute Markers and Numbers (Small) */}
        {[...Array(60)].map((_, i) => {
          const angle = (i * 6) * (Math.PI / 180);
          const isMajor = i % 5 === 0;
          const length = isMajor ? 15 : 8;
          const x1 = 200 + Math.sin(angle) * (180 - length);
          const y1 = 200 - Math.cos(angle) * (180 - length);
          const x2 = 200 + Math.sin(angle) * 180;
          const y2 = 200 - Math.cos(angle) * 180;
          
          return (
            <React.Fragment key={i}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isMajor ? "#ef4444" : "#cbd5e1"}
                strokeWidth={isMajor ? "4" : "2"}
                strokeLinecap="round"
              />
              {isMajor && (
                <text
                  x={200 + Math.sin(angle) * 160}
                  y={200 - Math.cos(angle) * 160}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-red-500 font-black"
                  style={{ fontSize: '18px', userSelect: 'none' }}
                >
                  {i}
                </text>
              )}
            </React.Fragment>
          );
        })}

        {/* Numbers (Hour) */}
        {[...Array(12)].map((_, i) => {
          const num = i === 0 ? 12 : i;
          const angle = (i * 30) * (Math.PI / 180);
          const x = 200 + Math.sin(angle) * 120; // Slightly moved in to avoid overlap
          const y = 200 - Math.cos(angle) * 120;
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className="text-5xl font-black fill-blue-700"
              style={{ fontSize: '48px', userSelect: 'none' }}
            >
              {num}
            </text>
          );
        })}

        {/* Hour Hand */}
        <g 
          className="cursor-pointer group" 
          onMouseDown={() => interactive && setIsDraggingHour(true)}
          onTouchStart={() => interactive && setIsDraggingHour(true)}
        >
          {/* Hitbox */}
          <line
            x1="200"
            y1="200"
            x2={200 + Math.sin((hourAngle * Math.PI) / 180) * 110}
            y2={200 - Math.cos((hourAngle * Math.PI) / 180) * 110}
            stroke="transparent"
            strokeWidth="40"
            strokeLinecap="round"
          />
          <motion.line
            x1="200"
            y1="200"
            x2={200 + Math.sin((hourAngle * Math.PI) / 180) * 100}
            y2={200 - Math.cos((hourAngle * Math.PI) / 180) * 100}
            stroke="#1e40af"
            strokeWidth="16"
            strokeLinecap="round"
            className="drop-shadow-sm"
          />
        </g>

        {/* Minute Hand */}
        <g 
          className="cursor-pointer group" 
          onMouseDown={() => interactive && setIsDraggingMinute(true)}
          onTouchStart={() => interactive && setIsDraggingMinute(true)}
        >
          {/* Hitbox */}
          <line
            x1="200"
            y1="200"
            x2={200 + Math.sin((minuteAngle * Math.PI) / 180) * 160}
            y2={200 - Math.cos((minuteAngle * Math.PI) / 180) * 160}
            stroke="transparent"
            strokeWidth="40"
            strokeLinecap="round"
          />
          <motion.line
            x1="200"
            y1="200"
            x2={200 + Math.sin((minuteAngle * Math.PI) / 180) * 150}
            y2={200 - Math.cos((minuteAngle * Math.PI) / 180) * 150}
            stroke="#ef4444"
            strokeWidth="8"
            strokeLinecap="round"
            className="drop-shadow-sm"
          />
        </g>

        {/* Ghost Hands (Hints) */}
        {showHint && targetHour !== undefined && targetMinute !== undefined && (
          <g opacity="0.15">
            {/* Ghost Hour Hand */}
            <line
              x1="200"
              y1="200"
              x2={200 + Math.sin(((targetHour % 12) * 30 + targetMinute * 0.5) * Math.PI / 180) * 100}
              y2={200 - Math.cos(((targetHour % 12) * 30 + targetMinute * 0.5) * Math.PI / 180) * 100}
              stroke="#1e40af"
              strokeWidth="24"
              strokeLinecap="round"
              strokeDasharray="4 4"
            />
            {/* Ghost Minute Hand */}
            <line
              x1="200"
              y1="200"
              x2={200 + Math.sin((targetMinute * 6) * Math.PI / 180) * 150}
              y2={200 - Math.cos((targetMinute * 6) * Math.PI / 180) * 150}
              stroke="#ef4444"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray="4 4"
            />
          </g>
        )}

        {/* Center Pivot */}
        <circle cx="200" cy="200" r="12" fill="#333" />
        <circle cx="200" cy="200" r="4" fill="white" />
      </svg>
    </div>
  );
};

export default Clock;
