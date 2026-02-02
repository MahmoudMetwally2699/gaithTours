import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface TaxItem {
  name: string;
  amount: number;
  currency: string;
  included: boolean;
}

interface PriceBreakdownProps {
  basePrice: number;
  taxes: TaxItem[];
  totalPrice: number;
  currency: string;
  nights: number;
  dailyPrices?: number[];
}

export const PriceBreakdownCard: React.FC<PriceBreakdownProps> = ({
  basePrice,
  taxes,
  totalPrice,
  currency,
  nights,
  dailyPrices
}) => {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getTaxLabel = (taxName: string) => {
    const labels: { [key: string]: string } = {
      'vat': 'VAT',
      'service_fee': 'Service Fee',
      'city_tax': 'City Tax',
      'resort_fee': 'Resort Fee',
      'tourism_tax': 'Tourism Tax'
    };
    return labels[taxName] || taxName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const includedTaxes = taxes.filter(tax => tax.included);
  const excludedTaxes = taxes.filter(tax => !tax.included);
  const totalTaxes = taxes.reduce((sum, tax) => sum + tax.amount, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Price Breakdown</span>
          {taxes.length > 0 && (
            <span className="text-xs text-gray-500">
              ({taxes.length} {taxes.length === 1 ? 'tax' : 'taxes'})
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-orange-600 font-price">
            {formatPrice(totalPrice)}
          </span>
          {isExpanded ? (
            <ChevronUpIcon className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
          {/* Base Price */}
          <div className="flex justify-between items-center pt-3">
            <span className="text-sm text-gray-600">
              Base Rate {nights > 1 && `(${nights} nights)`}
            </span>
            <span className="text-sm font-medium text-gray-900">
              {formatPrice(basePrice)}
            </span>
          </div>

          {/* Daily Breakdown (if multiple nights) */}
          {dailyPrices && dailyPrices.length > 1 && (
            <div className="ml-4 space-y-1">
              {dailyPrices.map((price, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    Night {index + 1}
                  </span>
                  <span className="text-xs text-gray-600">
                    {formatPrice(parseFloat(price.toString()))}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Taxes */}
          {taxes.length > 0 && (
            <>
              <div className="border-t border-gray-100 pt-2">
                <span className="text-sm font-medium text-gray-700">Taxes & Fees</span>
              </div>

              {/* Included Taxes */}
              {includedTaxes.map((tax, index) => (
                <div key={`included-${index}`} className="flex justify-between items-center ml-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{getTaxLabel(tax.name)}</span>
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                      Included
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {formatPrice(tax.amount)}
                  </span>
                </div>
              ))}

              {/* Excluded Taxes */}
              {excludedTaxes.map((tax, index) => (
                <div key={`excluded-${index}`} className="flex justify-between items-center ml-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{getTaxLabel(tax.name)}</span>
                    <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                      At Property
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {formatPrice(tax.amount)}
                  </span>
                </div>
              ))}

              {/* Total Taxes */}
              {taxes.length > 1 && (
                <div className="flex justify-between items-center ml-4 pt-1 border-t border-gray-100">
                  <span className="text-sm font-medium text-gray-700">Total Taxes</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatPrice(totalTaxes)}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Total */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="text-base font-bold text-gray-900">Total</span>
            <span className="text-lg font-bold text-orange-600 font-price">
              {formatPrice(totalPrice)}
            </span>
          </div>

          {/* Tax Note */}
          {excludedTaxes.length > 0 && (
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              * Some taxes and fees are payable directly at the property
            </div>
          )}
        </div>
      )}
    </div>
  );
};
