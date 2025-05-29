import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

export const Footer: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const socialLinks = [
    { name: 'Facebook', href: '#', icon: '📘' },
    { name: 'Instagram', href: '#', icon: '📷' },
    { name: 'Twitter', href: '#', icon: '🐦' },
    { name: 'WhatsApp', href: '#', icon: '💬' },
  ];

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">          {/* Company Info */}
          <div className="space-y-4">
            <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3`}>
              <img
                src="/logo-no-background.png"
                alt={t('brand.name')}
                className="h-8 w-auto"
              />
              <h3 className="text-lg font-semibold">{t('brand.name')}</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              {t('footer.description')}
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="text-2xl hover:text-primary-400 transition-colors duration-200"
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link
                  to="/hotels"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  {t('nav.hotels')}
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  {t('footer.about')}
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  {t('footer.contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('footer.services')}</h3>
            <ul className="space-y-2 text-gray-300">
              <li>{t('footer.hotelBooking')}</li>
              <li>{t('footer.travelPackages')}</li>
              <li>{t('footer.groupTours')}</li>
              <li>{t('footer.customItineraries')}</li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('footer.contactInfo')}</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <MapPinIcon className="h-5 w-5 text-primary-400 mt-0.5 flex-shrink-0" />
                <div className="text-gray-300 text-sm">
                  <p>{t('footer.address.line1')}</p>
                  <p>{t('footer.address.line2')}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <PhoneIcon className="h-5 w-5 text-primary-400 flex-shrink-0" />
                <span className="text-gray-300 text-sm">+962 6 1234567</span>
              </div>

              <div className="flex items-center space-x-3">
                <EnvelopeIcon className="h-5 w-5 text-primary-400 flex-shrink-0" />
                <span className="text-gray-300 text-sm">info@gaithtours.com</span>
              </div>

              <div className="flex items-center space-x-3">
                <GlobeAltIcon className="h-5 w-5 text-primary-400 flex-shrink-0" />
                <span className="text-gray-300 text-sm">www.gaithtours.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} {t('brand.name')}. {t('footer.rights')}
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link
                to="/privacy"
                className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
              >
                {t('footer.privacy')}
              </Link>
              <Link
                to="/terms"
                className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
              >
                {t('footer.terms')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
