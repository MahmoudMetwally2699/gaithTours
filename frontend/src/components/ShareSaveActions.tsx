import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShareIcon,
  HeartIcon,
  LinkIcon,
  EnvelopeIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

interface ShareSaveActionsProps {
  hotelId: string;
  hotelName: string;
  hotelImage?: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export const ShareSaveActions: React.FC<ShareSaveActionsProps> = ({
  hotelId,
  hotelName,
  hotelImage,
  isFavorite,
  onToggleFavorite
}) => {
  const { t } = useTranslation();
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const currentUrl = window.location.href;
  const shareText = `Check out ${hotelName} on Gaith Tours!`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${currentUrl}`)}`;
    window.open(whatsappUrl, '_blank');
    setShowShareMenu(false);
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Check out ${hotelName}`);
    const body = encodeURIComponent(`Hi,\n\nI found this great hotel and thought you might be interested:\n\n${hotelName}\n${currentUrl}\n\nBest regards`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setShowShareMenu(false);
  };

  const handleToggleFavorite = () => {
    onToggleFavorite();
    setShowSaveConfirm(true);
    setTimeout(() => setShowSaveConfirm(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Save/Favorite Button */}
      <button
        onClick={handleToggleFavorite}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
          isFavorite
            ? 'bg-red-50 border-red-200 text-red-600'
            : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300'
        }`}
      >
        {isFavorite ? (
          <HeartIconSolid className="w-5 h-5 text-red-500" />
        ) : (
          <HeartIcon className="w-5 h-5" />
        )}
        <span className="text-sm font-medium">
          {isFavorite ? t('hotels.saved', 'Saved') : t('hotels.save', 'Save')}
        </span>
      </button>

      {/* Share Button */}
      <div className="relative">
        <button
          onClick={() => setShowShareMenu(!showShareMenu)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-orange-300 transition-all"
        >
          <ShareIcon className="w-5 h-5" />
          <span className="text-sm font-medium">{t('hotels.share', 'Share')}</span>
        </button>

        {/* Share Menu Dropdown */}
        {showShareMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowShareMenu(false)}
            />
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              <div className="p-2">
                {/* WhatsApp */}
                <button
                  onClick={handleWhatsAppShare}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-green-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">WhatsApp</span>
                </button>

                {/* Copy Link */}
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    {copied ? (
                      <CheckIcon className="w-4 h-4 text-green-600" />
                    ) : (
                      <LinkIcon className="w-4 h-4 text-gray-600" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {copied ? t('hotels.copied', 'Copied!') : t('hotels.copyLink', 'Copy Link')}
                  </span>
                </button>

                {/* Email */}
                <button
                  onClick={handleEmailShare}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <EnvelopeIcon className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Email</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Save Confirmation Toast */}
      {showSaveConfirm && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-fade-in">
          {isFavorite ? (
            <>
              <HeartIconSolid className="w-5 h-5 text-red-400" />
              <span>{t('hotels.addedToFavorites', 'Added to favorites')}</span>
            </>
          ) : (
            <>
              <XMarkIcon className="w-5 h-5" />
              <span>{t('hotels.removedFromFavorites', 'Removed from favorites')}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Helper interface for favorite hotel data
export interface FavoriteHotel {
  id: string;
  name: string;
  image?: string;
}

// Helper functions for favorites persistence
export const getFavorites = (): string[] => {
  try {
    const favorites = localStorage.getItem('hotel_favorites');
    return favorites ? JSON.parse(favorites) : [];
  } catch {
    return [];
  }
};

// Get favorites with full hotel data (name, image)
export const getFavoritesWithData = (): FavoriteHotel[] => {
  try {
    const favorites = localStorage.getItem('hotel_favorites_data');
    return favorites ? JSON.parse(favorites) : [];
  } catch {
    return [];
  }
};

// Add or remove a hotel from favorites (legacy - just IDs)
export const toggleFavorite = (hotelId: string): boolean => {
  const favorites = getFavorites();
  const index = favorites.indexOf(hotelId);

  if (index === -1) {
    favorites.push(hotelId);
  } else {
    favorites.splice(index, 1);
  }

  localStorage.setItem('hotel_favorites', JSON.stringify(favorites));
  return index === -1; // Returns true if now favorited
};

// Toggle favorite with full hotel data
export const toggleFavoriteWithData = (hotelId: string, hotelName: string, hotelImage?: string): boolean => {
  const favorites = getFavoritesWithData();
  const index = favorites.findIndex(f => f.id === hotelId);

  // Also update legacy favorites list for backwards compatibility
  const legacyFavorites = getFavorites();
  const legacyIndex = legacyFavorites.indexOf(hotelId);

  if (index === -1) {
    favorites.push({ id: hotelId, name: hotelName, image: hotelImage });
    if (legacyIndex === -1) legacyFavorites.push(hotelId);
  } else {
    favorites.splice(index, 1);
    if (legacyIndex !== -1) legacyFavorites.splice(legacyIndex, 1);
  }

  localStorage.setItem('hotel_favorites_data', JSON.stringify(favorites));
  localStorage.setItem('hotel_favorites', JSON.stringify(legacyFavorites));
  return index === -1; // Returns true if now favorited
};

export const isFavorited = (hotelId: string): boolean => {
  return getFavorites().includes(hotelId);
};
