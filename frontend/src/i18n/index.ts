import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation resources
const resources = {
  en: {
    translation: {
      // Brand
      brand: {
        name: 'Gaith Tours'
      },

      // Navigation
      nav: {
        home: 'Home',
        about: 'About',
        contact: 'Contact',
        login: 'Login',
        logout: 'Logout',
        register: 'Register',
        hotels: 'Hotels',
        profile: 'Profile',
        language: 'Language'
      },      // Hero Section
      hero: {
        title: 'Discover Your Next Adventure',
        subtitle: 'Explore the Kingdom with Gaith Tours - Your trusted travel companion',
        description: 'From luxury hotels to historic destinations, we make your travel dreams come true',
        bookNow: 'Book Now',
        exploreMore: 'Explore More',
        riyadh: {
          title: 'Experience Riyadh\'s Grandeur',
          subtitle: 'Discover the capital\'s modern skyline and rich cultural heritage'
        },
        jeddah: {
          title: 'Explore Historic Jeddah',
          subtitle: 'Gateway to Makkah with stunning Red Sea coastline and ancient charm'
        },
        diriyah: {
          title: 'Journey to Diriyah',
          subtitle: 'Step into the birthplace of the Saudi Kingdom and UNESCO World Heritage site'
        },
        alula: {
          title: 'Discover AlUla\'s Wonders',
          subtitle: 'Explore ancient Nabatean tombs and breathtaking desert landscapes'
        },
        heritage: {
          title: 'Saudi Arabian Heritage',
          subtitle: 'Experience the timeless beauty of traditional architecture and culture'
        }
      },

      // Holiday Packages
      packages: {
        title: 'Choose Your Best Holiday Package',
        subtitle: 'Handpicked destinations for unforgettable experiences',
        featured: 'Featured Packages',
        bookPackage: 'Book Package',
        viewDetails: 'View Details',
        viewAll: 'View All Packages',
        riyadh: {
          title: 'Riyadh Discovery',
          description: 'Experience the modern capital with its rich cultural heritage'
        },
        jeddah: {
          title: 'Jeddah Heritage',
          description: 'Explore the historic gateway to Makkah and Red Sea beauty'
        },
        alula: {
          title: 'AlUla Adventure',
          description: 'Discover ancient Nabatean wonders in breathtaking desert landscapes'
        },
        taif: {
          title: 'Taif Retreat',
          description: 'Enjoy the cool mountain air and beautiful rose gardens'
        },
        abha: {
          title: 'Abha Mountains',
          description: 'Experience the stunning highlands and traditional culture'
        },
        khobar: {
          title: 'Eastern Province',
          description: 'Explore modern cities along the Arabian Gulf coast'
        }
      },

      // How It Works
      howItWorks: {
        title: 'How Gaith Tours Makes It Easy',
        subtitle: 'Simple steps to your perfect vacation',
        steps: {
          search: {
            title: 'Search & Discover',
            description: 'Browse through our carefully curated travel packages and destinations'
          },
          book: {
            title: 'Book with Confidence',
            description: 'Secure booking process with competitive prices and instant confirmation'
          },
          enjoy: {
            title: 'Enjoy Your Journey',
            description: '24/7 support ensures your trip goes smoothly from start to finish'
          }
        }
      },

      // Ready to Explore
      explore: {
        title: 'Ready to Explore?',
        description: "Let's Chat About Your Dream Trip. We'll turn your travel ideas into reality. Start your next adventure with Gaith Tours – your ultimate travel companion. Let your wanderlust soar! Start exploring today and let unforgettable experiences await!",
        startExploring: 'Start Exploring'
      },

      // Mission
      mission: {
        title: 'Our Mission',
        description: 'At Ghaith Tours, our mission is to simplify and enrich the travel experience by providing seamless hotel booking services and tailored travel solutions. We are committed to delivering competitive prices, reliable support, and a user-friendly digital platform that empowers both individuals and businesses to explore the world with ease and confidence.'      },

      // Why Choose Us
      whyChooseUs: {
        title: 'Why Choose Gaith Tours?',
        subtitle: 'Experience the difference with our exceptional service and expertise',
        secure: {
          title: 'Secure Booking',
          description: 'Your transactions are protected with advanced encryption and secure payment gateways'
        },
        bestPrice: {
          title: 'Best Price Guarantee',
          description: 'We offer competitive rates and price matching to ensure you get the best value'
        },
        support: {
          title: '24/7 Support',
          description: 'Our dedicated support team is available round the clock to assist you'
        },
        expert: {
          title: 'Expert Guidance',
          description: 'Our travel experts provide personalized recommendations for your perfect trip'
        },
        destinations: {
          title: 'Global Destinations',
          description: 'Access to thousands of hotels and destinations worldwide'
        },
        personalized: {
          title: 'Personalized Service',
          description: 'Tailored travel solutions to match your preferences and budget'
        }
      },

      // Stats
      stats: {
        happyCustomers: 'Happy Customers',
        destinations: 'Destinations',
        yearsExperience: 'Years Experience',
        support: '24/7 Support'
      },      // Footer
      footer: {
        description: 'Your trusted partner for unforgettable travel experiences worldwide',
        about: 'About Us',
        services: 'Services',
        hotelBooking: 'Hotel Booking',
        travelPackages: 'Travel Packages',
        groupTours: 'Group Tours',
        customItineraries: 'Custom Itineraries',
        contactInfo: 'Contact Info',
        address: {
          line1: '123 Travel Street',
          line2: 'Dubai, UAE'
        },
        rights: 'All rights reserved.',
        privacy: 'Privacy Policy',
        terms: 'Terms of Service',
        quickLinks: 'Quick Links',
        contact: 'Contact Us',
        email: 'Email',
        phone: 'Phone',
        followUs: 'Follow Us',
        copyright: '© 2024 Gaith Tours. All rights reserved.',
        privacyPolicy: 'Privacy Policy',
        termsOfService: 'Terms of Service'
      },      // Authentication
      auth: {
        fullName: 'Full Name',
        fullNamePlaceholder: 'Enter your full name',
        email: 'Email Address',
        emailPlaceholder: 'Enter your email address',
        password: 'Password',
        passwordPlaceholder: 'Enter your password',
        confirmPassword: 'Confirm Password',
        confirmPasswordPlaceholder: 'Confirm your password',
        phone: 'Phone Number',
        phonePlaceholder: 'Enter your phone number',
        nationality: 'Nationality',
        nationalityPlaceholder: 'Enter your nationality',
        rememberMe: 'Remember me',
        forgotPassword: 'Forgot Password?',
        agreeToTerms: 'I agree to the',
        termsOfService: 'Terms of Service',
        and: 'and',
        privacyPolicy: 'Privacy Policy',
        or: 'or',
        haveAccount: 'Already have an account?',
        noAccount: "Don't have an account?",login: {
          title: 'Welcome Back',
          subtitle: 'Sign in to your account',
          button: 'Sign In',
          email: 'Email Address',
          password: 'Password',
          forgotPassword: 'Forgot Password?',
          rememberMe: 'Remember me',
          signIn: 'Sign In',
          signUp: 'Sign Up',
          invalidCredentials: 'Invalid email or password',
          error: 'Login failed. Please try again.'
        },
        register: {
          title: 'Create Account',
          subtitle: 'Join Gaith Tours today',
          email: 'Email Address',
          password: 'Password',
          confirmPassword: 'Confirm Password',
          phone: 'Phone Number',
          nationality: 'Nationality',
          createAccount: 'Create Account',
          button: 'Create Account',
          hasAccount: 'Already have an account?',
          signIn: 'Sign In',
          passwordRequirements: 'Password must be at least 8 characters with uppercase, lowercase, number and special character',
          passwordMismatch: 'Passwords do not match',
          passwordLength: 'Password must be at least 6 characters',
          agreeTerms: 'You must agree to the terms and conditions',
          error: 'Registration failed. Please try again.',
          success: {
            title: 'Registration Successful!',
            message: 'Please check your email to verify your account.',
            redirect: 'Redirecting to login page...'
          }
        }
      },// Hotels
      hotels: {
        title: 'Find Your Perfect Hotel',
        subtitle: 'Discover our handpicked selection of premium accommodations',
        searchPlaceholder: 'Search for hotels, cities, or destinations...',
        search: 'Search',
        filters: 'Filters',
        sortBy: 'Sort By',
        price: 'Price',
        rating: 'Rating',
        distance: 'Distance',
        checkIn: 'Check In',        checkOut: 'Check Out',
        guests: 'Guests',
        adult: 'Adult',
        adults: 'Adults',
        totalPrice: 'Total Price',
        bookNow: 'Book Now',
        viewDetails: 'View Details',
        selectDates: 'Select Dates',
        location: 'Location',
        amenities: 'Amenities',
        reviews: 'Reviews',
        noHotelsFound: 'No hotels found. Try adjusting your search criteria.',
        loadingHotels: 'Searching for hotels...',
        results: '{{count}} hotels found',
        noResults: 'No hotels found',
        priceLowToHigh: 'Price: Low to High',
        priceHighToLow: 'Price: High to Low',
        name: 'Name',
        tryDifferentSearch: 'Try adjusting your search criteria or browse our featured hotels.',
        featured: {
          title: 'Featured Hotels',
          subtitle: 'Discover our handpicked selection of premium accommodations'
        },
        off: 'OFF',
        perNight: 'per night',
        viewAll: 'View All Hotels',
        booking: {
          title: 'Book Your Stay',
          summary: 'Booking Summary',
          details: 'Booking Details',
          nights: 'Nights',
          rooms: 'Rooms',
          total: 'Total',
          specialRequests: 'Special Requests',
          specialRequestsPlaceholder: 'Any special requests or preferences?',
          dateRequired: 'Please select check-in and check-out dates',
          loginRequired: 'Please login to make a booking',
          confirm: 'Confirm Booking',
          error: 'Booking failed. Please try again.',
          success: {
            title: 'Booking Confirmed!',
            message: 'Your reservation has been successfully created.'
          }
        }
      },

      // Booking
      booking: {
        title: 'Complete Your Booking',
        touristName: 'Tourist Name',
        phone: 'Phone Number',
        email: 'Email Address',
        nationality: 'Nationality',
        hotelName: 'Hotel Name',
        selectHotel: 'Select Hotel',
        checkInDate: 'Check-in Date',
        checkOutDate: 'Check-out Date',
        numberOfGuests: 'Number of Guests',
        specialRequests: 'Special Requests',
        notes: 'Additional Notes',
        submitBooking: 'Submit Booking',
        bookingSuccess: 'Booking submitted successfully!',
        bookingError: 'Failed to submit booking. Please try again.',
        confirmBooking: 'Confirm Booking',
        selectHotelFirst: 'Please select a hotel first'
      },      // Profile
      profile: {
        title: 'My Profile',
        subtitle: 'Manage your account and view your reservations',
        personalInfo: 'Personal Information',
        information: 'Information',
        memberSince: 'Member since',
        reservations: 'My Reservations',
        myReservations: 'My Reservations',
        editProfile: 'Edit Profile',
        changePassword: 'Change Password',
        deleteAccount: 'Delete Account',
        updateProfile: 'Update Profile',
        currentPassword: 'Current Password',
        newPassword: 'New Password',
        confirmNewPassword: 'Confirm New Password',
        updatePassword: 'Update Password',
        noReservations: 'No reservations found',
        startBooking: 'Start by booking your first hotel!',
        reservationId: 'Reservation ID',
        hotelName: 'Hotel Name',
        checkIn: 'Check In',
        checkOut: 'Check Out',
        status: 'Status',
        bookingDate: 'Booking Date',
        actions: 'Actions',
        viewReservation: 'View',
        cancelReservation: 'Cancel',
        confirmCancel: 'Are you sure you want to cancel this reservation?',
        bookedOn: 'Booked on',        save: 'Save',
        cancel: 'Cancel'
      },

      // Reservations
      reservations: {
        status: {
          confirmed: 'Confirmed',
          pending: 'Pending',
          cancelled: 'Cancelled'
        }
      },

      // Common
      common: {
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        save: 'Save',
        cancel: 'Cancel',
        close: 'Close',
        edit: 'Edit',
        delete: 'Delete',
        confirm: 'Confirm',
        back: 'Back',
        next: 'Next',
        previous: 'Previous',
        submit: 'Submit',
        reset: 'Reset',
        retry: 'Retry',
        showMore: 'Show More',
        showLess: 'Show Less',
        selectAll: 'Select All',
        deselectAll: 'Deselect All',
        required: 'Required',
        optional: 'Optional',
        yes: 'Yes',
        no: 'No',
        or: 'or',        and: 'and'
      },

      // Validation
      validation: {
        required: 'This field is required',
        invalidEmail: 'Please enter a valid email address',
        invalidPhone: 'Please enter a valid phone number',
        passwordTooShort: 'Password must be at least 8 characters',
        passwordsDoNotMatch: 'Passwords do not match',
        minLength: 'Must be at least {{min}} characters',
        maxLength: 'Must be no more than {{max}} characters'
      }
    }
  },
  ar: {
    translation: {
      // Brand
      brand: {
        name: 'غيث تورز'
      },

      // Navigation
      nav: {
        home: 'الرئيسية',
        about: 'عن الشركة',
        contact: 'اتصل بنا',
        login: 'تسجيل الدخول',
        logout: 'تسجيل الخروج',
        register: 'إنشاء حساب',
        hotels: 'الفنادق',
        profile: 'الملف الشخصي',
        language: 'اللغة'
      },      // Hero Section
      hero: {
        title: 'اكتشف مغامرتك القادمة',
        subtitle: 'استكشف المملكة مع غيث تورز - رفيقك الموثوق في السفر',
        description: 'من الفنادق الفاخرة إلى الوجهات التاريخية، نحقق أحلام السفر الخاصة بك',
        bookNow: 'احجز الآن',
        exploreMore: 'استكشف المزيد',
        riyadh: {
          title: 'استمتع بعظمة الرياض',
          subtitle: 'اكتشف أفق العاصمة الحديث والتراث الثقافي الغني'
        },
        jeddah: {
          title: 'استكشف جدة التاريخية',
          subtitle: 'بوابة مكة مع ساحل البحر الأحمر الخلاب والسحر القديم'
        },
        diriyah: {
          title: 'رحلة إلى الدرعية',
          subtitle: 'ادخل إلى مهد المملكة السعودية وموقع التراث العالمي لليونسكو'
        },
        alula: {
          title: 'اكتشف عجائب العلا',
          subtitle: 'استكشف المقابر النبطية القديمة والمناظر الطبيعية الصحراوية الخلابة'
        },
        heritage: {
          title: 'التراث السعودي',
          subtitle: 'استمتع بالجمال الخالد للعمارة والثقافة التقليدية'
        }
      },      // Holiday Packages
      packages: {
        title: 'اختر أفضل باقة عطلة',
        subtitle: 'وجهات مختارة بعناية لتجارب لا تُنسى',
        featured: 'الباقات المميزة',
        bookPackage: 'احجز الباقة',
        viewDetails: 'عرض التفاصيل',
        viewAll: 'عرض جميع الباقات',
        riyadh: {
          title: 'استكشاف الرياض',
          description: 'استمتع بالعاصمة الحديثة مع تراثها الثقافي الغني'
        },
        jeddah: {
          title: 'تراث جدة',
          description: 'استكشف البوابة التاريخية لمكة وجمال البحر الأحمر'
        },
        alula: {
          title: 'مغامرة العلا',
          description: 'اكتشف عجائب النبطيين القديمة في المناظر الطبيعية الصحراوية الخلابة'
        },
        taif: {
          title: 'خلوة الطائف',
          description: 'استمتع بالهواء البارد في الجبال وحدائق الورود الجميلة'
        },
        abha: {
          title: 'جبال أبها',
          description: 'استمتع بالمرتفعات الخلابة والثقافة التقليدية'
        },
        khobar: {
          title: 'المنطقة الشرقية',
          description: 'استكشف المدن الحديثة على طول ساحل الخليج العربي'
        }
      },

      // How It Works
      howItWorks: {
        title: 'كيف تجعل غيث تورز الأمر سهلاً',
        subtitle: 'خطوات بسيطة لعطلتك المثالية',
        steps: {
          search: {
            title: 'ابحث واكتشف',
            description: 'تصفح باقات السفر والوجهات المختارة بعناية'
          },
          book: {
            title: 'احجز بثقة',
            description: 'عملية حجز آمنة بأسعار تنافسية وتأكيد فوري'
          },
          enjoy: {
            title: 'استمتع برحلتك',
            description: 'دعم على مدار 24/7 يضمن سير رحلتك بسلاسة من البداية إلى النهاية'
          }
        }
      },

      // Ready to Explore
      explore: {
        title: 'مستعد للاستكشاف؟',
        description: 'دعنا نتحدث عن رحلة أحلامك. سنحول أفكار السفر الخاصة بك إلى حقيقة. ابدأ مغامرتك القادمة مع غيث تورز - رفيقك الأمثل في السفر. دع شغفك بالسفر يحلق عالياً! ابدأ الاستكشاف اليوم ودع التجارب التي لا تُنسى تنتظرك!',
        startExploring: 'ابدأ الاستكشاف'
      },

      // Mission
      mission: {
        title: 'مهمتنا',
        description: 'في غيث تورز، مهمتنا هي تبسيط وإثراء تجربة السفر من خلال توفير خدمات حجز الفنادق السلسة وحلول السفر المخصصة. نحن ملتزمون بتقديم أسعار تنافسية ودعم موثوق ومنصة رقمية سهلة الاستخدام تمكن الأفراد والشركات من استكشاف العالم بسهولة وثقة.'
      },

      // Why Choose Us
      whyChooseUs: {
        title: 'لماذا تختار غيث تورز؟',
        subtitle: 'اختبر الفرق مع خدمتنا الاستثنائية وخبرتنا',
        secure: {
          title: 'حجز آمن',
          description: 'معاملاتك محمية بتشفير متقدم وبوابات دفع آمنة'
        },
        bestPrice: {
          title: 'ضمان أفضل سعر',
          description: 'نقدم أسعار تنافسية ومطابقة الأسعار لضمان حصولك على أفضل قيمة'
        },
        support: {
          title: 'دعم 24/7',
          description: 'فريق الدعم المخصص لدينا متاح على مدار الساعة لمساعدتك'
        },
        expert: {
          title: 'إرشاد خبير',
          description: 'خبراء السفر لدينا يقدمون توصيات شخصية لرحلتك المثالية'
        },
        destinations: {
          title: 'وجهات عالمية',
          description: 'الوصول إلى آلاف الفنادق والوجهات في جميع أنحاء العالم'
        },
        personalized: {
          title: 'خدمة شخصية',
          description: 'حلول سفر مصممة خصيصاً لتناسب تفضيلاتك وميزانيتك'
        }
      },

      // Stats
      stats: {
        happyCustomers: 'عملاء سعداء',
        destinations: 'وجهات',
        yearsExperience: 'سنوات خبرة',
        support: 'دعم 24/7'
      },

      // Footer
      footer: {
        description: 'شريكك الموثوق لتجارب سفر لا تُنسى في جميع أنحاء العالم',
        about: 'عن الشركة',
        services: 'الخدمات',
        hotelBooking: 'حجز الفنادق',
        travelPackages: 'باقات السفر',
        groupTours: 'جولات جماعية',
        customItineraries: 'مسارات مخصصة',
        contactInfo: 'معلومات الاتصال',
        address: {
          line1: '123 شارع السفر',
          line2: 'دبي، الإمارات العربية المتحدة'
        },
        rights: 'جميع الحقوق محفوظة.',
        privacy: 'سياسة الخصوصية',
        terms: 'شروط الخدمة',
        quickLinks: 'روابط سريعة',
        contact: 'اتصل بنا',
        email: 'البريد الإلكتروني',
        phone: 'الهاتف',
        followUs: 'تابعنا',
        copyright: '© 2024 غيث تورز. جميع الحقوق محفوظة.',
        privacyPolicy: 'سياسة الخصوصية',
        termsOfService: 'شروط الخدمة'
      },      // Authentication
      auth: {
        fullName: 'الاسم الكامل',
        fullNamePlaceholder: 'أدخل اسمك الكامل',
        email: 'عنوان البريد الإلكتروني',
        emailPlaceholder: 'أدخل عنوان بريدك الإلكتروني',
        password: 'كلمة المرور',
        passwordPlaceholder: 'أدخل كلمة المرور',
        confirmPassword: 'تأكيد كلمة المرور',
        confirmPasswordPlaceholder: 'أكد كلمة المرور',
        phone: 'رقم الهاتف',
        phonePlaceholder: 'أدخل رقم هاتفك',
        nationality: 'الجنسية',
        nationalityPlaceholder: 'أدخل جنسيتك',
        rememberMe: 'تذكرني',
        forgotPassword: 'نسيت كلمة المرور؟',
        agreeToTerms: 'أوافق على',
        termsOfService: 'شروط الخدمة',
        and: 'و',
        privacyPolicy: 'سياسة الخصوصية',
        or: 'أو',
        haveAccount: 'لديك حساب بالفعل؟',
        noAccount: 'ليس لديك حساب؟',        login: {
          title: 'مرحباً بعودتك',
          subtitle: 'سجل الدخول إلى حسابك',
          button: 'تسجيل الدخول',
          email: 'عنوان البريد الإلكتروني',
          password: 'كلمة المرور',
          forgotPassword: 'نسيت كلمة المرور؟',
          rememberMe: 'تذكرني',
          signIn: 'تسجيل الدخول',
          signUp: 'إنشاء حساب',
          invalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
          error: 'فشل في تسجيل الدخول. يرجى المحاولة مرة أخرى.'
        },
        register: {
          title: 'إنشاء حساب',
          subtitle: 'انضم إلى غيث تورز اليوم',
          email: 'عنوان البريد الإلكتروني',
          password: 'كلمة المرور',
          confirmPassword: 'تأكيد كلمة المرور',
          phone: 'رقم الهاتف',
          nationality: 'الجنسية',
          createAccount: 'إنشاء حساب',
          button: 'إنشاء حساب',
          hasAccount: 'لديك حساب بالفعل؟',
          signIn: 'تسجيل الدخول',
          passwordRequirements: 'يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل مع حرف كبير وصغير ورقم ورمز خاص',
          passwordMismatch: 'كلمات المرور غير متطابقة',
          passwordLength: 'يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل',
          agreeTerms: 'يجب الموافقة على الشروط والأحكام',
          error: 'فشل في التسجيل. يرجى المحاولة مرة أخرى.',
          success: {
            title: 'تم التسجيل بنجاح!',
            message: 'يرجى التحقق من بريدك الإلكتروني لتفعيل حسابك.',
            redirect: 'جاري توجيهك إلى صفحة تسجيل الدخول...'
          }
        }
      },

      // Hotels
      hotels: {
        title: 'ابحث عن فندقك المثالي',
        subtitle: 'اكتشف مجموعتنا المختارة بعناية من أماكن الإقامة الفاخرة',
        searchPlaceholder: 'ابحث عن الفنادق أو المدن أو الوجهات...',
        search: 'بحث',
        filters: 'المرشحات',
        sortBy: 'ترتيب حسب',
        price: 'السعر',
        rating: 'التقييم',
        distance: 'المسافة',
        checkIn: 'تسجيل الوصول',
        checkOut: 'تسجيل المغادرة',
        guests: 'الضيوف',
        adult: 'بالغ',
        adults: 'البالغين',
        bookNow: 'احجز الآن',
        viewDetails: 'عرض التفاصيل',
        selectDates: 'اختر التواريخ',
        location: 'الموقع',
        amenities: 'المرافق',
        reviews: 'التقييمات',
        noHotelsFound: 'لم يتم العثور على فنادق. حاول تعديل معايير البحث.',
        loadingHotels: 'البحث عن الفنادق...',
        results: 'تم العثور على {{count}} فندق',
        noResults: 'لم يتم العثور على فنادق',
        priceLowToHigh: 'السعر: من الأقل إلى الأعلى',
        priceHighToLow: 'السعر: من الأعلى إلى الأقل',
        name: 'الاسم',
        tryDifferentSearch: 'حاول تعديل معايير البحث أو تصفح فنادقنا المميزة.',
        featured: {
          title: 'الفنادق المميزة',
          subtitle: 'اكتشف مجموعتنا المختارة بعناية من أماكن الإقامة الفاخرة'
        },
        off: 'خصم',
        perNight: 'لكل ليلة',
        viewAll: 'عرض جميع الفنادق',
        booking: {
          title: 'احجز إقامتك',
          summary: 'ملخص الحجز',
          details: 'تفاصيل الحجز',
          nights: 'ليالي',
          rooms: 'غرف',
          total: 'الإجمالي',
          specialRequests: 'طلبات خاصة',
          specialRequestsPlaceholder: 'أي طلبات خاصة أو تفضيلات؟',
          dateRequired: 'يرجى اختيار تواريخ الوصول والمغادرة',
          loginRequired: 'يرجى تسجيل الدخول لعمل حجز',
          confirm: 'تأكيد الحجز',
          error: 'فشل الحجز. يرجى المحاولة مرة أخرى.',
          success: {
            title: 'تم تأكيد الحجز!',
            message: 'تم إنشاء حجزك بنجاح.'
          }
        }
      },

      // Booking
      booking: {
        title: 'أكمل حجزك',
        touristName: 'اسم السائح',
        phone: 'رقم الهاتف',
        email: 'عنوان البريد الإلكتروني',
        nationality: 'الجنسية',
        hotelName: 'اسم الفندق',
        selectHotel: 'اختر الفندق',
        checkInDate: 'تاريخ تسجيل الوصول',
        checkOutDate: 'تاريخ تسجيل المغادرة',
        numberOfGuests: 'عدد الضيوف',
        specialRequests: 'طلبات خاصة',
        notes: 'ملاحظات إضافية',
        submitBooking: 'تقديم الحجز',
        bookingSuccess: 'تم تقديم الحجز بنجاح!',
        bookingError: 'فشل في تقديم الحجز. يرجى المحاولة مرة أخرى.',
        confirmBooking: 'تأكيد الحجز',
        selectHotelFirst: 'يرجى اختيار فندق أولاً'
      },

      // Profile
      profile: {
        title: 'ملفي الشخصي',
        personalInfo: 'المعلومات الشخصية',
        myReservations: 'حجوزاتي',
        editProfile: 'تحرير الملف الشخصي',
        changePassword: 'تغيير كلمة المرور',
        deleteAccount: 'حذف الحساب',
        updateProfile: 'تحديث الملف الشخصي',
        currentPassword: 'كلمة المرور الحالية',
        newPassword: 'كلمة المرور الجديدة',
        confirmNewPassword: 'تأكيد كلمة المرور الجديدة',
        updatePassword: 'تحديث كلمة المرور',
        noReservations: 'لم يتم العثور على حجوزات',
        reservationId: 'رقم الحجز',
        hotelName: 'اسم الفندق',
        checkIn: 'تسجيل الوصول',
        checkOut: 'تسجيل المغادرة',
        status: 'الحالة',
        bookingDate: 'تاريخ الحجز',
        actions: 'الإجراءات',
        viewReservation: 'عرض',        cancelReservation: 'إلغاء',
        bookedOn: 'تم الحجز في'
      },

      // Reservations
      reservations: {
        status: {
          confirmed: 'مؤكد',
          pending: 'معلق',
          cancelled: 'ملغى'
        }
      },

      // Common
      common: {
        loading: 'جاري التحميل...',
        error: 'خطأ',
        success: 'نجح',
        save: 'حفظ',
        cancel: 'إلغاء',
        close: 'إغلاق',
        edit: 'تحرير',
        delete: 'حذف',
        confirm: 'تأكيد',
        back: 'رجوع',
        next: 'التالي',
        previous: 'السابق',
        submit: 'إرسال',
        reset: 'إعادة تعيين',
        retry: 'إعادة المحاولة',
        showMore: 'عرض المزيد',
        showLess: 'عرض أقل',
        selectAll: 'تحديد الكل',
        deselectAll: 'إلغاء تحديد الكل',
        required: 'مطلوب',
        optional: 'اختياري',
        yes: 'نعم',
        no: 'لا',
        or: 'أو',
        and: 'و'
      },

      // Validation
      validation: {
        required: 'هذا الحقل مطلوب',
        invalidEmail: 'يرجى إدخال عنوان بريد إلكتروني صالح',
        invalidPhone: 'يرجى إدخال رقم هاتف صالح',
        passwordTooShort: 'يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل',
        passwordsDoNotMatch: 'كلمات المرور غير متطابقة',
        minLength: 'يجب أن يحتوي على {{min}} أحرف على الأقل',
        maxLength: 'يجب ألا يزيد عن {{max}} حرف'
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ['localStorage', 'sessionStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage', 'sessionStorage'],
    },

    react: {
      useSuspense: false,
    },
  });

export default i18n;
