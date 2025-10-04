'use client';

import { useState } from 'react';

const PaymentButton = ({
    name,
    email,
    contact,
    amount,
    onPaymentSuccess,
}: {
    amount: number;
    name: string,
    email: string,
    contact: string,
    onPaymentSuccess: (paymentId: string) => void;
}) => {
    const [loading, setLoading] = useState(false);

    const handlePayment = async () => {
        setLoading(true);

        const orderRes = await fetch('/api/razorpay/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount }),
        });

        const order = await orderRes.json();

        if (order.error) {
            alert(order.error);
            setLoading(false);
            return;
        }

        const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            amount: order.amount,
            currency: order.currency,
            name: 'Next.js App',
            order_id: order.id,
            handler: async function (response: any) {
                const verificationRes = await fetch('/api/razorpay/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                    }),
                });

                const verificationResult = await verificationRes.json();
                if (verificationResult.success) {
                    alert('Payment Successful and Verified!');
                    onPaymentSuccess(response.razorpay_payment_id);
                } else {
                    alert('Payment failed to verify!');
                }
            },
            prefill: {
                name,
                email,
                contact,
            },
            theme: {
                color: '#6366f1',
            },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();

        setLoading(false);
    };

    return (
        <button
            onClick={handlePayment}
            disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:bg-gray-400"
        >
            {loading ? 'Processing...' : `Pay ₹${amount}`}
        </button>
    );
};

export default PaymentButton;