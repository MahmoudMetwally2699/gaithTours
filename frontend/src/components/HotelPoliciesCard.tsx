import React from 'react';
import {
  ClockIcon,
  UserGroupIcon,
  CreditCardIcon,
  InformationCircleIcon,
  HomeIcon,
  BanknotesIcon,
  TruckIcon,
  WifiIcon,
  NoSymbolIcon
} from '@heroicons/react/24/outline';

interface MetapolicyStruct {
  deposit?: {
    deposit?: string;
    deposit_required?: boolean;
    accepted_payment_methods?: string[];
  };
  internet?: {
    internet_type?: string;
    internet_where?: string;
    is_paid?: boolean;
  };
  meal?: {
    meal_type?: string;
    meal_where?: string;
  };
  children_meal?: {
    availability?: string;
    price?: string;
  };
  extra_bed?: {
    availability?: string;
    price?: string;
    age_range?: string;
  };
  cot?: {
    availability?: string;
    price?: string;
  };
  pets?: {
    allowed?: boolean;
    charge?: string;
  };
  shuttle?: {
    availability?: string;
    type?: string;
    price?: string;
  };
  parking?: {
    availability?: string;
    type?: string;
    cost?: string;
    location?: string;
  };
  children?: {
    age?: string;
    policy?: string;
  };
  visa?: {
    support?: boolean;
    details?: string;
  };
  no_show?: {
    penalty?: string;
  };
  add_fee?: Array<{
    fee_type?: string;
    amount?: string;
    currency?: string;
    frequency?: string;
  }>;
  check_in_check_out?: {
    check_in_from?: string;
    check_in_to?: string;
    check_out_from?: string;
    check_out_to?: string;
  };
}

interface HotelPoliciesCardProps {
  checkInTime?: string;
  checkOutTime?: string;
  metapolicyInfo?: string;
  metapolicyStruct?: MetapolicyStruct;
}

