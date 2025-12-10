const { FlightBooking, FlightInventory } = require("../models/flights");
const Deals = require("../models/deals");
const Users = require("../models/users");
const mongoose = require("mongoose");
const Amadeus = require("amadeus");
const { sendEmail } = require("../helpers");
const { generateInvoicePDF } = require("../helpers/pdfGenerator");
const nodemailer = require("nodemailer"); 

require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET
});

// API TÌM KIẾM CHUYẾN BAY QUA AMADEUS
exports.getOneWayFlights = async (req, res) => {
  try {
    const { origin, destination, depart, adults, child } = req.query;
    let adultsArray = [];
    let childArray = [];
    for (let i = 0; i < adults; i++) {
      adultsArray = [
        ...adultsArray,
        {
          id: i,
          travelerType: "ADULT",
          fareOptions: ["STANDARD"]
        }
      ];
    }
    for (let i = 0; i < child; i++) {
      childArray = [
        ...childArray,
        {
          id: adults + i + 1,
          travelerType: "CHILD",
          fareOptions: ["STANDARD"]
        }
      ];
    }
    const response = await amadeus.shopping.flightOffersSearch
      .post(
        JSON.stringify({
          currencyCode: "USD",
          originDestinations: [
            {
              id: "1",
              originLocationCode: origin,
              destinationLocationCode: destination,

              departureDateTimeRange: {
                date: depart
              }
            }
          ],
          travelers: [...adultsArray, ...childArray],
          sources: ["GDS"],
          searchCriteria: {
            maxFlightOffers: 10
          }
        })
      );
    res.json({ flights: response.data });
  } catch (e) {
    await res.json({ error: e.message });
  }
};

exports.getTwoWayFlights = async (req, res) => {
  try {
    const {
      origin,
      destination,
      depart,
      returnDate,
      adults,
      child
    } = req.query;
    let adultsArray = [];
    let childArray = [];
    for (let i = 0; i < adults; i++) {
      adultsArray = [
        ...adultsArray,
        {
          id: i,
          travelerType: "ADULT",
          fareOptions: ["STANDARD"]
        }
      ];
    }
    for (let i = 0; i < child; i++) {
      childArray = [
        ...childArray,
        {
          id: adults + i + 1,
          travelerType: "CHILD",
          fareOptions: ["STANDARD"]
        }
      ];
    }
    const response = await amadeus.shopping.flightOffersSearch
      .post(
        JSON.stringify({
          currencyCode: "USD",
          originDestinations: [
            {
              id: "1",
              originLocationCode: origin,
              destinationLocationCode: destination,
              departureDateTimeRange: {
                date: depart
              }
            },
            {
              id: "2",
              originLocationCode: destination,
              destinationLocationCode: origin,
              departureDateTimeRange: {
                date: returnDate
              }
            }
          ],
          travelers: [...adultsArray, ...childArray],
          sources: ["GDS"],
          searchCriteria: {
            maxFlightOffers: 10
          }
        })
      );
    res.json({ flights: response.data });
  } catch (e) {
    await res.json({ error: e.message });
  }
};

// API phụ trợ khác từ Amadeus
exports.getAirline = async (req, res) => {
  try {
    const { airlineCodes } = req.query;
    const response = await amadeus.referenceData.airlines.get({ airlineCodes });
    res.json({ airline: response.data });
  } catch (e) {
    await res.json({ error: e.message });
  }
};

exports.getRecommended = async (req, res) => {
  try {
    const response = await amadeus.referenceData.recommendedLocations
    .get({
      cityCodes: "HAN,LON,NYC,PAR",
      travelerCountryCode: "FR"
    });
    res.json({ recommended: response.data });
  } catch (e) {
    await res.json({ error: e.message });
  }
};

exports.getRecommended = async (req, res) => {
  try {
    const response = await amadeus.referenceData.recommendedLocations.get({
      cityCodes: "HAN,LON,NYC,PAR",
      travelerCountryCode: "FR"
    });
    res.json({ recommended: response.data });
  } catch (e) {
    await res.json({ error: e.message });
  }
};

exports.getPricing = async (req, res) => {
  try {
    const response = await amadeus.travel.analytics.AirTraffic.Traveled.get({
      originCityCode: "HAN",
      period: "2025-01"
    });
    res.json({ recommended: response.data });
  } catch (e) {
    await res.json({ error: e.message });
  }
};

