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
  NoSymbolIcon,
  TicketIcon,
  GlobeAltIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBed, faUtensils, faDog, faCar, faBaby } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

/**
 * HotelPoliciesCard Component - Displays hotel policies and rules
 *
 * FEATURES IMPLEMENTED FOR RATEHAWK CERTIFICATION:
 *
 * ✅ Point 4: metapolicy_struct and metapolicy_extra_info Display
 *
 * Parses and displays metapolicy_struct with ALL sections from ETG API:
 *    - add_fee: Additional fees (resort fees, tourism taxes, etc.)
 *    - check_in_check_out: Check-in and check-out times
 *    - children: Extra bed pricing by child age range
 *    - children_meal: Meal pricing for children by age
 *    - cot: Crib/cot availability and pricing
 *    - deposit: Various deposit types (breakage, keys, pet, etc.)
 *    - extra_bed: Extra bed availability and pricing
 *    - internet: WiFi availability and pricing by area
 *    - meal: Meal pricing for adults
 *    - no_show: No-show penalty policy
 *    - parking: Parking availability and pricing
 *    - pets: Pet policy and pricing
 *    - shuttle: Shuttle service availability and pricing
 *    - visa: Visa support availability
 */

// ETG API metapolicy_struct interfaces - matching actual API response format
interface ChildrenPolicy {
  age_start: number;
  age_end: number;
  extra_bed: string;
  price: string;
  currency: string;
}

interface ChildrenMealPolicy {
  age_start: number;
  age_end: number;
  meal_type: string;
  inclusion: string;
  price: string;
  currency: string;
}

interface CotPolicy {
  amount: number;
  inclusion: string;
  price: string;
  currency: string;
  price_unit: string;
}

interface DepositPolicy {
  availability: string;
  deposit_type: string;
  payment_type: string;
  price: string;
  currency: string;
  price_unit: string;
  pricing_method: string;
}

interface ExtraBedPolicy {
  amount: number;
  inclusion: string;
  price: string;
  currency: string;
  price_unit: string;
}

interface InternetPolicy {
  internet_type: string;
  work_area: string;
  inclusion: string;
  price: string;
  currency: string;
  price_unit: string;
}

interface MealPolicy {
  meal_type: string;
  inclusion: string;
  price: string;
  currency: string;
}

interface NoShowPolicy {
  availability: string;
  day_period: string;
  time: string;
}

interface ParkingPolicy {
  inclusion: string;
  territory_type: string;
  price: string;
  currency: string;
  price_unit: string;
}

interface PetsPolicy {
  inclusion: string;
  pets_type: string;
  price: string;
  currency: string;
  price_unit: string;
}

interface ShuttlePolicy {
  shuttle_type: string;
  destination_type: string;
  inclusion: string;
  price: string;
  currency: string;
}

interface VisaPolicy {
  visa_support: string;
}

interface AddFeePolicy {
  fee_type: string;
  amount: string;
  currency: string;
  frequency?: string;
  price_unit?: string;
  inclusion?: string;
}

interface CheckInCheckOutPolicy {
  check_in_from?: string;
  check_in_to?: string;
  check_out_from?: string;
  check_out_to?: string;
}

interface MetapolicyStruct {
  add_fee?: AddFeePolicy[];
  check_in_check_out?: CheckInCheckOutPolicy[];
  children?: ChildrenPolicy[];
  children_meal?: ChildrenMealPolicy[];
  cot?: CotPolicy[];
  deposit?: DepositPolicy[];
  extra_bed?: ExtraBedPolicy[];
  internet?: InternetPolicy[];
  meal?: MealPolicy[];
  no_show?: NoShowPolicy;
  parking?: ParkingPolicy[];
  pets?: PetsPolicy[];
  shuttle?: ShuttlePolicy[];
  visa?: VisaPolicy;
}

// policy_struct is a different format from metapolicy_struct
interface PolicyStructSection {
  title: string;
  paragraphs: string[];
}

interface HotelPoliciesCardProps {
  checkInTime?: string;
  checkOutTime?: string;
  metapolicyInfo?: string;
  metapolicyStruct?: MetapolicyStruct;
  policyStruct?: PolicyStructSection[];
}

