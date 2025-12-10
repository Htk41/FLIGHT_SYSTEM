import React, { useState, useMemo } from "react";
import FlightItem from "./FlightItem";
import FlightDetails from "./FlightDetails";
import { Form } from "react-bootstrap";
import moment from "moment";

const FlightList = ({ flights, updateTipsCancel, userType }) => {
  const [perPage] = useState(10);
  const [pageNo, setPageNo] = useState(1);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState(null);
  
  const [sortOption, setSortOption] = useState("departure"); 

  // --- LOGIC SẮP XẾP CHUẨN ---
  const processedFlights = useMemo(() => {
    // 1. Copy mảng để không ảnh hưởng dữ liệu gốc
    let data = [...flights];

    // 2. Hàm lấy giá trị an toàn để so sánh
    const getPrice = (f) => {
        // Lấy giá từ nhiều nguồn, ép kiểu về số float
        const val = parseFloat(f.totalPrice || f.price?.total || f.details?.price?.total || 0);
        return isNaN(val) ? 0 : val;
    };
    
    const getDuration = (f) => {
        const segments = f.flightInfo?.itineraries?.[0]?.segments || f.itineraries?.[0]?.segments; 
        const durationStr = segments?.[0]?.duration || "PT99H";
        return moment.duration(durationStr).asMinutes();
    };

    const getDepTime = (f) => {
        const segments = f.flightInfo?.itineraries?.[0]?.segments || f.itineraries?.[0]?.segments;
        const timeStr = f.flightInfo?.departure?.at || segments?.[0]?.departure?.at;
        return new Date(timeStr).getTime();
    }

    // 3. Thực hiện sort
    data.sort((a, b) => {
        switch (sortOption) {
            case "price_asc": 
                return getPrice(a) - getPrice(b);
            case "price_desc": 
                return getPrice(b) - getPrice(a);
            case "duration": 
                return getDuration(a) - getDuration(b);
            case "departure": 
            default: 
                return getDepTime(a) - getDepTime(b);
        }
    });

    return data;
  }, [flights, sortOption]); // Chỉ chạy lại khi flights hoặc sortOption thay đổi

  const handleShowDetails = (flight) => {
    setSelectedFlight(flight);
    setShowDetails(true);
  };

  return (
    <React.Fragment>
      {/* --- SORT BAR (Đã xóa Filter Range) --- */}
      <div className="d-flex justify-content-between align-items-center mb-3 bg-white p-3 rounded shadow-sm border">
          <h5 className="m-0 text-primary">Found {processedFlights.length} flights</h5>
          <div className="d-flex align-items-center">
              <span className="mr-2 text-muted font-weight-bold">Sort by:</span>
              <Form.Control 
                  as="select" 
                  style={{width: '220px'}}
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
              >
                  <option value="departure">Departure Time</option>
                  <option value="duration">Fastest Duration</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
              </Form.Control>
          </div>
      </div>
      
      {/* --- LIST --- */}
      {processedFlights.length === 0 ? (
        <div className="text-center p-5 text-muted border rounded bg-light">
          <h4>No Flights Found</h4>
        </div>
      ) : (
        processedFlights
          .slice((pageNo - 1) * perPage, (pageNo - 1) * perPage + perPage)
          .map((flight, index) => (
            <div key={index} className="mb-3 border rounded shadow-sm bg-white">
              <FlightItem
                flight={flight}
                handleClickBookNow={() => handleShowDetails(flight)}
                bookingStatus={flight.bookingStatus ? flight : null} 
              />
            </div>
          ))
      )}

      {showDetails && selectedFlight && (
        <FlightDetails
          flight={selectedFlight}
          showDetails={showDetails}
          setShowDetails={setShowDetails}
          // Reset data an toàn
          setDetails={() => setSelectedFlight(null)}
          bookingStatus={selectedFlight.bookingStatus ? selectedFlight : null}
          updateTipsCancel={updateTipsCancel}
          userType={userType}
        />
      )}
    </React.Fragment>
  );
};

export default FlightList;