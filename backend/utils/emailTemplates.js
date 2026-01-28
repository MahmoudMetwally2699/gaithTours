const getBookingConfirmationTemplate = (data) => {
  const {
    reservation,
    touristName,
    email,
    phone,
    nationality,
    expectedCheckInTime,
    roomType,
    stayType,
    paymentMethod,
    numberOfGuests,
    guests,
    hotel,
    checkInDate,
    checkOutDate,
    notes,
    totalAmount, // Assuming this might be passed or calculated
    taxes // Assuming this might be passed
  } = data;

  // Helper date formatter
  const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };
    if (includeTime) {
      return date.toLocaleString('en-US', { ...options, hour: 'numeric', minute: 'numeric', hour12: true });
    }
    return date.toLocaleDateString('en-US', options);
  };

  const checkInDisplay = `${formatDate(checkInDate)} (3:00 PM)`;
  const checkOutDisplay = `${formatDate(checkOutDate)} (11:00 AM)`;

  // Calculate nights
  const start = new Date(checkInDate);
  const end = new Date(checkOutDate);
  const nights = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) || 1;

  // Price formatting (Mock logic if exact pricing details aren't in reservation object)
  // In a real scenario, we'd expect the breakdown to be in the 'reservation' or 'payment' object.
  // Using placeholders or passed values.
  const nightRate = hotel.price || 0;
  const subtotal = nightRate * nights;
  const taxAmount = taxes || (subtotal * 0.15); // Approximating 15% tax if not provided
  const grandTotal = totalAmount || (subtotal + taxAmount);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Confirmation</title>
    <!--[if mso]>
    <noscript>
    <xml>
    <o:OfficeDocumentSettings>
    <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
    </xml>
    </noscript>
    <![endif]-->
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        body { margin: 0; padding: 0; min-width: 100%; background-color: #FAFAFA; font-family: 'Plus Jakarta Sans', Arial, sans-serif; -webkit-font-smoothing: antialiased; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #FAFAFA; padding-bottom: 40px; }
        .main-table { background-color: #FFFFFF; margin: 0 auto; width: 100%; max-width: 680px; border-spacing: 0; font-family: 'Plus Jakarta Sans', Arial, sans-serif; color: #1F2937; }

        /* Utility */
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: 700; }
        .text-orange { color: #F97316; }
        .bg-orange { background-color: #F97316; }

        /* Mobile */
        @media screen and (max-width: 600px) {
            .column-stack { display: block !important; width: 100% !important; max-width: 100% !important; padding-bottom: 20px; }
            .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
            .mobile-center { text-align: center !important; }
        }
    </style>
</head>
<body>
    <center class="wrapper">
        <table class="main-table" role="presentation">

            <!-- Top Bar -->
            <tr>
                <td style="padding: 20px 40px; border-bottom: 1px solid #F3F4F6;">
                    <table width="100%" role="presentation">
                        <tr>
                            <td align="left">
                                <img src="https://gaith-tours-api.vercel.app/public/logo.png" alt="Gaith Tours" width="100" style="display: block; border: 0;">
                            </td>
                            <td align="right">
                                <a href="#" style="color: #F97316; text-decoration: none; font-size: 13px; font-weight: 600; background: #FFF7ED; padding: 8px 16px; border-radius: 6px;">View in Browser</a>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>

            <!-- Hero Image with Overlay -->
            <tr>
                <td style="padding: 20px 20px 0 20px;">
                    <div style="background-image: url('${hotel.image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'}'); background-size: cover; background-position: center; border-radius: 12px 12px 0 0; height: 300px; position: relative; overflow: hidden;">
                        <!-- Dark Gradient Overlay -->
                        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 100%);"></div>

                        <!-- Logo in Center (Optional as per design) -->
                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
                            <img src="https://gaith-tours-api.vercel.app/public/logo-white.png" alt="Gaith Tours" width="180" style="display: block; opacity: 0.9;">
                        </div>

                        <!-- Booking Confirmed Badge -->
                        <div style="position: absolute; bottom: 30px; left: 30px;">
                            <div style="background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.3); padding: 12px 24px; border-radius: 8px; display: inline-flex; align-items: center;">
                                <span style="color: #fff; font-size: 18px; font-weight: 700; letter-spacing: 0.5px;">✓ Booking Confirmed</span>
                            </div>
                        </div>
                    </div>
                    <!-- Orange Bar at bottom of hero -->
                    <div style="height: 6px; background-color: #F97316; border-radius: 0 0 12px 12px; margin-bottom: 30px;"></div>
                </td>
            </tr>

            <!-- Main Greeting -->
            <tr>
                <td style="padding: 0 40px 30px 40px; text-align: center;">
                    <h1 style="font-size: 24px; font-weight: 800; color: #111827; margin: 0 0 10px 0; line-height: 1.4;">
                        Hi ${touristName.split(' ')[0]}, your stay at <span style="color: #F97316;">${hotel.name}</span> is confirmed!
                    </h1>
                    <p style="color: #6B7280; font-size: 16px; margin: 0; line-height: 1.6;">
                        We're excited to host you. Pack your bags for an unforgettable experience in ${hotel.city}.
                    </p>
                </td>
            </tr>

            <!-- Hotel Card -->
            <tr>
                <td style="padding: 0 40px 30px 40px;">
                    <div style="background-color: #F9FAFB; border-radius: 12px; padding: 24px; border: 1px solid #F3F4F6;">
                        <table width="100%" role="presentation">
                            <tr>
                                <td width="120" valign="top" class="column-stack">
                                    <img src="${hotel.image || 'https://via.placeholder.com/150'}" alt="Hotel" width="120" height="120" style="border-radius: 8px; object-fit: cover; display: block;">
                                </td>
                                <td style="padding-left: 20px;" valign="top" class="column-stack mobile-padding">
                                    <div style="margin-bottom: 8px;">
                                        <span style="background-color: #F97316; color: #fff; font-size: 10px; font-weight: 700; padding: 4px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Upcoming Stay</span>
                                        <span style="color: #6B7280; font-size: 12px; margin-left: 8px;">Reservation ID: #${reservation._id.toString().slice(-8).toUpperCase()}</span>
                                    </div>
                                    <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #111827;">${hotel.name}</h3>
                                    <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 13px; display: flex; align-items: center;">
                                        📍 ${hotel.address}
                                    </p>
                                    <p style="margin: 0; color: #6B7280; font-size: 13px;">
                                        🏷️ Conf. Code: <strong>GP-X${Math.floor(Math.random() * 1000)}-2025</strong>
                                    </p>
                                </td>
                                <td align="center" valign="bottom" class="column-stack" style="padding-top: 20px;">
                                    <a href="${process.env.FRONTEND_URL}/bookings/${reservation._id}" style="background-color: #F97316; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block; white-space: nowrap;">Manage Booking</a>
                                </td>
                            </tr>
                        </table>
                    </div>
                </td>
            </tr>

            <!-- Details Grid -->
            <tr>
                <td style="padding: 0 40px 30px 40px;">
                    <table width="100%" role="presentation" style="border-top: 1px solid #F3F4F6; border-bottom: 1px solid #F3F4F6;">
                        <tr>
                            <td width="50%" style="padding: 24px 10px 24px 0; border-bottom: 1px solid #F3F4F6; border-right: 1px solid #F3F4F6;">
                                <table role="presentation">
                                    <tr>
                                        <td style="padding-right: 12px;"><span style="font-size: 20px; background: #FFF7ED; color: #F97316; padding: 8px; border-radius: 50%;">login</span></td> <!-- Using emoji or icon here essentially -->
                                        <td>
                                            <div style="font-size: 11px; color: #6B7280; font-weight: 700; text-transform: uppercase;">Check-in</div>
                                            <div style="font-size: 14px; color: #111827; font-weight: 600;">${checkInDisplay}</div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                            <td width="50%" style="padding: 24px 0 24px 24px; border-bottom: 1px solid #F3F4F6;">
                                <table role="presentation">
                                    <tr>
                                        <td style="padding-right: 12px;"><span style="font-size: 20px; background: #FFF7ED; color: #F97316; padding: 8px; border-radius: 50%;">logout</span></td>
                                        <td>
                                            <div style="font-size: 11px; color: #6B7280; font-weight: 700; text-transform: uppercase;">Check-out</div>
                                            <div style="font-size: 14px; color: #111827; font-weight: 600;">${checkOutDisplay}</div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td width="50%" style="padding: 24px 10px 24px 0; border-right: 1px solid #F3F4F6;">
                                <table role="presentation">
                                    <tr>
                                        <td style="padding-right: 12px;"><span style="font-size: 20px; background: #FFF7ED; color: #F97316; padding: 8px; border-radius: 50%;">bed</span></td>
                                        <td>
                                            <div style="font-size: 11px; color: #6B7280; font-weight: 700; text-transform: uppercase;">Room Type</div>
                                            <div style="font-size: 14px; color: #111827; font-weight: 600;">${roomType} (${stayType})</div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                            <td width="50%" style="padding: 24px 0 24px 24px;">
                                <table role="presentation">
                                    <tr>
                                        <td style="padding-right: 12px;"><span style="font-size: 20px; background: #FFF7ED; color: #F97316; padding: 8px; border-radius: 50%;">group</span></td>
                                        <td>
                                            <div style="font-size: 11px; color: #6B7280; font-weight: 700; text-transform: uppercase;">Guests</div>
                                            <div style="font-size: 14px; color: #111827; font-weight: 600;">${numberOfGuests} Adults, 0 Children</div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>

            <!-- Payment & Location Split -->
            <tr>
                <td style="padding: 0 40px 40px 40px;">
                    <table width="100%" role="presentation">
                        <tr>
                            <!-- Payment Summary -->
                            <td width="48%" valign="top" class="column-stack" style="padding-right: 2%;">
                                <h3 style="font-size: 16px; color: #111827; margin: 0 0 20px 0;">Payment Summary</h3>
                                <table width="100%" role="presentation" style="margin-bottom: 20px;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Nightly rate (${nights} nights)</td>
                                        <td align="right" style="color: #111827; font-weight: 500;">SAR ${subtotal.toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6B7280; font-size: 14px; border-bottom: 1px dotted #E5E7EB;">Taxes & Fees</td>
                                        <td align="right" style="color: #111827; font-weight: 500; border-bottom: 1px dotted #E5E7EB;">SAR ${taxAmount.toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0; color: #111827; font-weight: 700; font-size: 15px;">Total Amount Paid</td>
                                        <td align="right" style="color: #F97316; font-weight: 800; font-size: 16px;">SAR ${grandTotal.toLocaleString()}</td>
                                    </tr>
                                </table>
                                <div style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 6px; padding: 8px 12px; display: inline-flex; align-items: center;">
                                    <span style="color: #059669; font-size: 12px; font-weight: 700; text-transform: uppercase;">✓ PAID WITH ${paymentMethod.toUpperCase()}</span>
                                </div>
                            </td>

                            <!-- Spacer -->
                            <td width="4%" class="column-stack"></td>

                            <!-- Location & Contact -->
                            <td width="48%" valign="top" class="column-stack">
                                <h3 style="font-size: 16px; color: #111827; margin: 0 0 20px 0;">Location & Contact</h3>
                                <div style="position: relative; margin-bottom: 15px;">
                                    <!-- Map Placeholder -->
                                    <img src="https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${hotel.location ? hotel.location.coordinates[0] + ',' + hotel.location.coordinates[1] : '46.6753,24.7136'},14,0/400x200?access_token=${process.env.MAPBOX_TOKEN || 'pk.test'}"
                                         alt="Map"
                                         style="width: 100%; height: 160px; object-fit: cover; border-radius: 8px; background-color: #E5E7EB;"
                                         onerror="this.src='https://via.placeholder.com/400x200/e5e7eb/9ca3af?text=Map+View'">

                                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
                                        <a href="https://maps.google.com/?q=${hotel.name}" target="_blank" style="background: #fff; color: #F97316; text-decoration: none; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">Get Directions</a>
                                    </div>
                                </div>
                                <div>
                                    <div style="margin-bottom: 6px; font-size: 14px;">
                                        <span style="color: #F97316; margin-right: 8px;">📞</span>
                                        <span style="color: #4B5563;">+966549412412</span>
                                    </div>
                                    <div style="font-size: 14px;">
                                        <span style="color: #F97316; margin-right: 8px;">✉️</span>
                                        <a href="mailto:contact@gaithtours.com" style="color: #F97316; text-decoration: none;">contact@gaithtours.com</a>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>

            <!-- Important Info -->
            <tr>
                <td style="padding: 0 40px 40px 40px;">
                    <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 20px; border-radius: 6px;">
                        <h4 style="margin: 0 0 8px 0; color: #1E40AF; font-size: 14px; font-weight: 700; display: flex; align-items: center;">
                            <span style="background: #3B82F6; color: #fff; border-radius: 50%; width: 18px; height: 18px; display: inline-flex; justify-content: center; align-items: center; font-size: 11px; margin-right: 8px;">i</span>
                            Important Information
                        </h4>
                        <p style="margin: 0; color: #1E3A8A; font-size: 12px; line-height: 1.6;">
                            Please present a valid government-issued ID and the credit card used for booking at check-in. The hotel requires a security deposit of SAR 500 per night. If you need to cancel or modify your reservation, please do so at least 48 hours before your arrival date to avoid a penalty of one night's room rate.
                        </p>
                    </div>
                </td>
            </tr>

            <!-- Footer -->
            <tr>
                <td style="padding: 40px; background-color: #fff; text-align: center; border-top: 1px solid #F3F4F6;">

                    <!-- Social Icons -->
                    <div style="margin-bottom: 20px;">
                        <a href="#" style="text-decoration: none; margin: 0 10px; font-size: 20px; color: #9CA3AF;">🐦</a>
                        <a href="#" style="text-decoration: none; margin: 0 10px; font-size: 20px; color: #9CA3AF;">📸</a>
                        <a href="#" style="text-decoration: none; margin: 0 10px; font-size: 20px; color: #9CA3AF;">🔗</a>
                    </div>

                    <p style="color: #9CA3AF; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 20px;">
                        TRAVELPLATFORM INC. • 123 Sky Way, San Francisco, CA 94103
                    </p>

                    <p style="color: #9CA3AF; font-size: 12px;">
                        <a href="#" style="color: #9CA3AF; text-decoration: underline;">Privacy Policy</a> •
                        <a href="#" style="color: #9CA3AF; text-decoration: underline;">Terms of Service</a> •
                        <a href="#" style="color: #9CA3AF; text-decoration: underline;">Unsubscribe</a>
                    </p>

                    <p style="color: #D1D5DB; font-size: 12px; margin-top: 30px;">
                        © 2026 Gaith Tours. All rights reserved.
                    </p>
                </td>
            </tr>

        </table>
    </center>
</body>
</html>
  `;
};

module.exports = { getBookingConfirmationTemplate };
