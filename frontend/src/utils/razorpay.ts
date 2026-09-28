import { paymentsService } from '../services/misc.service';

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface InitiateRazorpayPaymentParams {
  reservationId: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  bookingReference?: string;
  onSuccess: (payment: any) => void;
  onError: (errorMsg: string) => void;
}

export async function initiateRazorpayPayment(params: InitiateRazorpayPaymentParams): Promise<void> {
  try {
    const orderData = await paymentsService.createRazorpayOrder(params.reservationId);
    const loaded = await loadRazorpayScript();

    if (!loaded || !(window as any).Razorpay) {
      params.onError('Razorpay SDK failed to load. Please check your network connection.');
      return;
    }

    const options = {
      key: orderData.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder_key',
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      name: 'Grand Hotel',
      description: `Payment for booking ${params.bookingReference || params.reservationId}`,
      order_id: orderData.orderId,
      handler: async function (response: any) {
        try {
          const payment = await paymentsService.verifyRazorpayPayment({
            reservationId: params.reservationId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          params.onSuccess(payment);
        } catch (err: any) {
          const msg = err.response?.data?.message || err.message || 'Signature verification failed.';
          params.onError(msg);
        }
      },
      prefill: {
        name: params.guestName || '',
        email: params.guestEmail || '',
        contact: params.guestPhone || '',
      },
      theme: {
        color: '#0f172a',
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.on('payment.failed', function (response: any) {
      params.onError(response.error?.description || 'Payment failed on Razorpay checkout.');
    });
    rzp.open();
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message || 'Failed to initialize Razorpay payment.';
    params.onError(msg);
  }
}
