const PDFDocument = require("pdfkit");

exports.generateInvoicePDF = (flight, user) => {
  const doc = new PDFDocument({ margin: 50 });

  // 1. LOGO & HEADER
  doc
    .fillColor("#444444")
    .fontSize(20)
    .text("E-TICKET / VÉ ĐIỆN TỬ", 110, 57)
    .fontSize(10)
    .text("Flight Booking System", 200, 50, { align: "right" })
    .text("Hotline: 1900 1234", 200, 65, { align: "right" })
    .moveDown();

  // 2. THÔNG TIN ĐẶT CHỖ (Lấy từ DB)
  const bookingRef = flight._id.toString().slice(-6).toUpperCase();
  const bookingDate = new Date().toLocaleDateString("en-GB"); // dd/mm/yyyy

  doc
    .fontSize(10)
    .text(`Mã đặt chỗ / Booking Ref:`, 50, 130)
    .font("Helvetica-Bold").text(bookingRef, 200, 130) // In đậm mã
    .font("Helvetica").text(`Ngày đặt / Date:`, 50, 145)
    .text(bookingDate, 200, 145)
    .text(`Hành khách / Passenger:`, 50, 160)
    .font("Helvetica-Bold").text(`${user.firstName} ${user.lastName}`.toUpperCase(), 200, 160);

  doc.moveDown();
  doc.moveTo(50, 185).lineTo(550, 185).stroke(); 

  let flightCode, departure, arrival, time;

  // Kiểm tra xem đây là vé máy bay hay tour
  if (flight.details?.itineraries && flight.details.itineraries[0]) {
      // A. (VÉ MÁY BAY)
      const segment = flight.details.itineraries[0].segments[0];
      flightCode = `${segment.carrierCode} ${segment.number}`;
      departure = segment.departure.iataCode;
      arrival = segment.arrival.iataCode;
      time = new Date(segment.departure.at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  } else if (flight.details?.packages) {
      // B. (TOUR DU LỊCH)
      flightCode = "TOUR-VIP";
      departure = flight.details.country || "HANOI"; 
      arrival = flight.details.packages.title ? flight.details.packages.title.substring(0, 15) + "..." : "WORLD TOUR";
      time = "08:00 AM";
  } else {
    //   flightCode = `${getRandom(randomAirlines)} ${Math.floor(Math.random() * 900) + 100}`;
    //   departure = getRandom(randomCities);
    //   arrival = getRandom(randomCities);
    //   while (arrival === departure) arrival = getRandom(randomCities); // Tránh trùng
    //   time = `${Math.floor(Math.random() * 12) + 1}:${Math.floor(Math.random() * 5)}0 ${Math.random() > 0.5 ? "AM" : "PM"}`;
  }

  // 4. VẼ THÔNG TIN CHUYẾN BAY
  const yPos = 210;
  
  // Cột 1: Chuyến bay
  doc.font("Helvetica").fontSize(10).text("Chuyến bay / Flight", 50, yPos);
  doc.font("Helvetica-Bold").fontSize(14).text(flightCode, 50, yPos + 15);

  // Cột 2: Điểm đi
  doc.font("Helvetica").fontSize(10).text("Từ / From", 200, yPos);
  doc.font("Helvetica-Bold").fontSize(18).text(departure, 200, yPos + 15);

  // Icon máy bay (giả lập bằng text)
  doc.font("Helvetica").fontSize(12).text("✈", 280, yPos + 20);

  // Cột 3: Điểm đến
  doc.font("Helvetica").fontSize(10).text("Đến / To", 350, yPos);
  doc.font("Helvetica-Bold").fontSize(18).text(arrival, 350, yPos + 15);

  // Cột 4: Giờ bay
  doc.font("Helvetica").fontSize(10).text("Giờ / Time", 480, yPos);
  doc.text(time, 480, yPos + 15);

  // 5. GIÁ VÉ
  doc.moveDown(4);
  const price = flight.details?.price?.total || flight.details?.packages?.price || "100.00";
  const currency = flight.details?.price?.currency || "USD";
  
  doc.rect(50, 300, 500, 40).fill("#f0f0f0").stroke(); // Hộp màu xám
  doc.fillColor("black")
     .fontSize(12)
     .text(`TỔNG THANH TOÁN / TOTAL PAID:`, 70, 313)
     .font("Helvetica-Bold")
     .text(`${price} ${currency}`, 400, 313, { align: "right", width: 130 });

  // 6. MÃ VẠCH (Giả lập cho đẹp)
  doc.font("Helvetica").fontSize(10).fillColor("black");
  doc.text("------------------------------------------------------------", 50, 400, { align: "center" });
  doc.text(`||| || ||| | ||| || ${bookingRef} ||| || || |||`, 50, 415, { align: "center" });

  // 7. FOOTER
  doc
    .fontSize(10)
    .text(
      "Vui lòng xuất trình vé này tại quầy làm thủ tục.",
      50,
      500,
      { align: "center", width: 500 }
    )
    .text("Have a safe flight!", { align: "center" });

  return doc;
};