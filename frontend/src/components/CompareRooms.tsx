import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  XMarkIcon,
  CheckIcon,
  CakeIcon,
  ShieldCheckIcon,
  SparklesIcon,
  EyeIcon,
  SunIcon,
  QueueListIcon,
  NoSymbolIcon,
  BuildingOfficeIcon,
  WifiIcon
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';

interface RoomRate {
  match_hash: string;
  room_name: string;
  bed_groups?: any[];
  room_size?: number;
  max_occupancy?: number;
  room_amenities?: string[];
  meal_data?: any;
  price: number;
  original_price?: number;
  currency: string;
  is_free_cancellation?: boolean;
  requires_prepayment?: boolean;
  requires_credit_card?: boolean;
  room_images?: string[];
  daily_prices?: string[];
  total_taxes?: number;
  amenities?: string[];
  meal?: string;
}

interface CompareRoomsProps {
  rooms: RoomRate[];
  onClose: () => void;
  onSelect: (room: RoomRate) => void;
  currencySymbol: string;
}

export const CompareRooms: React.FC<CompareRoomsProps> = ({
  rooms,
  onClose,
  onSelect,
  currencySymbol
}) => {
  const { t } = useTranslation();

  const getMealInfo = (room: RoomRate) => {
    const mealType = room.meal_data?.meal_type || room.meal;
    if (!mealType) return t('compare.roomOnly', 'Room Only');
    const normalized = String(mealType).toLowerCase();

    if (normalized.includes('breakfast') && normalized.includes('dinner')) return t('compare.halfBoard', 'Half Board');
    if (normalized.includes('breakfast') && normalized.includes('lunch') && normalized.includes('dinner')) return t('compare.fullBoard', 'Full Board');

    if (normalized === 'breakfast' || normalized.includes('breakfast')) return t('compare.breakfastIncluded', 'Breakfast Included');
    if (normalized === 'half-board' || normalized.includes('half')) return t('compare.halfBoard', 'Half Board');
    if (normalized === 'full-board' || normalized.includes('full')) return t('compare.fullBoard', 'Full Board');
    if (normalized === 'all-inclusive' || normalized.includes('all')) return t('compare.allInclusive', 'All Inclusive');
    if (normalized === 'dinner' || normalized.includes('dinner')) return t('compare.dinnerIncluded', 'Dinner Included');

    if (room.meal_data?.has_breakfast) return t('compare.breakfastIncluded', 'Breakfast Included');
    return t('compare.roomOnly', 'Room Only');
  };

  const getBeddingInfo = (room: RoomRate) => {
    if (room.bed_groups && room.bed_groups.length > 0) {
      const group = room.bed_groups[0];
      if (group && group.bed_types && group.bed_types.length > 0) {
        return group.bed_types.map((b: any) => `${b.quantity} x ${b.name}`).join(', ');
      }
    }
    const name = room.room_name.toLowerCase();
    if (name.includes('triple')) return t('compare.beds.3', '3 Beds / Triple');
    if (name.includes('quad')) return t('compare.beds.4', '4 Beds / Quadruple');
    if (name.includes('family')) return t('compare.beds.family', 'Family Beds');
    if (name.includes('twin')) return t('compare.beds.2', '2 Twin Beds');
    if (name.includes('double')) return t('compare.beds.double', '1 Double Bed');
    if (name.includes('king')) return t('compare.beds.king', '1 King Bed');
    if (name.includes('queen')) return t('compare.beds.queen', '1 Queen Bed');
    if (name.includes('single')) return t('compare.beds.1', '1 Single Bed');
    if (name.includes('studio')) return t('compare.beds.studio', 'Studio');
    return '-';
  };

  const getViewInfoRaw = (room: RoomRate): string => {
    const allAmenities = [...(room.room_amenities || []), ...(room.amenities || [])];
    const text = (room.room_name + ' ' + allAmenities.join(' ')).toLowerCase();

    if (text.includes('haram')) return 'haram';
    if (text.includes('kaaba')) return 'kaaba';
    if (text.includes('sea') || text.includes('ocean')) return 'sea';
    if (text.includes('city')) return 'city';
    if (text.includes('pool')) return 'pool';
    if (text.includes('garden')) return 'garden';
    if (text.includes('mountain')) return 'mountain';
    if (text.includes('landmark')) return 'landmark';
    if (text.includes('courtyard')) return 'courtyard';
    if (text.includes('street')) return 'street';
    return '-';
  };

  const renderViewInfo = (room: RoomRate) => {
    const viewType = getViewInfoRaw(room);
    const viewLabels: Record<string, string> = {
      haram: t('compare.haramView', 'Haram View'),
      kaaba: t('compare.kaabaView', 'Kaaba View'),
      sea: t('compare.seaView', 'Sea View'),
      city: t('compare.cityView', 'City View'),
      pool: t('compare.poolView', 'Pool View'),
      garden: t('compare.gardenView', 'Garden View'),
      mountain: t('compare.mountainView', 'Mountain View'),
      landmark: t('compare.landmarkView', 'Landmark View'),
      courtyard: t('compare.courtyardView', 'Courtyard View'),
      street: t('compare.streetView', 'Street View')
    };

    if (viewType === 'haram' || viewType === 'kaaba') {
      return <span className="font-semibold text-amber-600 flex items-center gap-1.5"><SparklesIcon className="w-4 h-4"/> {viewLabels[viewType]}</span>;
    }
    return viewLabels[viewType] || '-';
  };

  const hasBalcony = (room: RoomRate) => {
     const allAmenities = [...(room.room_amenities || []), ...(room.amenities || [])];
     const text = (room.room_name + ' ' + allAmenities.join(' ')).toLowerCase();
     return text.includes('balcony') || text.includes('terrace') || text.includes('patio') || text.includes('veranda');
  };

  const getSmokingInfo = (room: RoomRate) => {
     const allAmenities = [...(room.room_amenities || []), ...(room.amenities || [])].map(a => a.toLowerCase());
     if (allAmenities.includes('non-smoking')) return t('compare.nonSmoking', 'Non-Smoking');
     if (allAmenities.includes('smoking')) return t('compare.smoking', 'Smoking Allowed');
     return '-';
  };

  const allFeatures = [
    { key: 'price', label: t('compare.price', 'Total Price'), icon: null, alwaysShow: true },
    { key: 'meal', label: t('compare.mealPlan', 'Meal Plan'), icon: CakeIcon, alwaysShow: true },
    { key: 'cancellation', label: t('compare.cancellation', 'Cancellation'), icon: ShieldCheckIcon, alwaysShow: true },
    { key: 'bedding', label: t('compare.bedding', 'Bed Configuration'), icon: QueueListIcon, check: (r: RoomRate) => getBeddingInfo(r) !== '-' },
    { key: 'view', label: t('compare.view', 'View'), icon: EyeIcon, check: (r: RoomRate) => getViewInfoRaw(r) !== '-' },
    { key: 'balcony', label: t('compare.balcony', 'Balcony'), icon: SunIcon, check: (r: RoomRate) => hasBalcony(r) },
    { key: 'smoking', label: t('compare.smoking', 'Smoking Policy'), icon: NoSymbolIcon, check: (r: RoomRate) => getSmokingInfo(r) !== '-' },
  ];

  const features = allFeatures.filter(f => f.alwaysShow || rooms.some(r => f.check?.(r)));

  const getBestValue = (key: string) => {
    if (key === 'price') return Math.min(...rooms.map(r => r.price));
    return null;
  };

  const isBestValue = (room: RoomRate, key: string) => {
    const best = getBestValue(key);
    return best !== null && room.price === best && key === 'price';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white sm:rounded-2xl shadow-2xl w-full max-w-5xl h-full sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-white z-20">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BuildingOfficeIcon className="w-6 h-6 text-orange-600" />
              {t('compare.compareRooms', 'Compare Rooms')}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{t('compare.comparingOptions', { count: rooms.length })}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content Container - Scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/50">
          <div className="p-4 sm:p-6 pb-24 sm:pb-6">

                  {/* Grid Layout Container */}
                  <div className="min-w-0">

                    {/* Header Row */}
                     <div className="md:grid flex gap-4 md:gap-0" style={{ gridTemplateColumns: `200px repeat(${rooms.length}, 1fr)` }}>
                        {/* Desktop Spacer */}
                        <div className="hidden md:block p-4"></div>

                        {/* Room Headers */}
                        {rooms.map((room) => (
                          <div key={room.match_hash} className="flex-1 min-w-0 p-2 md:p-4 text-center">
                              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-200 shadow-sm group mb-3">
                                {room.room_images?.[0] ? (
                                  <img
                                    src={room.room_images[0]}
                                    alt={room.room_name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100">
                                    <BuildingOfficeIcon className="w-10 h-10 mb-2 opacity-20"/>
                                    <span className="text-xs font-medium">No Image</span>
                                  </div>
                                )}
                                {isBestValue(room, 'price') && (
                                  <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg uppercase tracking-wider">
                                    {t('common:hotels.bestPrice', 'Best')}
                                  </div>
                                )}
                              </div>
                              <h3 className="font-bold text-gray-900 text-sm md:text-lg leading-snug line-clamp-2 md:line-clamp-none" title={room.room_name}>
                                {room.room_name}
                              </h3>
                          </div>
                        ))}
                     </div>

                    {/* Feature Rows */}
                    <div className="divide-y divide-gray-100">
                      {features.map((feature) => (
                        <div
                          key={feature.key}
                          className="flex flex-col md:grid py-3 md:py-0 transition-colors hover:bg-gray-50/50"
                          style={{ gridTemplateColumns: `200px repeat(${rooms.length}, 1fr)` }} // Only applies on desktop via @media usually, but inline styles are powerful. We need to reset this on mobile or use `md:grid` with a class for columns.
                          // Better approach: use `md:grid` and inline variable or class.
                          // Tailwind arbitrary values works for `md:grid-cols-[200px_repeat(N,1fr)]` but dynamic N is tricky.
                          // Let's use the style prop but restrict it to desktop if possible or override on mobile.
                          // Actually, on mobile `display: flex` overrides `grid-template-columns` so it's safe to leave the style if we toggle display.
                        >
                          {/* Label - Full width on mobile, Col 1 on desktop */}
                          <div className="flex items-center gap-2 px-2 md:p-4 md:border-r border-transparent md:border-gray-50 mb-2 md:mb-0">
                             {feature.icon && <feature.icon className="w-5 h-5 text-gray-400 shrink-0" />}
                             <span className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wide">{feature.label}</span>
                          </div>

                          {/* Values Container - Side-by-side grid on mobile, Contents on desktop */}
                          {/* We use a grid on mobile to put rooms side-by-side */}
                          {/* Values Container - Side-by-side grid on mobile, Contents on desktop */}
                          {/* We use a grid on mobile to put rooms side-by-side */}
                          <div
                            className="grid md:contents gap-4 md:gap-0 px-2 md:px-0"
                            style={{ gridTemplateColumns: `repeat(${rooms.length}, 1fr)` }}
                          >
                              {rooms.map((room) => (
                                <div
                                  key={`${room.match_hash}-${feature.key}`}
                                  className={`md:p-4 text-center flex items-center justify-center md:border-l border-transparent md:border-gray-50 ${
                                     isBestValue(room, feature.key) && feature.key === 'price' ? 'relative' : ''
                                  }`}
                                >
                                  {/* Content Rendering */}
                                  {feature.key === 'price' ? (
                                    <div className="flex flex-col items-center w-full min-w-0">
                                       <div className="flex items-baseline gap-1 flex-wrap justify-center">
                                          <span className="text-lg md:text-2xl font-bold text-gray-900 truncate max-w-full font-price">{currencySymbol}{room.price.toLocaleString()}</span>
                                          {room.original_price && room.original_price > room.price && (
                                             <span className="text-xs md:text-sm text-gray-400 line-through decoration-gray-300 truncate max-w-full font-price">{currencySymbol}{room.original_price.toLocaleString()}</span>
                                          )}
                                       </div>
                                       {(room.total_taxes || 0) > 0 && (
                                          <span className="text-[10px] md:text-xs text-gray-500 mt-1 truncate max-w-full">
                                            + {currencySymbol}{Math.round(room.total_taxes || 0).toLocaleString()} {t('common:hotels.taxesAndFees', 'taxes')}
                                          </span>
                                       )}
                                    </div>
                                  ) : feature.key === 'cancellation' ? (
                                    room.is_free_cancellation ? (
                                       <div className="bg-green-50 text-green-700 px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-xs md:text-sm font-medium flex items-center justify-center gap-1.5 w-full">
                                          <CheckIcon className="w-3 h-3 md:w-4 md:h-4 shrink-0"/>
                                          <span className="truncate">{t('compare.freeCancellation', 'Free')}</span>
                                       </div>
                                    ) : (
                                       <div className="bg-red-50 text-red-600 px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-xs md:text-sm font-medium w-full text-center">
                                          <span className="truncate block">{t('compare.nonRefundable', 'Non-Ref')}</span>
                                        </div>
                                    )
                                  ) : feature.key === 'balcony' ? (
                                    hasBalcony(room) ? (
                                      <div className="flex items-center gap-1.5 text-gray-700 font-medium text-sm">
                                        <CheckIcon className="w-4 h-4 text-green-500"/>
                                        {t('compare.yes', 'Yes')}
                                      </div>
                                    ) : <span className="text-gray-400 text-sm">-</span>
                                  ) : (
                                    <span className={`text-sm font-medium text-center break-words w-full ${feature.key === 'meal' ? 'text-gray-900' : 'text-gray-600'}`}>
                                      {feature.key === 'meal' ? getMealInfo(room) :
                                       feature.key === 'bedding' ? getBeddingInfo(room) :
                                       feature.key === 'view' ? renderViewInfo(room) :
                                       feature.key === 'smoking' ? getSmokingInfo(room) : '-'}
                                    </span>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}

                       {/* Amenities Row */}
                       <div className="flex flex-col md:grid py-3 md:py-0" style={{ gridTemplateColumns: `200px repeat(${rooms.length}, 1fr)` }}>
                          <div className="flex items-center gap-2 px-2 md:p-4 md:border-r border-transparent md:border-gray-50 mb-2 md:mb-0">
                              <WifiIcon className="w-5 h-5 text-gray-400 shrink-0" />
                              <span className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wide">{t('compare.amenities', 'Amenities')}</span>
                          </div>
                          <div
                             className="grid md:contents gap-4 md:gap-0 px-2 md:px-0"
                             style={{ gridTemplateColumns: `repeat(${rooms.length}, 1fr)` }}
                          >
                            {rooms.map((room) => (
                               <div key={`amenities-${room.match_hash}`} className="md:p-4 md:border-l border-transparent md:border-gray-50 flex justify-center">
                                 <div className="flex flex-wrap gap-1.5 content-start justify-center">
                                    {(room.room_amenities?.slice(0, 4) || []).map((amenity, i) => (
                                       <span key={i} className="text-[10px] md:text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
                                         {amenity}
                                       </span>
                                    ))}
                                    {(room.room_amenities?.length || 0) > 4 && (
                                       <span className="text-[10px] md:text-xs font-medium text-gray-500 px-1 py-1">
                                         +{(room.room_amenities?.length || 0) - 4}
                                       </span>
                                    )}
                                 </div>
                               </div>
                            ))}
                          </div>
                      </div>

                       {/* Action Buttons Row */}
                       <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 z-10 md:static md:p-0 md:border-t-0 md:bg-transparent">
                          {/* Use flex for simpler mobile distribution or grid for strictness. Grid logic matches above. */}
                          <div className="md:grid flex gap-4 md:gap-0" style={{ gridTemplateColumns: `200px repeat(${rooms.length}, 1fr)` }}>
                             <div className="hidden md:block"></div>
                             {rooms.map((room) => (
                                <div key={`action-${room.match_hash}`} className="flex-1 md:p-4 md:border-l border-transparent md:border-gray-50 min-w-0">
                                   <button
                                      onClick={() => onSelect(room)}
                                      className="w-full py-3 px-2 bg-gray-900 hover:bg-orange-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all transform active:scale-95 flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 text-sm md:text-base truncate"
                                    >
                                      <span>{t('compare.select', 'Select')}</span>
                                      <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] md:text-xs font-price">
                                         {currencySymbol}{room.price.toLocaleString()}
                                      </span>
                                   </button>
                                </div>
                             ))}
                          </div>
                       </div>

                    </div>
                  </div>
      </div>
     </div>
    </div>
   </div>
  );
};
