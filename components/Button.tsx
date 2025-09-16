

import React from 'react';

// fix: Update ButtonProps to accept all standard button attributes (e.g., 'title')
// by extending React.ButtonHTMLAttributes. This makes the component more flexible
// while preserving its specific `onClick` signature.
interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  children: React.ReactNode;
  // fix: Made onClick optional to support buttons with type="submit" inside forms that rely on onSubmit.
  onClick?: () => void;
  primary?: boolean;
}

const Button: React.FC<ButtonProps> = ({ children, onClick, primary = false, className = '', ...props }) => (
    <button
        onClick={onClick}
        className={`px-6 py-2 rounded-lg font-semibold tracking-wide transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${primary ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-95 shadow-lg shadow-blue-500/20 transform hover:-translate-y-px" : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"} ${className}`}
        {...props}
    >
        {children}
    </button>
);

export default Button;