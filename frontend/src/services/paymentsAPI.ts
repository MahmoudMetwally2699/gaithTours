import api from './api';

export interface Invoice {
    _id: string;
    invoiceId: string;
    invoiceNumber: string; // Added for display
    user: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    clientNationality: string;
    hotelName: string;
    hotelAddress: string;
    amount: number;
    currency: string;
    status: 'invoiced' | 'paid' | 'cancelled';
    paymentStatus: 'paid' | 'unpaid' | 'pending' | 'failed' | 'refunded'; // Added 'refunded' to paymentStatus
    issueDate: string; // Added for issue date
    dueDate: string; // Added for due date
    description?: string; // Added for description
    pdfPath?: string;
    paymentDetails?: {
        stripePaymentIntentId?: string;
        paidAt?: Date;
        paymentMethod?: string;
    };
    createdAt: string;
    updatedAt: string;
    payment?: Payment;
    reservation?: ReservationSummary;
}

export interface ReservationSummary {
    _id: string;
    roomType?: string;
    checkInDate?: string;
    checkOutDate?: string;
    numberOfNights?: number;
    numberOfGuests?: number;
    numberOfAdults?: number;
    numberOfChildren?: number;
    numberOfRooms?: number;
    meal?: string;
}

export interface Payment {
    _id: string;
    invoice: string;
    user: string;
    amount: number;
    currency: string;
    paymentMethod: 'stripe' | 'bank_transfer' | 'cash';
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
    stripePaymentIntentId?: string;
    stripeSessionId?: string;
    transactionId?: string;
    failureReason?: string;
    metadata?: any;
    processedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface PaymentSession {
    sessionId: string;
    url: string;
    paymentId: string;
}

export interface PaymentStatus {
    session: any;
    payment: Payment;
    status: string;
}

const paymentsAPI = {  // Create payment session for invoice
    createSession: async (invoiceId: string): Promise<PaymentSession> => {
        const response = await api.post('/payments/create-session', { invoiceId });
        return response.data.data;
    },
    // Get payment status without authentication
    getSessionStatus: async (sessionId: string): Promise<PaymentStatus> => {
        const response = await api.get(`/payments/session/${sessionId}`);
        return response.data.data;
    },

    // Handle payment success
    handleSuccess: (sessionId: string): Promise<{ data: { data: { invoice: Invoice; payment: Payment } } }> =>
        api.post('/payments/success', { sessionId }),

    // Handle payment failure
    handleFailure: (sessionId: string, reason?: string): Promise<{ data: { data: { payment: Payment } } }> =>
        api.post('/payments/failure', { sessionId, reason }),

    // Get user invoices with payment status
    getInvoices: (): Promise<{ data: { data: { invoices: Invoice[] } } }> =>
        api.get('/payments/invoices'),

    // Get user payment history
    getHistory: (): Promise<{ data: { data: { payments: Payment[] } } }> =>
        api.get('/payments/history'),
    // Create payment intent
    createIntent: (invoiceId: string): Promise<{ data: { data: { clientSecret: string; paymentIntentId: string } } }> =>
        api.post('/payments/create-intent', { invoiceId }),

    // Get individual invoice details
    getInvoice: (invoiceId: string): Promise<{ data: { data: { invoice: Invoice } } }> =>
        api.get(`/payments/invoices/${invoiceId}`),

    // Download invoice receipt as PDF
    downloadReceipt: async (invoiceId: string): Promise<void> => {
        const response = await api.get(`/payments/invoices/${invoiceId}/receipt`, {
            responseType: 'blob'
        });

        // Create blob link to download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;

        // Get filename from response headers or use default
        const contentDisposition = response.headers['content-disposition'];
        let filename = `receipt-${invoiceId}.pdf`;
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="(.+)"/);
            if (match) {
                filename = match[1];
            }
        }

        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },
};

export default paymentsAPI;