// API ĐẶT CHUYẾN BAY
exports.bookFlight = async (req, res) => {
  try {
    const { 
        userId, 
        passengers, 
        flightInfo, 
        totalPrice,
        bookingStatus 
    } = req.body;

    console.log("--------------- BOOK FLIGHT REQUEST ---------------");
    console.log("User ID:", userId);
    console.log("Total Price:", totalPrice);
    console.log("Passengers Count:", passengers ? passengers.length : "N/A");
    console.log("Flight Info Present:", !!flightInfo);

    // --- VALIDATION ---
    if (!userId || !passengers || !flightInfo || !totalPrice) {
      return res.status(400).json({ error: "Missing required booking information. Please check userId, passengers, flightInfo, and totalPrice." });
    }

    // Lấy thông tin user để lưu contact
    const user = await Users.findById(userId);
    
    // Tạo Booking mới dùng Model FlightBooking (Thay vì Flights)
    const newBooking = new FlightBooking({
      bookedBy: userId,
      passengers: passengers,
      flightInfo: flightInfo, // Lưu chi tiết chuyến bay
      contactEmail: user ? user.email : "",
      contactPhone: user ? user.mobileNo : "",
      totalPrice: totalPrice,
      currency: "USD",
      bookingStatus: bookingStatus || "Pending"
    });

    const savedBooking = await newBooking.save();

    if (savedBooking && bookingStatus === "Confirmed") {
        const amadeusId = flightInfo.id || flightInfo._id; 

        // Lấy danh sách số ghế từ hành khách
        const seatNumbers = passengers.map(p => p.seatNumber);

        if (amadeusId && seatNumbers.length > 0) {
            await FlightInventory.updateOne(
                { amadeusFlightId: amadeusId },
                {
                    $set: {
                        "seats.$[elem].status": "booked", // Chuyển thành đã bán
                        "seats.$[elem].heldBy": userId,   // Lưu người mua
                        "seats.$[elem].heldAt": new Date()
                    }
                },
                {
                    // Update tất cả các ghế khớp với seatNumbers
                    arrayFilters: [{ "elem.number": { $in: seatNumbers } }]
                }
            );
        }

        // Gửi mail xác nhận
        if (user) {
            sendEmail({
              to: user.email,
              subject: "Flight Booking Confirmed",
              html: `<p>Thank you! Your booking <b>${savedBooking._id}</b> is confirmed.</p>`
            });
        }

      res.json({
        success: true,
        message: "Booking created successfully!",
        bookingId: savedBooking._id
      });
    } else {
      res.status(400).json({ error: "Could not create booking" });
    }
  } catch (e) {
    console.error("BookFlight Error:", e);
    res.status(500).json({ error: e.message });
  }
};

// API QUẢN LÝ GHẾ 

