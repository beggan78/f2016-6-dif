import React from 'react';
import { ImageOff } from 'lucide-react';

export function ProviderLogo({ provider, className = '' }) {
  const containerClassName = `w-32 h-10 flex-shrink-0 overflow-hidden rounded-md border border-slate-600 bg-slate-800 ${className}`.trim();

  if (provider?.logo) {
    return (
      <div className={containerClassName}>
        <img
          src={provider.logo}
          alt={`${provider.name} logo`}
          className="w-full h-full object-cover block"
        />
      </div>
    );
  }

  const fallbackLabel = provider?.name || 'Connector';

  return (
    <div
      className={`${containerClassName} flex items-center justify-center px-2`}
      aria-label={`${fallbackLabel} logo placeholder`}
    >
      <div className="flex items-center space-x-2 text-slate-200 text-sm font-medium truncate">
        <ImageOff className="w-4 h-4 text-slate-400" aria-hidden="true" />
        <span className="truncate">{fallbackLabel}</span>
      </div>
    </div>
  );
}
