import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import adminAPI from '../../services/adminAPI';

interface SettingsTabProps {
  bookingApprovalEnabled: boolean;
  onApprovalToggled: (newValue: boolean) => void;
  isRTL: boolean;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  bookingApprovalEnabled,
  onApprovalToggled,
  isRTL,
}) => {
  const { t } = useTranslation(['common', 'admin']);

  // OTP modal state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [pendingValue, setPendingValue] = useState<boolean | null>(null);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCountdown = () => {
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleToggleClick = () => {
    const desiredValue = !bookingApprovalEnabled;
    setPendingValue(desiredValue);
    setOtpCode(['', '', '', '', '', '']);
    setOtpSent(false);
    setShowOtpModal(true);
  };

  const handleRequestOtp = async () => {
    if (pendingValue === null) return;
    try {
      setSendingOtp(true);
      await adminAPI.requestSettingsOtp({
        setting: 'requireBookingApproval',
        desiredValue: pendingValue,
      });
      setOtpSent(true);
      startCountdown();
      toast.success('Verification code sent to contact@gaithtours.com');
      // Focus first input
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to send verification code');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOtpInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpCode];
    newOtp[index] = value.slice(-1);
    setOtpCode(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtpCode(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const handleVerifyOtp = async () => {
    const fullOtp = otpCode.join('');
    if (fullOtp.length < 6) {
      toast.error('Please enter the full 6-digit code');
      return;
    }
    if (pendingValue === null) return;
    try {
      setVerifyingOtp(true);
      await adminAPI.verifySettingsOtp({
        otp: fullOtp,
        setting: 'requireBookingApproval',
        desiredValue: pendingValue,
      });
      onApprovalToggled(pendingValue);
      toast.success(
        pendingValue
          ? 'Booking Approval Mode enabled ✓'
          : 'Direct Booking Mode enabled ✓'
      );
      closeModal();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Invalid or expired code');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const closeModal = () => {
    setShowOtpModal(false);
    setPendingValue(null);
    setOtpCode(['', '', '', '', '', '']);
    setOtpSent(false);
    setCountdown(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const otpFull = otpCode.join('').length === 6;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
          <Cog6ToothIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          <p className="text-sm text-gray-500">System configuration &amp; preferences</p>
        </div>
      </div>

      {/* Section: Booking Behavior */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-amber-50">
          <h3 className="text-sm font-semibold text-orange-700 uppercase tracking-wider flex items-center gap-2">
            <ClipboardDocumentListIcon className="w-4 h-4" />
            Booking Behavior
          </h3>
        </div>
        <div className="p-6">
          {/* Booking Approval Toggle */}
          <div className={`flex items-center justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div
                className={`p-3 rounded-xl transition-all duration-300 ${
                  bookingApprovalEnabled
                    ? 'bg-gradient-to-r from-amber-100 to-orange-100'
                    : 'bg-gray-100'
                }`}
              >
                <ClipboardDocumentListIcon
                  className={`w-6 h-6 transition-colors duration-300 ${
                    bookingApprovalEnabled ? 'text-amber-600' : 'text-gray-400'
                  }`}
                />
              </div>
              <div className={isRTL ? 'text-right' : ''}>
                <h4 className="font-semibold text-gray-900 text-sm">
                  {t('admin:dashboard.settings.bookingApproval', 'Booking Approval Mode')}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  {bookingApprovalEnabled
                    ? t('admin:dashboard.settings.approvalDesc', 'Bookings require admin approval after payment')
                    : t('admin:dashboard.settings.directDesc', 'Bookings are confirmed directly after payment')}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <EnvelopeIcon className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-400">Requires email verification to change</span>
                </div>
              </div>
            </div>

            {/* Toggle */}
            <button
              onClick={handleToggleClick}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                bookingApprovalEnabled
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 focus:ring-amber-400'
                  : 'bg-gray-300 focus:ring-gray-400'
              } cursor-pointer hover:shadow-md`}
              aria-label="Toggle booking approval"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-all duration-300 ${
                  bookingApprovalEnabled
                    ? isRTL ? 'translate-x-1' : 'translate-x-6'
                    : isRTL ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Status badge */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              bookingApprovalEnabled
                ? 'bg-amber-100 text-amber-700'
                : 'bg-green-100 text-green-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${bookingApprovalEnabled ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
              {bookingApprovalEnabled ? 'Approval Mode Active' : 'Direct Booking Active'}
            </div>
          </div>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-3">
        <ShieldCheckIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Two-Step Verification</p>
          <p className="text-xs text-blue-600 mt-1">
            Any settings change requires confirmation via a 6-digit code sent to{' '}
            <span className="font-medium">contact@gaithtours.com</span>. This protects against accidental changes.
          </p>
        </div>
      </div>

      {/* ====== OTP MODAL ====== */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-8 text-center relative">
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
              >
                <XMarkIcon className="w-4 h-4 text-white" />
              </button>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <ShieldCheckIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Verify Change</h3>
              <p className="text-orange-100 text-sm mt-1">Security confirmation required</p>
            </div>

            <div className="p-6 space-y-5">
              {/* What's changing */}
              <div className={`rounded-xl p-4 text-center border-2 ${
                pendingValue
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-green-50 border-green-200'
              }`}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Requested Change</p>
                <p className={`font-bold text-sm ${pendingValue ? 'text-amber-700' : 'text-green-700'}`}>
                  {pendingValue
                    ? '🟠 Enable Booking Approval Mode'
                    : '🟢 Enable Direct Booking Mode'}
                </p>
              </div>

              {!otpSent ? (
                /* Step 1 — Request OTP */
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 text-center leading-relaxed">
                    A 6-digit verification code will be sent to:
                    <br />
                    <span className="font-semibold text-gray-800">contact@gaithtours.com</span>
                  </p>
                  <button
                    onClick={handleRequestOtp}
                    disabled={sendingOtp}
                    className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {sendingOtp ? (
                      <>
                        <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Sending Code...
                      </>
                    ) : (
                      <>
                        <EnvelopeIcon className="w-4 h-4" />
                        Send Verification Code
                      </>
                    )}
                  </button>
                  <button onClick={closeModal} className="w-full py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                    Cancel
                  </button>
                </div>
              ) : (
                /* Step 2 — Enter OTP */
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 text-center">
                    Code sent to <span className="font-semibold">contact@gaithtours.com</span>
                    <br />
                    <span className="text-xs text-gray-400">Check your inbox and enter the 6-digit code below</span>
                  </p>

                  {/* OTP Inputs */}
                  <div className="flex gap-2 justify-center">
                    {otpCode.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpInput(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)}
                        onPaste={i === 0 ? handleOtpPaste : undefined}
                        className="w-11 h-14 text-center text-xl font-bold border-2 rounded-xl focus:outline-none focus:border-orange-500 transition-colors bg-orange-50 text-gray-900"
                        style={{ borderColor: digit ? '#f97316' : '#e5e7eb' }}
                      />
                    ))}
                  </div>

                  {/* Verify button */}
                  <button
                    onClick={handleVerifyOtp}
                    disabled={!otpFull || verifyingOtp}
                    className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {verifyingOtp ? (
                      <>
                        <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Verifying...
                      </>
                    ) : (
                      <>
                        <ShieldCheckIcon className="w-4 h-4" />
                        Confirm Change
                      </>
                    )}
                  </button>

                  {/* Resend */}
                  <div className="text-center">
                    {countdown > 0 ? (
                      <p className="text-xs text-gray-400">Resend available in {countdown}s</p>
                    ) : (
                      <button
                        onClick={handleRequestOtp}
                        disabled={sendingOtp}
                        className="text-xs text-orange-600 hover:text-orange-700 font-medium underline disabled:opacity-50"
                      >
                        Resend code
                      </button>
                    )}
                  </div>

                  <button onClick={closeModal} className="w-full py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsTab;
