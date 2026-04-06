import React from 'react';

interface TypingCursorProps {
  text?: string;
  className?: string;
  showCursor?: boolean;
}

export function TypingCursor({ 
  text, 
  className = '',
  showCursor = true 
}: TypingCursorProps) {
  return (
    <span className={`typing-cursor ${className}`}>
      {text}
    </span>
  );
}

export default TypingCursor;
