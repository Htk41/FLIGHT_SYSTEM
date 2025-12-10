import React from "react";
import { Button } from "react-bootstrap";
import moment from "moment";

const FlightItem = ({ flight, handleClickBookNow, bookingStatus }) => {
  // --- LOGIC LẤY DỮ LIỆU ĐƯỢC SỬA LẠI ---
  console.log("🔍 Checking Flight ID:", flight._id, flight);
  const getData = () => {
      // Trường hợp 1: Dữ liệu chuẩn mới (nằm trong flightInfo)
      if (flight.flightInfo) {
          // Đôi khi flightInfo lại bị lồng thêm 1 cấp nữa do code lưu chưa chuẩn
          // Ví dụ: flight.flightInfo.flightInfo...
          if (flight.flightInfo.flightInfo) return flight.flightInfo.flightInfo;
          
          return flight.flightInfo;
      }
      
      // Trường hợp 2: Dữ liệu Search (nằm ngay root)
      // Dấu hiệu nhận biết: Có trường itineraries ngay bên ngoài
      if (flight.itineraries) return flight;

      // Trường hợp 3: Fallback (Details cũ)
      if (flight.details) return flight.details;

      return {};
  };

  const data = getData();
  
  // Lấy segment đầu tiên. Dùng ?. để tránh crash nếu dữ liệu lỗi
  const segment = data.itineraries?.[0]?.segments?.[0];
  
  // Lấy giá tiền
  const price = flight.totalPrice || data.price?.total || "0";
  const currency = flight.currency || data.price?.currency || "USD";

  // Nếu không tìm thấy thông tin chuyến bay, không render gì cả (tránh vỡ giao diện)
  if (!segment) {
      return (
          <div className="p-3 border rounded mb-3 bg-light text-danger text-center">
              <i className="fa fa-exclamation-triangle mr-2"></i>
              Dữ liệu chuyến bay bị lỗi hoặc không tồn tại (ID: {flight._id})
          </div>
      );
  }

  // Tính toán thời gian
  const duration = moment.duration(segment.duration);
  const durationStr = `${duration.hours()}h ${duration.minutes()}m`;

  return (
    <div className="flight-item p-3">
      <div className="row align-items-center">
        {/* Cột 1: Hãng bay */}
        <div className="col-md-3">
          <h5 className="text-primary mb-0">{segment.carrierCode}-{segment.number}</h5>
          <small className="text-muted">Aircraft: {segment.aircraft?.code || 'N/A'}</small>
        </div>

        {/* Cột 2: Thời gian bay */}
        <div className="col-md-5">
           <div className="d-flex justify-content-between align-items-center text-center">
              {/* Điểm đi */}
              <div>
                 <div className="font-weight-bold h5 mb-0">{moment(segment.departure.at).format("HH:mm")}</div>
                 <div className="badge badge-light border">{segment.departure.iataCode}</div>
              </div>
              
              {/* Đường nối */}
              <div className="px-3 text-muted small">
                  <div>{durationStr}</div>
                  <div style={{borderTop: '1px solid #ddd', width: '50px', margin: '5px auto'}}></div>
                  <div>Direct</div>
              </div>

              {/* Điểm đến */}
              <div>
                 <div className="font-weight-bold h5 mb-0">{moment(segment.arrival.at).format("HH:mm")}</div>
                 <div className="badge badge-light border">{segment.arrival.iataCode}</div>
              </div>
           </div>
        </div>

        {/* Cột 3: Giá & Nút bấm */}
        <div className="col-md-4 text-right">
           <h4 className="text-success font-weight-bold mb-2">{price} {currency}</h4>
           
           {bookingStatus && (
               <span className={`badge badge-${
                   bookingStatus.bookingStatus === 'Confirmed' ? 'success' : 
                   bookingStatus.bookingStatus === 'Canceled' ? 'danger' : 'warning'
               } mr-2`}>
                   {bookingStatus.bookingStatus}
               </span>
           )}

           <Button 
                variant={bookingStatus ? "outline-info" : "primary"} 
                size="sm" 
                onClick={handleClickBookNow}
           >
               {bookingStatus ? "View Details" : "Select & Book"}
           </Button>
        </div>
      </div>
    </div>
  );
};

export default FlightItem;