exports.getSeatMap = async (req, res) => {
  try {
    const { amadeusId } = req.query;
    if (!amadeusId) return res.status(400).json({ error: "Missing amadeusId" });

    let inventory = await FlightInventory.findOne({ amadeusFlightId: amadeusId });

    // Tạo ghế giả lập 
    if (!inventory) {
      const rows = 20; const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
      let newSeats = [];
      for (let r = 1; r <= rows; r++) {
        for (let c of cols) {
          newSeats.push({ number: `${r}${c}`, status: 'available', price: (r <= 5) ? 20 : 0 });
        }
      }
      inventory = await FlightInventory.create({ amadeusFlightId: amadeusId, seats: newSeats });
    }
    res.json({ seats: inventory.seats });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.holdSeat = async (req, res) => {
  try {
    const { amadeusId, seatNumber, userId } = req.body;
    const result = await FlightInventory.findOneAndUpdate(
      { amadeusFlightId: amadeusId, seats: { $elemMatch: { number: seatNumber, status: "available" } } },
      { $set: { "seats.$.status": "held", "seats.$.heldBy": userId, "seats.$.heldAt": new Date() } },
      { new: true }
    );
    if (!result) return res.status(409).json({ message: `Sorry, seat ${seatNumber} was just taken by someone else!` });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.releaseSeat = async (req, res) => {
  try {
    const { amadeusId, seatNumber, userId } = req.body;

    // Tìm ghế đang được giữ bởi CHÍNH user này và reset
    const result = await FlightInventory.findOneAndUpdate(
      {
        amadeusFlightId: amadeusId,
        seats: { 
          $elemMatch: { 
            number: seatNumber, 
            status: "held",
            heldBy: userId 
          } 
        }
      },
      {
        $set: {
          "seats.$.status": "available",
          "seats.$.heldBy": null,
          "seats.$.heldAt": null
        }
      },
      { new: true }
    );

    if (!result) {
        return res.status(400).json({ message: "Không thể hủy ghế này (hoặc đã bị hủy rồi)." });
    }

    res.json({ success: true, message: "Đã hủy giữ ghế." });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.getUserTrips = async (req, res) => {
  try {
    const { userId } = req.params;
    const trips = await FlightBooking.find({ bookedBy: mongoose.Types.ObjectId(userId) })
                                   .populate("bookedBy")
                                   .sort({ createdAt: -1 }); // Mới nhất trước
    res.json({ trips });
  } catch (e) { res.json({ error: e.message }); }
};

exports.getAllTrips = async (req, res) => {
  try {
    const trips = await FlightBooking.find().populate("bookedBy").sort({ createdAt: -1 });
    res.json({ trips });
  } catch (e) { res.json({ error: e.message }); }
};

exports.changeFlightStatus = async (req, res) => {
  try {
    const { flightId, status } = req.body;
    
    const trip = await Flights.findOneAndUpdate(
      { _id: mongoose.Types.ObjectId(flightId) },
      { bookingStatus: status },
      { new: true }
    ).populate("bookedBy");

    if (trip) {
      // 2. Nếu Confirm thì gửi mail
      if (status === "Confirmed" && trip.bookedBy) {
        console.log("Đang chuẩn bị gửi email...");
        
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: "htkiet4104@gmail.com", 
            pass: "drfyaufojszquhdy",  
          },
        });

        // Tạo PDF
        const doc = generateInvoicePDF(trip, trip.bookedBy);
        
        const mailOptions = {
          from: '"Flight System" <no-reply@flight.com>',
          to: trip.bookedBy.email,
          subject: `Vé điện tử / E-Ticket: ${trip._id.toString().slice(-6).toUpperCase()}`,
          html: `
            <h3>Cảm ơn bạn đã đặt vé!</h3>
            <p>Xin chào ${trip.bookedBy.firstName},</p>
            <p>Giao dịch của bạn đã thành công. Vui lòng xem vé điện tử đính kèm.</p>
          `,
          attachments: [
            {
              filename: `Ticket-${trip._id}.pdf`,
              content: doc, 
              contentType: "application/pdf",
            },
          ],
        };
        
        // 1. Gọi lệnh gửi mail
        transporter.sendMail(mailOptions, (err, info) => {
           if (err) {
             console.error("LỖI GỬI MAIL:", err); 
           } else {
             console.log("GỬI MAIL THÀNH CÔNG:", info.response);
           }
        });

        doc.end(); 
        
      }

      await res.json({ trip });
    } else {
      await res.status(400).json({ error: "Could not update Flight" });
    }
  } catch (e) {
    console.log(e);
    await res.json({ error: e.message });
  }
};

exports.confirmFlight = async (req, res) => {
  try {
    const { flightId, token, amount } = req.body;
    return stripe.customers
      .create({
        email: token.email,
        source: token.id
      })
      .then(customer => {
        stripe.charges.create(
          {
            amount: amount,
            currency: "usd",
            customer: customer.id
          },
          { idempotencyKey: flightId }
        );
      })
      .then(result => {
        Flights.findOneAndUpdate(
          {
            _id: mongoose.Types.ObjectId(flightId)
          },
          {
            bookingStatus: "Confirmed"
          }
        ).then(() => {
          const emailData = {
            to: token.email,
            subject: "Flight Confirmed",
            html: `<p>Dear customer,</p><p>Your payment has been made successfully and your flight with id (${flightId}) has been confirmed successfully</p>`
          };
          sendEmail(emailData);
          res.json({
            result
          });
        });
      })
      .catch(error => {
        res.json({ error: "Could not make payment", message: error.message });
      });
  } catch (e) {
    await res.json({ error: e.message });
  }
};

exports.uploadEditorImage = (req, res) => {
  res.json({
    uploaded: true,
    url: URL.createObjectURL(req.file)
  });
};

exports.createWorldTour = async (req, res) => {
  try {
    const details = JSON.parse(req.body.details);
    const deal = await Deals.findOne({ "details.country": details.country });
    if (deal) {
      const updatedDeal = await Deals.findOneAndUpdate(
        { "details.country": details.country },
        {
          type: "WorldTour",
          "details.country": details.country,
          $push: {
            "details.packages": {
              _id: mongoose.Types.ObjectId(),
              title: details.packageTitle,
              price: details.packagePrice,
              description: details.packageDescription,
              image: req.file.filename,
              bookedBy: []
            }
          }
        }
      );
      await res.json({
        success: true,
        message: `Tour Created Successfully`
      });
    } else {
      const newDeal = await Deals.create({
        type: "WorldTour",
        "details.country": details.country,

        "details.packages": {
          _id: mongoose.Types.ObjectId(),
          title: details.packageTitle,
          price: details.packagePrice,
          description: details.packageDescription,
          image: req.file.filename,
          bookedBy: []
        }
      });
      await res.json({
        success: true,
        message: `Tour Created Successfully`
      });
    }
  } catch (error) {
    console.log("error", error.message);
    await res.json({ message: error.message });
  }
};

exports.createDeals = async (req, res) => {
  try {
    const details = JSON.parse(req.body.details);
    const {
      packageTitle,
      numberOfPeople,
      numberOfDays,
      packagePrice,
      packageDescription
    } = details;

    const newDeal = await Deals.create({
      type: "Deals",
      "details.packages": {
        _id: mongoose.Types.ObjectId(),
        title: packageTitle,
        price: packagePrice,
        numberOfDays,
        numberOfPeople,
        image: req.file.filename,
        description: packageDescription,
        bookedBy: []
      }
    });
    await res.json({
      success: true,
      message: `Package Created Successfully`
    });
  } catch (error) {
    console.log("error", error.message);
    await res.json({ message: error.message });
  }
};

exports.getWorldTour = async (req, res) => {
  try {
    const deals = await Deals.find({ type: "WorldTour" }).populate("bookedBy");

    await res.json({
      success: true,
      deals
    });
  } catch (error) {
    console.log("error", error.message);
    await res.json({ message: error.message });
  }
};
exports.getDeals = async (req, res) => {
  try {
    const deals = await Deals.aggregate([
      { $match: { type: "Deals" } },
      { $unwind: "$details.packages" }
    ]);

    await res.json({
      success: true,
      deals
    });
  } catch (error) {
    console.log("error", error.message);
    await res.json({ message: error.message });
  }
};

exports.getWorldTourPackage = async (req, res) => {
  try {
    const { country, packageId } = req.query;
    const deals = await Deals.aggregate([
      { $match: { type: "WorldTour", "details.country": country } },
      { $unwind: "$details.packages" },
      { $match: { "details.packages._id": mongoose.Types.ObjectId(packageId) } }
    ]);
    const result = await Deals.populate(deals, [
      {
        path: "details.packages.bookedBy",
        model: "Users",
        select: "firstName lastName email mobileNo passportNo"
      }
    ]);
    await res.json({
      success: true,
      deals: result
    });
  } catch (error) {
    console.log("error", error.message);
    await res.json({ message: error.message });
  }
};

exports.getDealPackage = async (req, res) => {
  try {
    const { dealId } = req.query;
    const deals = await Deals.aggregate([
      { $match: { _id: mongoose.Types.ObjectId(dealId) } },
      { $unwind: "$details.packages" }
    ]);
    const result = await Deals.populate(deals, [
      {
        path: "details.packages.bookedBy",
        model: "Users",
        select: "firstName lastName email mobileNo passportNo"
      }
    ]);
    await res.json({
      success: true,
      deals: result
    });
  } catch (error) {
    console.log("error", error.message);
    await res.json({ message: error.message });
  }
};

exports.bookWorldTour = async (req, res) => {
  try {
    // Bỏ token, amount vì đã thanh toán ở frontend
    const { packageId, userId, dealId } = req.body; 
    
    // Chỉ thực hiện lưu vào Database
    Deals.findOneAndUpdate(
      {
        _id: dealId,
        "details.packages._id": mongoose.Types.ObjectId(packageId)
      },
      {
        $addToSet: {
          "details.packages.$.bookedBy": mongoose.Types.ObjectId(userId)
        }
      },
      { new: true }
    ).then(deal => {
      res.json({ deal });
    });
  } catch (e) {
    await res.json({ error: e.message });
  }
};

exports.deleteWorldTourPackage = async (req, res) => {
  try {
    const { packageId, dealId } = req.body;
    console.log("req.body", req.body);

    Deals.findOneAndUpdate(
      {
        _id: dealId
      },
      {
        $pull: {
          "details.packages": {
            _id: mongoose.Types.ObjectId(packageId)
          }
        }
      },

      { new: true }
    ).then(deal => {
      res.json({
        deal
      });
    });
  } catch (e) {
    await res.json({ error: e.message });
  }
};

exports.deleteDealPackage = async (req, res) => {
  try {
    const { dealId } = req.body;

    Deals.findOneAndRemove({
      _id: dealId
    }).then(deal => {
      res.json({
        deal
      });
    });
  } catch (e) {
    await res.json({ error: e.message });
  }
};

exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency } = req.body;
    // Tạo PaymentIntent với Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, 
      currency: currency || "usd",
      automatic_payment_methods: {
        enabled: true,
      },
    });
    res.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

exports.confirmWorldTourBooking = async (req, res) => {
  try {
    const { packageId, userId, dealId } = req.body;
    
    Deals.findOneAndUpdate(
      {
        _id: dealId,
        "details.packages._id": mongoose.Types.ObjectId(packageId)
      },
      {
        $addToSet: {
          "details.packages.$.bookedBy": mongoose.Types.ObjectId(userId)
        }
      },
      { new: true }
    ).then(deal => {
      res.json({ success: true, deal });
    }).catch(err => {
      res.status(400).json({ error: "DB Update failed", message: err.message });
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};
