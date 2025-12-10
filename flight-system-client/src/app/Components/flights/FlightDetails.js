import React, { useState } from "react";
import { Alert, Button, Modal, Table } from "react-bootstrap";
import moment from "moment";
import clsx from "clsx";
import Login from "../../pages/auth/Login";
import { bookFlight, changeFlightStatus } from "../../crud/flights.crud";
import { shallowEqual, useSelector } from "react-redux";
import PaymentWrapper from "../payment/PaymentWrapper";
import { Link } from "react-router-dom";
import SeatSelection from "./SeatSelection";
import PassengerForm from "./PassengerForm";
import axios from "axios";

const FlightDetails = ({
  flight,
  showDetails,
  setShowDetails,
  setDetails,
  setResponse,
  readOnly,
  bookingStatus,
  updateTipsCancel,
  userType
}) => {
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  // Modal thanh toán riêng cho vé cũ
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // --- STATE WIZARD ---
  const [bookingStep, setBookingStep] = useState(1); 
  const [selectedSeats, setSelectedSeats] = useState([]); 
  const [passengerInfo, setPassengerInfo] = useState(null);
  const [clientSecret, setClientSecret] = useState(""); 

  const { isAuthorized, user } = useSelector(
    ({ auth }) => ({ isAuthorized: auth.user != null, user: auth.user }),
    shallowEqual
  );

  const [loadingButtonStyle, setLoadingButtonStyle] = useState({ paddingRight: "1.5rem" });

  // --- HELPER DỮ LIỆU ---
  const getFlightData = () => {
      // Ưu tiên flightInfo, rồi đến details, rồi đến chính nó
      const data = flight.flightInfo || flight.details || flight;
      
      // Xử lý giá tiền: Đảm bảo luôn là số
      let rawPrice = flight.totalPrice || data.price?.total || 0;
      let price = parseFloat(rawPrice);
      if (isNaN(price)) price = 0;

      return {
          id: flight._id || data.id,
          itineraries: data.itineraries || [],
          travelerPricings: data.travelerPricings || [],
          price: {
              total: price,
              currency: flight.currency || data.price?.currency || "USD"
          }
      };
  };

  const flightData = getFlightData();
  const totalPassengers = flightData.travelerPricings.length || 1;

  // --- ACTIONS ---
  const handleCloseModal = () => {
    setShowDetails(false);
    setBookingStep(1);
    setSelectedSeats([]); 
    setPassengerInfo(null);
    setClientSecret("");
  };

  const handleClickBookNow = () => {
    if (isAuthorized) { setBookingStep(2); } 
    else { setShowDetails(false); setShowLogin(true); }
  };

  // --- CHUYỂN BƯỚC 4 (THANH TOÁN) ---
  const handleProceedToPayment = (info) => {
      console.log("1. Received Passenger Info form Step 3:", info); // Debug 1
      setPassengerInfo(info);
      setLoadingBooking(true);

      const amountInCents = Math.round(flightData.price.total * 100);

      axios.post("/api/flights/create-payment-intent", { 
          amount: amountInCents, currency: "usd" 
      })
      .then((res) => {
          setClientSecret(res.data.clientSecret);
          setLoadingBooking(false);
          setBookingStep(4); 
      })
      .catch(err => {
          setLoadingBooking(false);
          alert("Lỗi Payment: " + err.message);
      });
  };

  // --- HÀM GỌI API ĐẶT VÉ (QUAN TRỌNG NHẤT) ---
  const handleFinalBooking = () => {
      // --- DEBUG LOG: Kiểm tra xem dữ liệu có bị null không ---
      console.log(">>> KIỂM TRA DỮ LIỆU TRƯỚC KHI GỬI API <<<");
      console.log("- User ID:", user ? user._id : "NULL");
      console.log("- Passenger Info:", passengerInfo);
      console.log("- Flight Data:", flightData);
      // -------------------------------------------------------

      // Chặn nếu dữ liệu null để không bị lỗi 400
      if (!passengerInfo || passengerInfo.length === 0) {
          alert("Lỗi: Không tìm thấy thông tin hành khách. Vui lòng quay lại bước trước và nhập lại.");
          return Promise.reject("Missing passenger info");
      }

      return bookFlight({
        userId: user ? user._id : null,
        totalPrice: parseFloat(flightData.price.total),
        flightInfo: flightData, 
        passengers: passengerInfo, 
        bookingStatus: "Confirmed"
      });
  };

  const handlePaymentSuccess = () => {
    if (bookingStatus && bookingStatus._id) {
       updateTipsCancel(bookingStatus._id, "Confirmed");
    }
    handleCloseModal();
    alert("Thanh toán thành công! Vé đã được gửi về email.");
    if (setResponse) {
        setResponse({
            success: { show: true, message: `Booking Successful!` },
            error: { show: false, message: "" }
        });
    }
  };

  // --- CÁC HÀM CŨ & FOOTER ---
  const handleClickChangeStatus = status => {
    if (isAuthorized) {
      changeFlightStatus({ flightId: bookingStatus._id, status })
        .then(() => {
            handleCloseModal();
            updateTipsCancel(bookingStatus._id, status);
        });
    }
  };
  const handleLogin = () => { setShowLogin(false); setShowDetails(true); };

  const renderFooterActions = () => {
      if (userType === "admin") {
          return <button className="btn btn-success" onClick={() => handleClickChangeStatus("Approved")}>Approve</button>;
      }
      if (bookingStatus?.bookingStatus === "Pending") {
          return (
              <>
                  <button className="btn btn-danger" onClick={() => handleClickChangeStatus("Canceled")}>Cancel</button>
                  <button className="btn btn-warning ml-2" onClick={() => { setShowDetails(false); setShowPaymentModal(true); }}>Pay Now</button>
              </>
          );
      }
      if (!bookingStatus) {
          return <button className="btn btn-primary" onClick={handleClickBookNow}>Select Seat & Book</button>;
      }
      return null;
  };

  return (
    <React.Fragment>
      <Modal show={showDetails} onHide={handleCloseModal} size="lg" backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>
            {bookingStep === 1 && "Flight Details"}
            {bookingStep === 2 && "Select Seats"}
            {bookingStep === 3 && "Passenger Info"}
            {bookingStep === 4 && "Secure Payment"}
          </Modal.Title>
        </Modal.Header>
        
        <Modal.Body>
          {/* STEP 1: DETAILS */}
          {bookingStep === 1 && (
            <>
              {user && user.role !== "2" && !user.passportNo && (
                <Alert show={true} variant="warning">Passport missing. <Link to="/account">Update</Link></Alert>
              )}
              <h4 className="mb-3">Itinerary</h4>
              <Table responsive>
                <thead><tr><th>Airline</th><th>Code</th><th>Departure</th><th>Arrival</th><th>Duration</th></tr></thead>
                <tbody>
                  {flightData.itineraries.map((itinerary, idx) =>
                    itinerary.segments.map((seg, i) => (
                      <tr key={`${idx}-${i}`}>
                        <td>{seg.carrierCode}</td>
                        <td>{seg.carrierCode}-{seg.number}</td>
                        <td>{moment(seg.departure.at).format("HH:mm DD/MM")} <br/><small>{seg.departure.iataCode}</small></td>
                        <td>{moment(seg.arrival.at).format("HH:mm DD/MM")} <br/><small>{seg.arrival.iataCode}</small></td>
                        <td>{seg.duration ? seg.duration.replace("PT", "").toLowerCase() : ""}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
              <div className="p-3 text-right bg-light mt-3 rounded">
                <h4 className="font-weight-bold text-primary">Total: {flightData.price.total} {flightData.price.currency}</h4>
              </div>
            </>
          )}

          {/* STEP 2: CHỌN GHẾ */}
          {bookingStep === 2 && (
             <SeatSelection 
                flightId={flightData.id || "temp_id"} 
                userId={user._id}
                maxSeats={totalPassengers} 
                initialSelectedSeats={selectedSeats} 
                onSeatsConfirmed={(seats) => { setSelectedSeats(seats); setBookingStep(3); }}
                onCancel={() => setBookingStep(1)}
             />
          )}

          {/* STEP 3: ĐIỀN TÊN */}
          {bookingStep === 3 && (
              <PassengerForm 
                 selectedSeats={selectedSeats}
                 initialData={passengerInfo} 
                 onBack={() => setBookingStep(2)}
                 onSubmit={handleProceedToPayment} 
              />
          )}

          {/* STEP 4: THANH TOÁN (NHÚNG) */}
          {bookingStep === 4 && clientSecret && (
             <PaymentWrapper 
                isModal={false} 
                clientSecret={clientSecret} 
                flight={{ details: flightData }} 
                
                // Gọi hàm đã thêm log
                handleBook={handleFinalBooking} 
                
                onSuccess={handlePaymentSuccess}
                onBack={() => setBookingStep(3)} 
             />
          )}
          
          {loadingBooking && <div className="text-center p-5"><div className="spinner-border text-primary"></div></div>}
        </Modal.Body>

        {bookingStep === 1 && (
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>Close</Button>
            {renderFooterActions()}
          </Modal.Footer>
        )}
      </Modal>

      <Modal show={showLogin} onHide={() => setShowLogin(false)}><Login isModal={true} handleLogin={handleLogin} /></Modal>
      
      {/* MODAL CŨ CHO VÉ PENDING (SỬA LẠI ĐÚNG LOGIC BẠN YÊU CẦU) */}
      {showPaymentModal && (
        <PaymentWrapper 
          show={showPaymentModal}
          onHide={() => setShowPaymentModal(false)}
          flight={{ ...(bookingStatus || {}), details: flightData }}
          
          // SỬA: Dùng logic cũ cho vé Pending (Confirm status)
          handleBook={() => {
             if (bookingStatus && bookingStatus._id) {
                 return changeFlightStatus({ flightId: bookingStatus._id, status: "Confirmed" });
             }
             // Nếu không có ID thì mới gọi bookFlight (fallback)
             return bookFlight({
                userId: user._id,
                totalPrice: parseFloat(flightData.price.total),
                flightInfo: flightData,
                passengers: passengerInfo || [], 
                bookingStatus: "Confirmed"
             });
          }}
          
          onSuccess={handlePaymentSuccess}
        />
      )}
    </React.Fragment>
  );
};

export default FlightDetails;