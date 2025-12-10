const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

// 1. Schema cho từng ghế ngồi (Nằm trong kho ghế)
const seatSchema = new mongoose.Schema({
  number: String,     
  status: { 
    type: String, 
    enum: ["available", "held", "booked"], 
    default: "available" 
  },
  price: Number,       // Giá ghế (nếu có ghế VIP)
  heldBy: { type: ObjectId, ref: "Users", default: null }, // Ai đang giữ
  heldAt: { type: Date, default: null } // Thời gian giữ ghế
}, { _id: false });

// 2. Schema Kho ghế (Quản lý sơ đồ ghế cho từng chuyến bay)
const inventorySchema = new mongoose.Schema({
  amadeusFlightId: { type: String, required: true, unique: true },
  seats: [seatSchema],
  totalSeats: Number
});

// 3. Schema Đơn đặt vé (Vé máy bay thực tế)
const flightBookingSchema = new mongoose.Schema({
  bookedBy: { type: ObjectId, ref: "Users" },
  
  passengers: [], 
  flightInfo: {
     type: mongoose.Schema.Types.Mixed 
  },

  contactEmail: String,
  contactPhone: String,
  totalPrice: Number,
  currency: String,
  bookingStatus: { 
    type: String, 
    default: "Pending" 
  },
  createdAt: { type: Date, default: Date.now }
});

// Xuất khẩu 2 models
module.exports = {
  FlightBooking: mongoose.model("FlightBooking", flightBookingSchema),
  FlightInventory: mongoose.model("FlightInventory", inventorySchema)
};