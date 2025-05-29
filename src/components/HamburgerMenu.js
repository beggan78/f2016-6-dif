import React, { useState } from 'react';

export function HamburgerMenu({ onRestartMatch }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleRestartMatch = () => {
    setIsOpen(false);
    onRestartMatch();
  };

  return (
    <div className="relative">
      <button
        onClick={toggleMenu}
        className="p-2 text-sky-400 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900 rounded"
        aria-label="Menu"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-slate-700 rounded-lg shadow-lg border border-slate-600 z-20">
            <div className="py-1">
              <button
                onClick={handleRestartMatch}
                className="block w-full text-left px-4 py-2 text-sm text-slate-100 hover:bg-slate-600 hover:text-sky-400 transition-colors duration-200"
              >
                Restart Match
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}