import React, { useEffect, useState } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import {
  Portlet,
  PortletBody,
  PortletHeader
} from "../../partials/content/Portlet";
import { getAllTrips } from "../../crud/flights.crud";

const localizer = momentLocalizer(moment);

export default function Dashboard() {
  const [eventsList, setEventsList] = useState([]);

  useEffect(() => {
    getAllTrips()
      .then(result => {
        setTimeout(() => {
          const tripsData = result.data.trips || [];
          
          // --- SỬA LỖI LOGIC TẠI ĐÂY ---
          const trips = tripsData
            .filter(
              trip =>
                trip.bookingStatus !== "Pending" &&
                trip.bookingStatus !== "Canceled"
            )
            .map(trip => {
                // Ưu tiên lấy flightInfo (vé mới), nếu không có thì lấy details (vé cũ)
                return trip.flightInfo || trip.details;
            })
            // Lọc bỏ các vé bị null/undefined để tránh crash
            .filter(item => item != null); 
          // -----------------------------

          let events = [];
          
          trips.forEach(trip => { // Dùng forEach an toàn hơn map
            // Kiểm tra kỹ trip.itineraries có tồn tại không
            if (trip && trip.itineraries) {
                trip.itineraries.forEach((intinerary, index) => {
                  intinerary.segments.forEach(segment => {
                    events.push({
                      title: `${index === 0 ? "Going" : "Return"}-Departure From ${segment.departure.iataCode}`,
                      start: new Date(segment.departure.at),
                      end: new Date(segment.departure.at),
                      allDay: false
                    });
                    
                    events.push({
                      title: `${index === 0 ? "Going" : "Return"}-Arrival at ${segment.arrival.iataCode}`,
                      start: new Date(segment.arrival.at),
                      end: new Date(segment.arrival.at),
                      allDay: false
                    });
                  });
                });
            }
          });
          
          setEventsList(events);
        }, 1000);
      })
      .catch(error => console.log("error", error.message));
  }, []);

  return (
    <div className="pb-5">
      <Portlet className="kt-portlet--height-fluid-half kt-portlet--border-bottom-brand">
        <PortletHeader title="All Trips Calendar" />
        <PortletBody>
          <Calendar
            localizer={localizer}
            events={eventsList}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 500 }}
            views={['month', 'week', 'day']} // Thêm các chế độ xem
          />
        </PortletBody>
      </Portlet>
    </div>
  );
}