export const HotelPoliciesCard: React.FC<HotelPoliciesCardProps> = ({
  checkInTime,
  checkOutTime,
  metapolicyInfo,
  metapolicyStruct,
  policyStruct
}) => {
  const { t } = useTranslation('hotelDetails');

  // Helper function to format price unit
  const formatPriceUnit = (unit: string): string => {
    const units: { [key: string]: string } = {
      'per_room_per_night': t('policies.units.per_room_per_night'),
      'per_room_per_stay': t('policies.units.per_room_per_stay'),
      'per_guest_per_night': t('policies.units.per_guest_per_night'),
      'per_guest_per_stay': t('policies.units.per_guest_per_stay'),
      'per_car_per_night': t('policies.units.per_car_per_night'),
      'per_hour': t('policies.units.per_hour'),
      'unspecified': ''
    };
    return units[unit] || unit.replace(/_/g, ' ');
  };

  // Helper function to format inclusion status
  const formatInclusion = (inclusion: string): { text: string; isIncluded: boolean } => {
    if (inclusion === 'included') {
      return { text: t('policies.included'), isIncluded: true };
    }
    return { text: t('policies.additionalCharge'), isIncluded: false };
  };

  // Helper function to capitalize first letter
  const capitalize = (str: string): string => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
  };

  // Helper function to get currency with USD default
  const getCurrency = (currency: string | undefined): string => {
    if (!currency || currency.trim() === '') return 'USD';
    return currency;
  };
  // Parse metapolicy info - strip HTML tags and convert to readable text
  const parsePolicies = (): string[] => {
    if (!metapolicyInfo) return [];

    const stripHtml = (html: string): string => {
      return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\n\s*\n/g, '\n')
        .trim();
    };

    const cleanText = stripHtml(metapolicyInfo);
    const policies: string[] = [];
    const lines = cleanText.split('\n').filter(line => line.trim());

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && trimmed.length > 3) {
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
  const hasPolicyStruct = policyStruct && policyStruct.length > 0;
  const hasPolicies = checkInTime || checkOutTime || policies.length > 0 || hasStructuredPolicies || hasPolicyStruct;

  if (!hasPolicies) {
    return null;
  }

  // Render a structured policy section
  const renderPolicyItem = (icon: React.ReactNode, title: string, content: React.ReactNode) => (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <div className="text-sm text-gray-600 mt-0.5">{content}</div>
      </div>
    </div>
  );

  // Render multiple items in a list
  const renderPolicyList = (icon: React.ReactNode, title: string, items: React.ReactNode[]) => (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 mb-2">{title}</p>
        <div className="space-y-1.5">
          {items.map((item, idx) => (
            <div key={idx} className="text-sm text-gray-600 pl-2 border-l-2 border-orange-200">
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{t('policies.title')}</h3>
        <p className="text-sm text-gray-500 mt-1">
          {t('policies.subtitle')}
        </p>
      </div>

      {/* Check-in/Check-out Times */}
      {(checkInTime || checkOutTime || (metapolicyStruct?.check_in_check_out && metapolicyStruct.check_in_check_out.length > 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(checkInTime || (metapolicyStruct?.check_in_check_out?.[0]?.check_in_from)) && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ClockIcon className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{t('policies.checkIn')}</p>
                <p className="text-sm text-gray-600 mt-0.5">
                  {checkInTime || `${t('policies.from')} ${metapolicyStruct?.check_in_check_out?.[0]?.check_in_from || '15:00'}`}
                  {metapolicyStruct?.check_in_check_out?.[0]?.check_in_to &&
                    ` - ${t('policies.until')} ${metapolicyStruct.check_in_check_out[0].check_in_to}`}
                </p>
              </div>
            </div>
          )}

          {(checkOutTime || (metapolicyStruct?.check_in_check_out?.[0]?.check_out_to)) && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ClockIcon className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{t('policies.checkOut')}</p>
                <p className="text-sm text-gray-600 mt-0.5">
                  {checkOutTime || `${t('policies.until')} ${metapolicyStruct?.check_in_check_out?.[0]?.check_out_to || '12:00'}`}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Structured Policy Sections */}
      {hasStructuredPolicies && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-900">{t('policies.propertyRules')}</h4>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

            {/* Children Policy (Extra Bed by Age) */}
            {metapolicyStruct?.children && metapolicyStruct.children.length > 0 && (
              renderPolicyList(
                <UserGroupIcon className="h-5 w-5 text-orange-600" />,
                t('policies.childrenAndExtraBeds'),
                metapolicyStruct.children.map((child, idx) => (
                  <div key={idx} className="flex flex-wrap gap-x-2">
                    <span className="font-medium">{t('policies.ages')} {child.age_start}-{child.age_end}:</span>
                    <span>{t('policies.extraBed')} {child.extra_bed === 'available' ? t('policies.available') : t('policies.notAvailable')}</span>
                    {child.price && child.price !== '0' && (
                      <span className="text-orange-600">
                        {getCurrency(child.currency)} {child.price}
                      </span>
                    )}
                    {child.price === '0' && (
                      <span className="text-green-600 font-medium">{t('policies.free')}</span>
                    )}
                  </div>
                ))
              )
            )}

            {/* Children Meal Policy */}
            {metapolicyStruct?.children_meal && metapolicyStruct.children_meal.length > 0 && (
              renderPolicyList(
                <FontAwesomeIcon icon={faUtensils} className="h-5 w-5 text-orange-600" />,
                t('policies.childrensMeals'),
                metapolicyStruct.children_meal.map((meal, idx) => (
                  <div key={idx} className="flex flex-wrap gap-x-2">
                    <span className="font-medium">{t('policies.ages')} {meal.age_start}-{meal.age_end}:</span>
                    <span className="capitalize">{meal.meal_type}</span>
                    {meal.inclusion === 'included' ? (
                      <span className="text-green-600 font-medium">{t('policies.included')}</span>
                    ) : (
                      <span className="text-orange-600">
                        {getCurrency(meal.currency)} {meal.price}
                      </span>
                    )}
                  </div>
                ))
              )
            )}

            {/* Cot/Crib */}
            {metapolicyStruct?.cot && metapolicyStruct.cot.length > 0 && (
              renderPolicyList(
                <FontAwesomeIcon icon={faBaby} className="h-5 w-5 text-orange-600" />,
                t('policies.cotCrib'),
                metapolicyStruct.cot.map((cot, idx) => {
                  const inclusion = formatInclusion(cot.inclusion);
                  return (
                    <div key={idx} className="flex flex-wrap gap-x-2">
                      <span>{cot.amount} {t('policies.available')}</span>
                      {inclusion.isIncluded ? (
                        <span className="text-green-600 font-medium">{t('policies.free')}</span>
                      ) : (
                        <span className="text-orange-600">
                          {getCurrency(cot.currency)} {cot.price} {formatPriceUnit(cot.price_unit)}
                        </span>
                      )}
                    </div>
                  );
                })
              )
            )}

            {/* Deposit Policy */}
            {metapolicyStruct?.deposit && metapolicyStruct.deposit.length > 0 && (
              renderPolicyList(
                <BanknotesIcon className="h-5 w-5 text-orange-600" />,
                t('policies.deposits'),
                metapolicyStruct.deposit.map((dep, idx) => (
                  <div key={idx} className="flex flex-wrap gap-x-2">
                    <span className="font-medium capitalize">{dep.deposit_type !== 'unspecified' ? dep.deposit_type : t('policies.general')}:</span>
                    {dep.pricing_method === 'percent' ? (
                      <span className="text-orange-600">{dep.price}%</span>
                    ) : (
                      <span className="text-orange-600">
                        {getCurrency(dep.currency)} {dep.price}
                      </span>
                    )}
                    <span className="text-gray-500">{formatPriceUnit(dep.price_unit)}</span>
                    {dep.payment_type !== 'unspecified' && (
                      <span className="text-gray-500">({dep.payment_type})</span>
                    )}
                  </div>
                ))
              )
            )}

            {/* Extra Bed */}
            {metapolicyStruct?.extra_bed && metapolicyStruct.extra_bed.length > 0 && (
              renderPolicyList(
                <FontAwesomeIcon icon={faBed} className="h-5 w-5 text-orange-600" />,
                t('policies.extraBed'),
                metapolicyStruct.extra_bed.map((bed, idx) => {
                  const inclusion = formatInclusion(bed.inclusion);
                  return (
                    <div key={idx} className="flex flex-wrap gap-x-2">
                      <span>{bed.amount} {t('policies.available')}</span>
                      {inclusion.isIncluded ? (
                        <span className="text-green-600 font-medium">{t('policies.included')}</span>
                      ) : (
                        <span className="text-orange-600">
                          {getCurrency(bed.currency)} {bed.price} {formatPriceUnit(bed.price_unit)}
                        </span>
                      )}
                    </div>
                  );
                })
              )
            )}

            {/* Internet / WiFi */}
            {metapolicyStruct?.internet && metapolicyStruct.internet.length > 0 && (
              renderPolicyList(
                <WifiIcon className="h-5 w-5 text-orange-600" />,
                t('policies.internetWifi'),
                metapolicyStruct.internet.map((net, idx) => {
                  const inclusion = formatInclusion(net.inclusion);
                  return (
                    <div key={idx} className="flex flex-wrap gap-x-2">
                      <span className="capitalize">{net.work_area !== 'unspecified' ? net.work_area : t('policies.property')}</span>
                      {inclusion.isIncluded ? (
                        <span className="text-green-600 font-medium">{t('policies.free')}</span>
                      ) : (
                        <span className="text-orange-600">
                          {getCurrency(net.currency)} {net.price} {formatPriceUnit(net.price_unit)}
                        </span>
                      )}
                    </div>
                  );
                })
              )
            )}

            {/* Meals */}
            {metapolicyStruct?.meal && metapolicyStruct.meal.length > 0 && (
              renderPolicyList(
                <FontAwesomeIcon icon={faUtensils} className="h-5 w-5 text-orange-600" />,
                t('policies.meals'),
                metapolicyStruct.meal.map((meal, idx) => {
                  const inclusion = formatInclusion(meal.inclusion);
                  return (
                    <div key={idx} className="flex flex-wrap gap-x-2">
                      <span className="font-medium capitalize">{meal.meal_type}:</span>
                      {inclusion.isIncluded ? (
                        <span className="text-green-600 font-medium">{t('policies.included')}</span>
                      ) : (
                        <span className="text-orange-600">
                          {getCurrency(meal.currency)} {meal.price}
                        </span>
                      )}
                    </div>
                  );
                })
              )
            )}

            {/* Parking */}
            {metapolicyStruct?.parking && metapolicyStruct.parking.length > 0 && (
              renderPolicyList(
                <FontAwesomeIcon icon={faCar} className="h-5 w-5 text-orange-600" />,
                t('policies.parking'),
                metapolicyStruct.parking.map((park, idx) => {
                  const inclusion = formatInclusion(park.inclusion);
                  return (
                    <div key={idx} className="flex flex-wrap gap-x-2">
                      {park.territory_type !== 'unspecified' && (
                        <span className="capitalize">{park.territory_type}</span>
                      )}
                      {inclusion.isIncluded ? (
                        <span className="text-green-600 font-medium">{t('policies.free')}</span>
                      ) : (
                        <span className="text-orange-600">
                          {getCurrency(park.currency)} {park.price} {formatPriceUnit(park.price_unit)}
                        </span>
                      )}
                    </div>
                  );
                })
              )
            )}

            {/* Pets */}
            {metapolicyStruct?.pets && metapolicyStruct.pets.length > 0 && (
              renderPolicyList(
                <FontAwesomeIcon icon={faDog} className="h-5 w-5 text-orange-600" />,
                t('policies.pets'),
                metapolicyStruct.pets.map((pet, idx) => {
                  const inclusion = formatInclusion(pet.inclusion);
                  return (
                    <div key={idx} className="flex flex-wrap gap-x-2">
                      {pet.pets_type !== 'unspecified' && (
                        <span className="capitalize">{pet.pets_type}</span>
                      )}
                      {inclusion.isIncluded ? (
                        <span className="text-green-600 font-medium">{t('policies.petsAllowedFree')}</span>
                      ) : (
                        <span className="text-orange-600">
                          {getCurrency(pet.currency)} {pet.price} {formatPriceUnit(pet.price_unit)}
                        </span>
                      )}
                    </div>
                  );
                })
              )
            )}

            {/* Shuttle Service */}
            {metapolicyStruct?.shuttle && metapolicyStruct.shuttle.length > 0 && (
              renderPolicyList(
                <TruckIcon className="h-5 w-5 text-orange-600" />,
                t('policies.shuttleService'),
                metapolicyStruct.shuttle.map((shuttle, idx) => {
                  const inclusion = formatInclusion(shuttle.inclusion);
                  return (
                    <div key={idx} className="flex flex-wrap gap-x-2">
                      <span className="capitalize">
                        {shuttle.destination_type !== 'unspecified' ? capitalize(shuttle.destination_type) : t('policies.shuttle')}
                      </span>
                      {shuttle.shuttle_type !== 'unspecified' && (
                        <span className="text-gray-500">({capitalize(shuttle.shuttle_type)})</span>
                      )}
                      {inclusion.isIncluded ? (
                        <span className="text-green-600 font-medium">{t('policies.free')}</span>
                      ) : (
                        <span className="text-orange-600">
                          {getCurrency(shuttle.currency)} {shuttle.price}
                        </span>
                      )}
                    </div>
                  );
                })
              )
            )}

            {/* Visa Support */}
            {metapolicyStruct?.visa && (
              renderPolicyItem(
                <GlobeAltIcon className="h-5 w-5 text-orange-600" />,
                t('policies.visaSupport'),
                <span className={metapolicyStruct.visa.visa_support === 'support_enable' ? 'text-green-600' : 'text-gray-600'}>
                  {metapolicyStruct.visa.visa_support === 'support_enable' ? t('policies.visaSupportAvailable') : t('policies.noVisaSupport')}
                </span>
              )
            )}

            {/* No-Show Policy */}
            {metapolicyStruct?.no_show && (
              renderPolicyItem(
                <NoSymbolIcon className="h-5 w-5 text-red-600" />,
                t('policies.noShowPolicy'),
                <span className="text-red-600">
                  {t('policies.noShowChargesApply')}
                  {metapolicyStruct.no_show.time && ` ${t('policies.after')} ${metapolicyStruct.no_show.time}`}
                  {metapolicyStruct.no_show.day_period && metapolicyStruct.no_show.day_period !== 'unspecified' && (
                    ` (${capitalize(metapolicyStruct.no_show.day_period)})`
                  )}
                </span>
              )
            )}
          </div>

          {/* Additional Fees */}
          {metapolicyStruct?.add_fee && metapolicyStruct.add_fee.length > 0 && (
            <div className="mt-4">
              <h5 className="text-sm font-medium text-gray-900 mb-2">{t('policies.additionalFees')}</h5>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="space-y-2">
                  {metapolicyStruct.add_fee.map((fee, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 capitalize">{fee.fee_type?.replace(/_/g, ' ') || t('policies.additionalFee')}</span>
                      <span className="font-medium text-gray-900">
                        {getCurrency(fee.currency)} {fee.amount}
                        {fee.frequency && <span className="text-gray-500"> / {fee.frequency}</span>}
                        {fee.price_unit && <span className="text-gray-500"> {formatPriceUnit(fee.price_unit)}</span>}
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
          <h4 className="text-sm font-semibold text-gray-900">{t('policies.additionalPropertyRules')}</h4>

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

      {/* Policy Struct - Titled Sections with Paragraphs */}
      {hasPolicyStruct && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-900">{t('policies.detailedHotelPolicies')}</h4>

          <div className="space-y-4">
            {policyStruct!.map((section, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <h5 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  {getPolicyIcon(section.title)}
                  <span>{section.title}</span>
                </h5>
                <div className="space-y-2 pl-7">
                  {section.paragraphs.map((paragraph, pIdx) => (
                    <p key={pIdx} className="text-sm text-gray-600 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
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
            <p className="text-sm font-medium text-blue-900">{t('policies.important')}</p>
            <p className="text-xs text-blue-700 mt-1">
              {t('policies.importantNotice')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
