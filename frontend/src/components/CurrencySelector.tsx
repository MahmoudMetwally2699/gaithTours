import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useCurrency, Currency } from '../contexts/CurrencyContext';

interface CurrencyOption {
  code: Currency;
  label: string;
  flag?: string;
}

const currencies: CurrencyOption[] = [
  { code: 'USD', label: 'USD', flag: '🇺🇸' },
  { code: 'SAR', label: 'SAR', flag: '🇸🇦' },
  { code: 'EGP', label: 'EGP', flag: '🇪🇬' },
];

interface CurrencySelectorProps {
  variant?: 'light' | 'dark';
  className?: string;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  variant = 'light',
  className = ''
}) => {
  const { currency, setCurrency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const currentCurrency = currencies.find(c => c.code === currency) || currencies[0];

  const textColor = variant === 'light' ? 'text-white' : 'text-gray-700';
  const hoverColor = variant === 'light' ? 'hover:text-orange-100' : 'hover:text-orange-500';
  const dropdownBg = 'bg-white';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-1 ${textColor} ${hoverColor} transition-colors cursor-pointer`}
      >
        <span className="text-sm font-medium">{currentCurrency.code}</span>
        <ChevronDownIcon className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute top-full left-0 rtl:right-0 mt-2 ${dropdownBg} rounded-lg shadow-xl border border-gray-100 overflow-hidden z-50 min-w-[100px] animate-fadeIn`}>
          {currencies.map((curr) => (
            <button
              key={curr.code}
              type="button"
              onClick={() => {
                setCurrency(curr.code);
                setIsOpen(false);
              }}
              className={`w-full flex items-center space-x-2 px-4 py-2.5 text-sm text-left transition-colors ${
                currency === curr.code
                  ? 'bg-orange-50 text-orange-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {curr.flag && <span className="text-base">{curr.flag}</span>}
              <span>{curr.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CurrencySelector;