export const HotelPoliciesCard: React.FC<HotelPoliciesCardProps> = ({
  checkInTime,
  checkOutTime,
  metapolicyInfo,
  metapolicyStruct
}) => {
  // Parse metapolicy info - strip HTML tags and convert to readable text
  const parsePolicies = (): string[] => {
    if (!metapolicyInfo) return [];

    // Strip HTML tags and convert to plain text
    const stripHtml = (html: string): string => {
      return html
        .replace(/<br\s*\/?>/gi, '\n')           // Convert <br> to newlines
        .replace(/<\/li>/gi, '\n')               // Convert </li> to newlines
        .replace(/<\/p>/gi, '\n')                // Convert </p> to newlines
        .replace(/<[^>]*>/g, '')                 // Remove all other HTML tags
        .replace(/&nbsp;/g, ' ')                 // Convert &nbsp; to spaces
        .replace(/&amp;/g, '&')                  // Convert &amp; to &
        .replace(/&lt;/g, '<')                   // Convert &lt; to <
        .replace(/&gt;/g, '>')                   // Convert &gt; to >
        .replace(/\n\s*\n/g, '\n')               // Remove empty lines
        .trim();
    };

    const cleanText = stripHtml(metapolicyInfo);
    const policies: string[] = [];
    const lines = cleanText.split('\n').filter(line => line.trim());

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && trimmed.length > 3) {       // Filter out very short lines
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

  // Check if we have structured policy data
  const hasStructuredPolicies = metapolicyStruct && Object.keys(metapolicyStruct).length > 0;
  const hasPolicies = checkInTime || checkOutTime || policies.length > 0 || hasStructuredPolicies;

  if (!hasPolicies) {
    return null;
  }

  // Render a structured policy section
  const renderPolicyItem = (icon: React.ReactNode, title: string, content: string | React.ReactNode) => (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <div className="text-sm text-gray-600 mt-0.5">{content}</div>
      </div>
    </div>
  );

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
      {(checkInTime || checkOutTime || metapolicyStruct?.check_in_check_out) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(checkInTime || metapolicyStruct?.check_in_check_out?.check_in_from) && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ClockIcon className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Check-in</p>
                <p className="text-sm text-gray-600 mt-0.5">
                  {checkInTime || `From ${metapolicyStruct?.check_in_check_out?.check_in_from || '15:00'}`}
                  {metapolicyStruct?.check_in_check_out?.check_in_to &&
                    ` - Until ${metapolicyStruct.check_in_check_out.check_in_to}`}
                </p>
              </div>
            </div>
          )}

          {(checkOutTime || metapolicyStruct?.check_in_check_out?.check_out_from) && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ClockIcon className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Check-out</p>
                <p className="text-sm text-gray-600 mt-0.5">
                  {checkOutTime || `Until ${metapolicyStruct?.check_in_check_out?.check_out_to || '12:00'}`}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Structured Policy Sections */}
      {hasStructuredPolicies && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">Property Rules & Amenities</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Deposit Policy */}
            {metapolicyStruct?.deposit && (
              renderPolicyItem(
                <BanknotesIcon className="h-5 w-5 text-orange-600" />,
                "Deposit & Payment",
                <>
                  {metapolicyStruct.deposit.deposit_required !== false && (
                    <span>Deposit required. </span>
                  )}
                  {metapolicyStruct.deposit.accepted_payment_methods && metapolicyStruct.deposit.accepted_payment_methods.length > 0 && (
                    <span>Accepts: {metapolicyStruct.deposit.accepted_payment_methods.join(', ')}</span>
                  )}
                  {metapolicyStruct.deposit.deposit && (
                    <span>{metapolicyStruct.deposit.deposit}</span>
                  )}
                </>
              )
            )}

            {/* Internet */}
            {metapolicyStruct?.internet && (
              renderPolicyItem(
                <WifiIcon className="h-5 w-5 text-orange-600" />,
                "Internet",
                <>
                  {metapolicyStruct.internet.internet_type && (
                    <span className="capitalize">{metapolicyStruct.internet.internet_type}</span>
                  )}
                  {metapolicyStruct.internet.internet_where && (
                    <span> ({metapolicyStruct.internet.internet_where})</span>
                  )}
                  {metapolicyStruct.internet.is_paid && (
                    <span className="text-orange-600 font-medium"> - Charges apply</span>
                  )}
                  {!metapolicyStruct.internet.is_paid && (
                    <span className="text-green-600 font-medium"> - Free</span>
                  )}
                </>
              )
            )}

            {/* Parking */}
            {metapolicyStruct?.parking && (
              renderPolicyItem(
                <TruckIcon className="h-5 w-5 text-orange-600" />,
                "Parking",
                <>
                  {metapolicyStruct.parking.availability && (
                    <span className="capitalize">{metapolicyStruct.parking.availability}</span>
                  )}
                  {metapolicyStruct.parking.type && (
                    <span> - {metapolicyStruct.parking.type}</span>
                  )}
                  {metapolicyStruct.parking.cost && (
                    <span> ({metapolicyStruct.parking.cost})</span>
                  )}
                  {metapolicyStruct.parking.location && (
                    <span> - {metapolicyStruct.parking.location}</span>
                  )}
                </>
              )
            )}

            {/* Pets */}
            {metapolicyStruct?.pets && (
              renderPolicyItem(
                metapolicyStruct.pets.allowed
                  ? <HomeIcon className="h-5 w-5 text-green-600" />
                  : <NoSymbolIcon className="h-5 w-5 text-red-600" />,
                "Pets",
                <>
                  {metapolicyStruct.pets.allowed ? (
                    <span className="text-green-600">Pets allowed</span>
                  ) : (
                    <span className="text-red-600">No pets allowed</span>
                  )}
                  {metapolicyStruct.pets.charge && (
                    <span> - {metapolicyStruct.pets.charge}</span>
                  )}
                </>
              )
            )}

            {/* Children Policy */}
            {metapolicyStruct?.children && (
              renderPolicyItem(
                <UserGroupIcon className="h-5 w-5 text-orange-600" />,
                "Children",
                <>
                  {metapolicyStruct.children.policy && (
                    <span>{metapolicyStruct.children.policy}</span>
                  )}
                  {metapolicyStruct.children.age && (
                    <span> (Age: {metapolicyStruct.children.age})</span>
                  )}
                </>
              )
            )}

            {/* Extra Bed */}
            {metapolicyStruct?.extra_bed && (
              renderPolicyItem(
                <HomeIcon className="h-5 w-5 text-orange-600" />,
                "Extra Bed",
                <>
                  {metapolicyStruct.extra_bed.availability && (
                    <span className="capitalize">{metapolicyStruct.extra_bed.availability}</span>
                  )}
                  {metapolicyStruct.extra_bed.price && (
                    <span> - {metapolicyStruct.extra_bed.price}</span>
                  )}
                  {metapolicyStruct.extra_bed.age_range && (
                    <span> (Ages: {metapolicyStruct.extra_bed.age_range})</span>
                  )}
                </>
              )
            )}

            {/* Cot/Crib */}
            {metapolicyStruct?.cot && (
              renderPolicyItem(
                <HomeIcon className="h-5 w-5 text-orange-600" />,
                "Cot/Crib",
                <>
                  {metapolicyStruct.cot.availability && (
                    <span className="capitalize">{metapolicyStruct.cot.availability}</span>
                  )}
                  {metapolicyStruct.cot.price && (
                    <span> - {metapolicyStruct.cot.price}</span>
                  )}
                </>
              )
            )}

            {/* Shuttle */}
            {metapolicyStruct?.shuttle && (
              renderPolicyItem(
                <TruckIcon className="h-5 w-5 text-orange-600" />,
                "Shuttle Service",
                <>
                  {metapolicyStruct.shuttle.availability && (
                    <span className="capitalize">{metapolicyStruct.shuttle.availability}</span>
                  )}
                  {metapolicyStruct.shuttle.type && (
                    <span> - {metapolicyStruct.shuttle.type}</span>
                  )}
                  {metapolicyStruct.shuttle.price && (
                    <span> ({metapolicyStruct.shuttle.price})</span>
                  )}
                </>
              )
            )}

            {/* No Show */}
            {metapolicyStruct?.no_show?.penalty && (
              renderPolicyItem(
                <InformationCircleIcon className="h-5 w-5 text-red-600" />,
                "No-Show Policy",
                <span className="text-red-600">{metapolicyStruct.no_show.penalty}</span>
              )
            )}
          </div>

          {/* Additional Fees */}
          {metapolicyStruct?.add_fee && metapolicyStruct.add_fee.length > 0 && (
            <div className="mt-4">
              <h5 className="text-sm font-medium text-gray-900 mb-2">Additional Fees</h5>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="space-y-2">
                  {metapolicyStruct.add_fee.map((fee, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{fee.fee_type}</span>
                      <span className="font-medium text-gray-900">
                        {fee.amount} {fee.currency}
                        {fee.frequency && <span className="text-gray-500"> / {fee.frequency}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legacy Policy List (from metapolicyInfo string) */}
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
