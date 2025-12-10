import React, { useEffect, useState, useRef } from "react";
import { getSeatMap, holdSeat, releaseSeat } from "../../crud/flights.crud";
import { Spinner, Alert, Button } from "react-bootstrap";

const SeatSelection = ({ 
    flightId, 
    userId, 
    maxSeats, 
    onSeatsConfirmed, 
    onCancel,
    initialSelectedSeats = [] // Nhận danh sách ghế đã chọn từ trước (nếu có)
}) => {
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Khởi tạo state bằng props truyền vào để giữ lại ghế khi Back
  const [mySeats, setMySeats] = useState(initialSelectedSeats);
  
  // Dùng ref để giữ interval ID cho việc polling
  const pollingRef = useRef(null);

  useEffect(() => {
    loadSeats(); // Load ngay lần đầu
    
    // --- REAL-TIME POLLING ---
    // Cứ 3 giây gọi API load lại ghế 1 lần để xem có ai đặt chưa
    pollingRef.current = setInterval(() => {
        loadSeats(true); // true = silent load (không hiện loading spinner)
    }, 3000);

    // Cleanup khi component unmount (tắt modal hoặc chuyển bước)
    return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [flightId]);

  const loadSeats = (isSilent = false) => {
    if (!isSilent) setLoading(true);
    getSeatMap(flightId)
      .then((res) => {
        // Sắp xếp ghế cho đẹp (1A, 1B, 1C...)
        const sortedSeats = (res.data.seats || []).sort((a, b) => 
            a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' })
        );
        setSeats(sortedSeats);
        if (!isSilent) setLoading(false);
      })
      .catch((err) => {
        if (!isSilent) {
             setError("Could not load seat map.");
             setLoading(false);
        }
      });
  };

  const handleSeatClick = (seat) => {
    setError(""); 

    // --- CASE 1: BỎ CHỌN (UN-HOLD) ---
    if (mySeats.includes(seat.number)) {
        setLoading(true);
        releaseSeat({
            amadeusId: flightId,
            seatNumber: seat.number,
            userId: userId
        }).then(() => {
            // Xóa khỏi danh sách local
            setMySeats(mySeats.filter(s => s !== seat.number));
            loadSeats(); // Load lại để thấy nó xanh trở lại
            setLoading(false);
        }).catch(() => {
             setLoading(false);
             // Vẫn cho xóa ở local để trải nghiệm mượt, dù server lỗi
             setMySeats(mySeats.filter(s => s !== seat.number));
        });
        return; 
    }

    // --- CASE 2: CHỌN MỚI ---
    if (seat.status !== "available") return;

    if (mySeats.length >= maxSeats) {
        setError(`You can only select ${maxSeats} seat(s). Please unselect one first.`);
        return;
    }

    setLoading(true);
    holdSeat({
      amadeusId: flightId,
      seatNumber: seat.number,
      userId: userId,
    })
      .then((res) => {
        setLoading(false);
        setMySeats([...mySeats, seat.number]);
        loadSeats(); 
      })
      .catch((err) => {
        setLoading(false);
        // Bắt lỗi 409 khi có người khác vừa nhanh tay hơn
        if (err.response && err.response.status === 409) {
             setError("Too slow! This seat was just taken by another user.");
             loadSeats(); // Load lại ngay để thấy nó đỏ
        } else {
             setError("Error holding seat.");
        }
      });
  };

  // Helper to render a single seat button
  const renderSeat = (seatNumber) => {
      const seat = seats.find(s => s.number === seatNumber);
      if (!seat) return <div className="seat-placeholder" style={{width: 40, height: 40, margin: 4}}></div>;

      const isSelectedByMe = mySeats.includes(seat.number);
      let bgColor = "#e0e0e0"; 
      let cursor = "not-allowed";
      let border = "1px solid #ccc";

      if (seat.status === "available") {
          bgColor = "#fff"; 
          border = "1px solid #28a745"; 
          cursor = "pointer";
      } else if (seat.status === "booked") {
          bgColor = "#dc3545"; 
          border = "1px solid #dc3545";
      } else if (seat.status === "held") {
          bgColor = isSelectedByMe ? "#ffc107" : "#6c757d"; 
          border = isSelectedByMe ? "1px solid #ffc107" : "1px solid #6c757d";
          if (isSelectedByMe) cursor = "pointer"; 
      }

      return (
          <div 
            key={seatNumber}
            onClick={() => handleSeatClick(seat)}
            style={{
                width: 40,
                height: 40,
                margin: 4,
                backgroundColor: bgColor,
                border: border,
                borderRadius: "8px 8px 0 0", 
                cursor: cursor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: "bold",
                color: (seat.status === "booked" || (seat.status === "held" && !isSelectedByMe)) ? "white" : "black"
            }}
          >
              {seat.number.replace(/[0-9]/g, '')} {/* Only show letter A, B... inside */}
          </div>
      );
  };

  // Generate rows 
  const renderRows = () => {
      let rows = [];
      for (let i = 1; i <= 20; i++) {
          rows.push(
              <div key={i} className="d-flex align-items-center mb-2">
                  <div style={{width: 25, textAlign: 'center', fontWeight: 'bold', marginRight: 5}}>{i}</div>
                  {/* Left Side: ABC */}
                  <div className="d-flex">
                      {renderSeat(`${i}A`)}
                      {renderSeat(`${i}B`)}
                      {renderSeat(`${i}C`)}
                  </div>
                  
                  {/* Aisle (Lối đi) */}
                  <div style={{width: 30, textAlign: 'center', color: '#999', fontSize: 10, alignSelf:'center'}}></div>

                  {/* Right Side: DEF */}
                  <div className="d-flex">
                      {renderSeat(`${i}D`)}
                      {renderSeat(`${i}E`)}
                      {renderSeat(`${i}F`)}
                  </div>
              </div>
          );
      }
      return rows;
  };

  return (
    <div className="p-3">
      <h5 className="text-center mb-2">Select Seats ({mySeats.length}/{maxSeats})</h5>
      
      {error && <Alert variant="danger" className="text-center py-2">{error}</Alert>}
      
      {loading && <div className="text-center mb-2"><Spinner animation="border" size="sm" /> Updating...</div>}

      {/* Seat Map Container */}
      <div 
        className="seat-map-container bg-light border rounded p-4 mx-auto" 
        style={{
            maxWidth: "420px", 
            maxHeight: "400px", 
            overflowY: "auto",
            position: "relative"
        }}
      >
          {/* Cockpit / Front of plane visual */}
          <div className="text-center mb-4 text-muted" style={{borderBottom: '2px solid #ddd', paddingBottom: 10}}>
             <i className="fa fa-plane fa-2x"></i> <br/> FRONT
          </div>

          {/* Seat Letters Header */}
          <div className="d-flex align-items-center mb-2 font-weight-bold text-muted">
              <div style={{width: 25}}></div>
              <div className="d-flex justify-content-around" style={{width: 132}}>
                  <span>A</span><span>B</span><span>C</span>
              </div>
              <div style={{width: 30}}></div>
              <div className="d-flex justify-content-around" style={{width: 132}}>
                  <span>D</span><span>E</span><span>F</span>
              </div>
          </div>

          {/* Render All Rows */}
          {renderRows()}

      </div>

      {/* Legend */}
      <div className="mt-3 d-flex justify-content-center small text-muted">
         <div className="d-flex align-items-center mr-3">
             <div style={{width: 15, height: 15, border: '1px solid #28a745', borderRadius: '4px 4px 0 0', marginRight: 5}}></div> Available
         </div>
         <div className="d-flex align-items-center mr-3">
             <div style={{width: 15, height: 15, background: '#ffc107', borderRadius: '4px 4px 0 0', marginRight: 5}}></div> Your Seat
         </div>
         <div className="d-flex align-items-center">
             <div style={{width: 15, height: 15, background: '#dc3545', borderRadius: '4px 4px 0 0', marginRight: 5}}></div> Taken
         </div>
      </div>

      {/* Actions */}
      <div className="mt-4 d-flex justify-content-between align-items-center border-top pt-3">
          <Button variant="secondary" onClick={onCancel}>Back</Button>
          <Button 
            variant="primary" 
            disabled={mySeats.length !== maxSeats} 
            onClick={() => onSeatsConfirmed(mySeats)}
          >
             Confirm & Continue
          </Button>
      </div>
    </div>
  );
};

export default SeatSelection;