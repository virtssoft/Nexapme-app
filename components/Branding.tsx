
import React from 'react';

interface BrandingProps {
  companyName: string;
  category: string;
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}

const Branding: React.FC<BrandingProps> = ({ companyName, category, variant = 'dark', size = 'md' }) => {
  const isLight = variant === 'light';
  
  const sizes = {
    sm: { top: 'text-[8px]', mid: 'text-sm', bot: 'text-[8px]' },
    md: { top: 'text-[10px]', mid: 'text-lg', bot: 'text-[9px]' },
    lg: { top: 'text-xs', mid: 'text-3xl', bot: 'text-xs' },
  };

  const currentSize = sizes[size];

  return (
    <div className="flex flex-col">
      <span className={`font-black uppercase tracking-[0.3em] leading-none mb-1 ${isLight ? 'text-slate-400' : 'text-emerald-400'} ${currentSize.top}`}>
        nexaPME
      </span>
      <h1 className={`font-black tracking-tighter leading-tight ${isLight ? 'text-slate-800' : 'text-white'} ${currentSize.mid}`}>
        {companyName}
      </h1>
      <span className={`font-bold uppercase tracking-widest mt-1 ${isLight ? 'text-slate-400' : 'text-slate-500'} ${currentSize.bot}`}>
        {category}
      </span>
    </div>
  );
};

export default Branding;
