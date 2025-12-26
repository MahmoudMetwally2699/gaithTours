import React from 'react';
import {
  ClockIcon,
  UserGroupIcon,
  CreditCardIcon,
  InformationCircleIcon,
  HomeIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

interface HotelPoliciesCardProps {
  checkInTime?: string;
  checkOutTime?: string;
  metapolicyInfo?: string;
}

export const HotelPoliciesCard: React.FC<HotelPoliciesCardProps> = ({
  checkInTime,
  checkOutTime,
  metapolicyInfo
}) => {
  // Parse metapolicy info if it's a string
  const parsePolicies = (): string[] => {
    if (!metapolicyInfo) return [];

    const policies: string[] = [];
    const lines = metapolicyInfo.split('\n').filter(line => line.trim());

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed) {
        policies.push(trimmed);
      }
    });

    return policies;
  };

  const policies = parsePolicies();

  const getPolicyIcon = (policy: string) => {
    const lowerPolicy = policy.toLowerCase();

    if (lowerPolicy.includes('check-in') || lowerPolicy.includes('check in')) {
      return <ClockIcon className="h-5 w-5 text-orange-500" />;
    }
    if (lowerPolicy.includes('age') || lowerPolicy.includes('children')) {
      return <UserGroupIcon className="h-5 w-5 text-orange-500" />;
    }
    if (lowerPolicy.includes('payment') || lowerPolicy.includes('credit card')) {
      return <CreditCardIcon className="h-5 w-5 text-orange-500" />;
    }
    if (lowerPolicy.includes('deposit') || lowerPolicy.includes('fee')) {
      return <BanknotesIcon className="h-5 w-5 text-orange-500" />;
    }
    if (lowerPolicy.includes('pet') || lowerPolicy.includes('smoking')) {
      return <HomeIcon className="h-5 w-5 text-orange-500" />;
    }

    return <InformationCircleIcon className="h-5 w-5 text-orange-500" />;
  };

  const hasPolicies = checkInTime || checkOutTime || policies.length > 0;

  if (!hasPolicies) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Hotel Policies</h3>
        <p className="text-sm text-gray-500 mt-1">
          Important information about this property
        </p>
      </div>

      {/* Check-in/Check-out Times */}
      {(checkInTime || checkOutTime) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {checkInTime && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ClockIcon className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Check-in</p>
                <p className="text-sm text-gray-600 mt-0.5">{checkInTime}</p>
              </div>
            </div>
          )}

          {checkOutTime && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ClockIcon className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Check-out</p>
                <p className="text-sm text-gray-600 mt-0.5">{checkOutTime}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Policy List */}
      {policies.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">Property Rules</h4>

          <div className="space-y-2">
            {policies.map((policy, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getPolicyIcon(policy)}
                </div>
                <p className="text-sm text-gray-700 flex-1">{policy}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Important Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">Important</p>
            <p className="text-xs text-blue-700 mt-1">
              Please review all hotel policies before booking. Additional policies may apply at the property.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
