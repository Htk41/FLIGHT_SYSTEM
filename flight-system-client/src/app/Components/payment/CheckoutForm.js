import React, { useState } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { Button, Spinner } from "react-bootstrap";
import { changeFlightStatus } from "../../crud/flights.crud";

export default function CheckoutForm({ clientSecret, flightId, onSuccess, onCancel, handleBook }) {  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement),
      },
    });

    if (result.error) {
      setError(result.error.message);
      setProcessing(false);
    } else {
      if (result.paymentIntent.status === "succeeded") {
        // Gọi API update trạng thái vé sau khi Stripe báo thành công
        if (handleBook) {
            handleBook()
                .then(() => {
                    setProcessing(false);
                    onSuccess();
                })
                .catch((err) => {
                    setError("Payment success but booking failed: " + (err.message || err));
                    setProcessing(false);
                });
        } else {
             // Fallback nếu không có hàm handleBook (ví dụ chỉ test thanh toán)
             setProcessing(false);
             onSuccess();
        }
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3">
      <div className="mb-4 p-3 border rounded">
        <CardElement options={{ style: { base: { fontSize: '16px' } } }} />
      </div>
      {error && <div className="text-danger mb-3">{error}</div>}
      <div className="d-flex justify-content-end">
        <Button variant="secondary" className="mr-2" onClick={onCancel} disabled={processing}>
            Cancel
        </Button>
        <Button type="submit" disabled={!stripe || processing}>
          {processing ? <Spinner animation="border" size="sm" /> : "Pay Now"}
        </Button>
      </div>
    </form>
  );
}