import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', className = '', ...props }) => {
  const base = "inline-flex items-center justify-center rounded-[12px] px-5 py-2 font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-light focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-brand-dark text-white hover:bg-brand-dark/90",
    secondary: "bg-brand-light text-white hover:bg-brand-light/90",
    outline: "border-2 border-brand-dark text-brand-dark hover:bg-brand-dark/5",
    ghost: "text-brand-dark hover:bg-brand-gray"
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
