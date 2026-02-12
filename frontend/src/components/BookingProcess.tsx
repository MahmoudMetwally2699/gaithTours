import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarDaysIcon,
  ClockIcon,
  BellIcon,
  CreditCardIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export const BookingProcess: React.FC = () => {
  const { t } = useTranslation();  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: "easeOut"
      }
    }
  };
  const steps = [
    {
      id: 1,
      icon: CalendarDaysIcon,
      titleKey: "bookingProcess.step1.title",
      descriptionKey: "bookingProcess.step1.description",
      color: "from-blue-500 to-cyan-500",
      bgColor: "from-blue-50 to-cyan-50",
      hasSpecialElement: true
    },
    {
      id: 2,
      icon: ClockIcon,
      titleKey: "bookingProcess.step2.title",
      descriptionKey: "bookingProcess.step2.description",
      color: "from-purple-500 to-indigo-500",
      bgColor: "from-purple-50 to-indigo-50",
      hasSpecialElement: false
    },
    {
      id: 3,
      icon: BellIcon,
      titleKey: "bookingProcess.step3.title",
      descriptionKey: "bookingProcess.step3.description",
      color: "from-emerald-500 to-teal-500",
      bgColor: "from-emerald-50 to-teal-50",
      hasSpecialElement: false
    },
    {
      id: 4,
      icon: CreditCardIcon,
      titleKey: "bookingProcess.step4.title",
      descriptionKey: "bookingProcess.step4.description",
      color: "from-orange-500 to-amber-500",
      bgColor: "from-orange-50 to-amber-50",
      hasSpecialElement: false
    }
  ];
  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 via-white to-blue-50" dir="rtl">
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        {/* Modern Title Area */}
        <div
          className="text-center mb-16"
        >
          <div className="relative inline-block">            <h2
              className="text-5xl lg:text-6xl font-black text-black mb-4"
            >
              {t('bookingProcess.title', 'طريقة طلب الحجز')}
            </h2>
            <div
              className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
            />
          </div>          <p
            className="text-xl text-gray-600 mt-6 max-w-2xl mx-auto"
          >
            {t('bookingProcess.subtitle', 'اتبع هذه الخطوات البسيطة لحجز رحلتك المثالية')}
          </p>
        </div>        {/* Modern Steps Grid - Mobile Optimized */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-16">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <div
                key={step.id}
                className="group relative"
              >
                <div className={`relative bg-gradient-to-br ${step.bgColor} rounded-2xl p-3 lg:p-6 shadow-lg hover:shadow-2xl transition-all duration-500 border border-white/20 h-full`}>                  {/* Connecting Line - Hidden on mobile grid */}
                  {index < steps.length - 1 && (
                    <div className="absolute left-1/2 -bottom-6 lg:-bottom-8 transform -translate-x-1/2 w-px h-6 lg:h-8 bg-gradient-to-b from-gray-300 to-transparent hidden lg:block" />
                  )}

                  <div className="flex flex-col items-center text-center space-y-3 lg:space-y-4">
                    {/* Modern Icon Container */}                    <div
                      className={`flex-shrink-0 w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br ${step.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 relative`}
                    >
                      <IconComponent className="w-6 h-6 lg:w-8 lg:h-8 text-white" />

                      {/* Step Number Badge */}
                      <div className="absolute -top-1 -right-1 w-5 h-5 lg:w-6 lg:h-6 bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-100">
                        <span className="text-xs font-bold text-gray-700">{step.id}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 text-center">                      <h3
                        className="text-sm lg:text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors duration-300"
                      >
                        {t(step.titleKey, '')}
                      </h3>

                      <p className="text-gray-600 text-xs lg:text-sm leading-relaxed mb-2 lg:mb-3">
                        {t(step.descriptionKey, '')}
                      </p>

                      {/* Modern Special Element for Step 1 */}
                      {step.hasSpecialElement && (
                        <div
                          className="inline-flex items-center space-x-1 space-x-reverse bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 py-1 lg:px-4 lg:py-2 rounded-full text-xs font-semibold shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                        >
                          <CheckCircleIcon className="w-3 h-3 lg:w-4 lg:h-4" />
                          <span>{t('bookingProcess.bookNow', 'طلب الحجز')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}        </div>
      </div>
    </section>
  );
};
