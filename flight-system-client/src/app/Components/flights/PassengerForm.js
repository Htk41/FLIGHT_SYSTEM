import React, { useState, useEffect } from "react";
import { Form, Button, Accordion, Card } from "react-bootstrap";

const PassengerForm = ({ selectedSeats, onSubmit, onBack, initialData }) => {
  
  // State lưu danh sách hành khách
  const [passengers, setPassengers] = useState([]);

  useEffect(() => {
    // Logic mới:
    // Nếu có initialData (quay lại từ bước thanh toán), ta dùng lại nó.
    // cập nhật lại seatNumber cho khớp với các ghế mới chọn (nếu user đổi ghế).
    
    if (initialData && initialData.length > 0) {
        const mergedData = initialData.map((pax, index) => ({
            ...pax,
            // Cập nhật ghế mới tương ứng theo thứ tự (Người 1 -> Ghế 1, Người 2 -> Ghế 2)
            seatNumber: selectedSeats[index] || "Pending" 
        }));
        setPassengers(mergedData);
    } else {
        // Tạo mới hoàn toàn dựa trên số ghế đã chọn
        const newPassengers = selectedSeats.map(seat => ({
            firstName: "",
            lastName: "",
            passportNo: "",
            nationality: "Vietnam",
            seatNumber: seat
        }));
        setPassengers(newPassengers);
    }
  }, [selectedSeats, initialData]); // Chạy lại khi danh sách ghế thay đổi

  const handleChange = (index, field, value) => {
    const updated = [...passengers];
    updated[index][field] = value;
    setPassengers(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(passengers);
  };

  return (
    <div className="p-3">
      <h5 className="text-center mb-3">Passenger Information</h5>
      <Form onSubmit={handleSubmit}>
        <Accordion defaultActiveKey="0">
            {passengers.map((pax, index) => (
                <Card key={index} className="mb-2 border">
                    <Accordion.Toggle as={Card.Header} eventKey={index.toString()} className="bg-light cursor-pointer font-weight-bold d-flex justify-content-between">
                        <span>Passenger {index + 1}</span>
                        <span className="text-primary">Seat: {pax.seatNumber}</span>
                    </Accordion.Toggle>
                    <Accordion.Collapse eventKey={index.toString()}>
                        <Card.Body>
                            <div className="row">
                                <div className="col-md-6">
                                    <Form.Group>
                                    <Form.Label>First Name</Form.Label>
                                    <Form.Control 
                                        required 
                                        value={pax.firstName || ''}
                                        onChange={(e) => handleChange(index, 'firstName', e.target.value)}
                                        placeholder="e.g. John"
                                    />
                                    </Form.Group>
                                </div>
                                <div className="col-md-6">
                                    <Form.Group>
                                    <Form.Label>Last Name</Form.Label>
                                    <Form.Control 
                                        required 
                                        value={pax.lastName || ''}
                                        onChange={(e) => handleChange(index, 'lastName', e.target.value)}
                                        placeholder="e.g. Doe"
                                    />
                                    </Form.Group>
                                </div>
                            </div>

                            <Form.Group>
                            <Form.Label>Passport / ID Number</Form.Label>
                            <Form.Control 
                                required 
                                value={pax.passportNo || ''}
                                onChange={(e) => handleChange(index, 'passportNo', e.target.value)}
                            />
                            </Form.Group>
                            
                            <Form.Group>
                            <Form.Label>Nationality</Form.Label>
                            <Form.Control 
                                value={pax.nationality || 'Vietnam'}
                                onChange={(e) => handleChange(index, 'nationality', e.target.value)}
                            />
                            </Form.Group>
                        </Card.Body>
                    </Accordion.Collapse>
                </Card>
            ))}
        </Accordion>

        <div className="d-flex justify-content-between mt-4">
            <Button variant="secondary" onClick={onBack}>Reselect Seats</Button>
            <Button variant="primary" type="submit">Proceed to Payment</Button>
        </div>
      </Form>
    </div>
  );
};

export default PassengerForm;