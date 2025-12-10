import React, { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import CheckoutForm from "./CheckoutForm";
import axios from "axios";

// Giữ nguyên Key của bạn
const stripePromise = loadStripe("pk_test_51SaFrZLzhCCZzVGbCaUHAwK8GvnyyGEMSDfcxjQ68lDRyr59YNC8Fe6kWX549ChhbaS6RLBQRsASpwWMp4qS25tE00JaBJ33E7");

const PaymentWrapper = ({ 
    show, 
    onHide, 
    flight, 
    onSuccess, 
    handleBook, 
    isModal = true, // Mặc định là Modal (cho các chức năng cũ)
    clientSecret: propClientSecret, // Nhận secret từ bên ngoài (cho chức năng mới)
    onBack // Nút back (cho chế độ nhúng)
}) => {
  // State nội bộ (dùng nếu bên ngoài không truyền secret vào)
  const [internalSecret, setInternalSecret] = useState("");
  
  // Ưu tiên dùng Secret truyền từ props, nếu không có thì dùng state nội bộ
  const activeSecret = propClientSecret || internalSecret;

  useEffect(() => {
    // Chỉ tự gọi API tính tiền KHI:
    // 1. Chưa có secret truyền từ ngoài (propClientSecret is null)
    // 2. Component đang được hiển thị (show = true)
    // 3. Có thông tin chuyến bay
    if (!propClientSecret && show && flight) {
      
      console.log("DEBUG PAYMENT DATA:", flight);

      // Logic lấy giá tiền (giữ nguyên logic của bạn)
      let priceRaw = flight.details?.price?.total;
      if (!priceRaw && flight.details?.packages?.price) {
         priceRaw = flight.details.packages.price;
      }
      
      if (!priceRaw) {
          console.error("Lỗi: Không tìm thấy giá tiền!");
          return; 
      }

      const amountInCents = Math.round(parseFloat(priceRaw) * 100);

      if (!amountInCents || isNaN(amountInCents)) return;

      // Gọi API tạo Payment Intent
      axios.post("/api/flights/create-payment-intent", { 
          amount: amountInCents,
          currency: "usd" 
      })
      .then((res) => {
          console.log("Internal Payment Intent Created:", res.data);
          setInternalSecret(res.data.clientSecret);
      })
      .catch((err) => {
          console.error("Error creating payment intent", err);
      });
    }
  }, [show, flight, propClientSecret]);

  // --- PHẦN NỘI DUNG FORM (TÁCH RA ĐỂ DÙNG CHUNG) ---
  const content = (
      <div className="payment-content-wrapper">
        {activeSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret: activeSecret }}>
            <CheckoutForm 
                clientSecret={activeSecret} 
                flightId={flight?._id} 
                onSuccess={onSuccess}
                // Nếu là Modal thì nút Cancel sẽ đóng Modal (onHide)
                // Nếu là Nhúng (Embedded) thì nút Cancel sẽ quay lại bước trước (onBack)
                onCancel={isModal ? onHide : onBack}
                handleBook={handleBook}
            />
          </Elements>
        ) : (
           <div className="text-center p-4">
              {flight ? (
                 <>
                    <div className="spinner-border text-primary mb-2" role="status"></div>
                    <p>Initializing Secure Payment...</p>
                 </>
              ) : (
                 <p className="text-danger">Missing Flight Data</p>
              )}
           </div>
        )}
      </div>
  );

  // --- LOGIC RENDER: MODAL HAY DIV? ---
  
  // TRƯỜNG HỢP 1: Hiện như Modal (Popup) - Dùng cho vé cũ hoặc nút Pay Now lẻ
  if (isModal) {
      return (
        <Modal show={show} onHide={onHide} size="md" centered>
          <Modal.Header closeButton>
            <Modal.Title>Secure Payment</Modal.Title>
          </Modal.Header>
          <Modal.Body>
             {/* Hiển thị giá tiền tóm tắt */}
             <div className="alert alert-info text-center mb-3">
                 Payment for Booking: <b>{flight?._id ? flight._id.slice(-6).toUpperCase() : 'New'}</b>
             </div>
             {content}
          </Modal.Body>
        </Modal>
      );
  }

  // TRƯỜNG HỢP 2: Hiện như thẻ Div (Nhúng) - Dùng cho Step 4 trong FlightDetails
  return (
      <div className="embedded-payment-container">
          {content}
      </div>
  );
};

export default PaymentWrapper;