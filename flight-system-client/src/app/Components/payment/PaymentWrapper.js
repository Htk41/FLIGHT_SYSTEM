import React, { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import CheckoutForm from "./CheckoutForm";
import axios from "axios";

// Thay YOUR_PUBLISHABLE_KEY bằng key public từ Stripe Dashboard của bạn
const stripePromise = loadStripe("pk_test_51SaFrZLzhCCZzVGbCaUHAwK8GvnyyGEMSDfcxjQ68lDRyr59YNC8Fe6kWX549ChhbaS6RLBQRsASpwWMp4qS25tE00JaBJ33E7");

const PaymentWrapper = ({ show, onHide, flight, onSuccess, handleBook }) => {
  const [clientSecret, setClientSecret] = useState("");

  useEffect(() => {
    // Chỉ chạy khi Modal mở và có object flight
    if (show && flight) {
      
      // --- DEBUG LOGGING (Kiểm tra dữ liệu) ---
      console.log("DEBUG PAYMENT DATA:", flight);

      // Thử lấy giá tiền theo cấu trúc chuẩn
      let priceRaw = flight.details?.price?.total;

      // Fallback: Nếu cấu trúc trên không có, thử tìm cấu trúc khác (cho Deals/Tours)
      if (!priceRaw && flight.details?.packages?.price) {
         priceRaw = flight.details.packages.price;
      }
      
      console.log("Raw Price found:", priceRaw); 
      // ----------------------------------------

      // Nếu không tìm thấy giá, dừng lại để tránh lỗi crash
      if (!priceRaw) {
          console.error("Lỗi: Không tìm thấy giá tiền trong object flight!", flight);
          return; 
      }

      // Tính toán tiền (Stripe dùng đơn vị 'cent')
      // parseFloat giúp xử lý chuỗi "100.00" -> 100.00
      const amountInCents = Math.round(parseFloat(priceRaw) * 100);

      console.log("Amount sent to Stripe (cents):", amountInCents);

      if (!amountInCents || isNaN(amountInCents)) {
          console.error("Lỗi: Giá tiền tính toán ra NaN!", priceRaw);
          return;
      }

      // Gọi API tạo Payment Intent
      axios.post("/api/flights/create-payment-intent", { 
          amount: amountInCents,
          currency: "usd" 
      })
      .then((res) => {
          console.log("Payment Intent Created:", res.data);
          setClientSecret(res.data.clientSecret);
      })
      .catch((err) => {
          console.error("Error creating payment intent", err.response ? err.response.data : err);
      });
    }
  }, [show, flight]);

  return (
    <Modal show={show} onHide={onHide} size="md">
      <Modal.Header closeButton>
        <Modal.Title>Secure Payment</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm 
                clientSecret={clientSecret} 
                flightId={flight?._id} 
                onSuccess={onSuccess}
                onCancel={onHide}
                handleBook={handleBook}
            />
          </Elements>
        ) : (
           <div className="text-center p-3">
              {flight ? (
                 <p>Initializing payment gateway... <br/><small>(Check console if stuck)</small></p>
              ) : (
                 <p className="text-danger">Missing Booking Data</p>
              )}
           </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default PaymentWrapper;