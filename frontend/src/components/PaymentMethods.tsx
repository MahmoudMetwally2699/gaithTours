import React from 'react';
import { ShieldCheckIcon, CreditCardIcon } from '@heroicons/react/24/outline';

export const PaymentMethods: React.FC = () => {
  const paymentLogos = [
    { name: 'Visa', src: '/Visa_Inc.-Logo.wine.png', alt: 'Visa' },
    { name: 'Mastercard', src: '/Mastercard-logo.svg', alt: 'Mastercard' },
    { name: 'American Express', src: '/American_Express-Logo.wine.png', alt: 'American Express' },
    { name: 'Meeza', src: '/Meeza.svg.png', alt: 'Meeza' },
  ];

  return (
    <section className="w-full py-16 md:py-20 bg-gradient-to-b from-white to-gray-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 px-5 py-2 rounded-full text-sm font-semibold mb-6 shadow-sm">
            <ShieldCheckIcon className="w-5 h-5" />
            <span>100% Secure Payments</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Pay Your Way
          </h2>
          <p className="text-gray-500 text-lg md:text-xl max-w-2xl mx-auto">
            Choose from multiple trusted payment methods for a seamless checkout experience
          </p>
        </div>

        {/* Payment Cards - Floating Style */}
        <div className="relative">
          {/* Decorative gradient blur */}
          <div className="absolute inset-0 bg-gradient-to-r from-orange-200/30 via-blue-200/30 to-purple-200/30 blur-3xl -z-10 scale-150"></div>

          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 lg:gap-10">
            {paymentLogos.map((logo, index) => (
              <div
                key={logo.name}
                className="group relative bg-white rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-gray-100/50 backdrop-blur-sm"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                {/* Hover glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400/10 to-amber-400/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <img
                  src={logo.src}
                  alt={logo.alt}
                  className="h-14 md:h-16 w-auto object-contain relative z-10 grayscale-[30%] group-hover:grayscale-0 transition-all duration-300"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-12 md:mt-16 flex flex-wrap items-center justify-center gap-6 md:gap-10 text-gray-400">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">256-bit SSL</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCardIcon className="w-5 h-5" />
            <span className="text-sm font-medium">PCI DSS Compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Fraud Protection</span>
          </div>
        </div>

      </div>
    </section>
  );
};
