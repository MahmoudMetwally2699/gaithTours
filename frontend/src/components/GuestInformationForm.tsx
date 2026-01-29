import React from 'react';
import { useTranslation } from 'react-i18next';

export interface GuestFormData {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  phoneCode: string;
  phone: string;
  bookingFor: 'self' | 'other';
  specialRequests: string;
}

interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

interface GuestInformationFormProps {
  formData: GuestFormData;
  onChange: (data: Partial<GuestFormData>) => void;
  errors: ValidationErrors;
}

const countries = [
  { code: 'EG', name: 'Egypt', phoneCode: '+20' },
  { code: 'US', name: 'United States', phoneCode: '+1' },
  { code: 'GB', name: 'United Kingdom', phoneCode: '+44' },
  { code: 'SA', name: 'Saudi Arabia', phoneCode: '+966' },
  { code: 'AE', name: 'United Arab Emirates', phoneCode: '+971' },
  { code: 'DE', name: 'Germany', phoneCode: '+49' },
  { code: 'FR', name: 'France', phoneCode: '+33' },
  { code: 'IT', name: 'Italy', phoneCode: '+39' },
  { code: 'ES', name: 'Spain', phoneCode: '+34' },
];

export const GuestInformationForm: React.FC<GuestInformationFormProps> = ({
  formData,
  onChange,
  errors
}) => {
  const { t } = useTranslation(['common', 'booking']);

  const handleCountryChange = (countryCode: string) => {
    const country = countries.find(c => c.code === countryCode);
    onChange({
      country: countryCode,
      phoneCode: country?.phoneCode || '+20'
    });
  };

  return (
    <div className="space-y-6">
      {/* Guest Information Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {t('booking:guestInformation', 'Guest Information')}
        </h2>

        <div className="bg-orange-50 border border-orange-200 rounded p-4 mb-6">
          <p className="text-sm text-orange-800 font-medium">
            {t('booking:almostDone', 'Almost done! Just fill in the required info')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('booking:firstName', 'First Name')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => onChange({ firstName: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                errors.firstName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={t('booking:firstNamePlaceholder', 'Enter first name')}
            />
            {errors.firstName && (
              <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('booking:lastName', 'Last Name')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => onChange({ lastName: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                errors.lastName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={t('booking:lastNamePlaceholder', 'Enter last name')}
            />
            {errors.lastName && (
              <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('booking:email', 'Email Address')} <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => onChange({ email: e.target.value })}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="example@email.com"
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {t('booking:confirmationEmail', 'Confirmation email will be sent to this address')}
          </p>
        </div>

        {/* Country/Region */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('booking:country', 'Country/Region')}
          </label>
          <select
            value={formData.country}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {t('booking:countries.' + country.code, country.name)}
              </option>
            ))}
          </select>
        </div>

        {/* Phone Number */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('booking:phone', 'Phone Number')}
          </label>
          <div className="flex gap-2">
            <select
              value={formData.phoneCode}
              onChange={(e) => onChange({ phoneCode: e.target.value })}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {countries.map((country) => (
                <option key={country.code} value={country.phoneCode}>
                  {country.phoneCode}
                </option>
              ))}
            </select>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="1234567890"
            />
          </div>
          {errors.phone && (
            <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {t('booking:phoneHelp', 'Needed by the property to validate your booking')}
          </p>
        </div>
      </div>

      {/* Who are you booking for? */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('booking:whoBookingFor', 'Who are you booking for?')}
        </h3>

        <div className="space-y-3">
          <label className="flex items-start cursor-pointer">
            <input
              type="radio"
              name="bookingFor"
              value="self"
              checked={formData.bookingFor === 'self'}
              onChange={(e) => onChange({ bookingFor: e.target.value as 'self' | 'other' })}
              className="mt-1 mr-3"
            />
            <div>
              <div className="font-medium text-gray-900">
                {t('booking:imMainGuest', "I'm the main guest")}
              </div>
            </div>
          </label>

          <label className="flex items-start cursor-pointer">
            <input
              type="radio"
              name="bookingFor"
              value="other"
              checked={formData.bookingFor === 'other'}
              onChange={(e) => onChange({ bookingFor: e.target.value as 'self' | 'other' })}
              className="mt-1 mr-3"
            />
            <div>
              <div className="font-medium text-gray-900">
                {t('booking:bookingForSomeone', "I'm booking for someone else")}
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Special Requests */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {t('booking:specialRequests', 'Special Requests')}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {t('booking:specialRequestsNote', 'Special requests cannot be guaranteed – but the property will do its best to meet your needs.')}
        </p>

        <textarea
          value={formData.specialRequests}
          onChange={(e) => onChange({ specialRequests: e.target.value })}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder={t('booking:specialRequestsPlaceholder', 'Please write your requests in English or Arabic (optional)')}
        />
      </div>
    </div>
  );
};
