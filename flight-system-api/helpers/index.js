const nodeMailer = require("nodemailer");

exports.sendEmail = emailData => {
  const transporter = nodeMailer.createTransport({
    service: "gmail",
    auth: {
      user: "htkiet4104@gmail.com",
      pass: "drfyaufojszquhdy"
    }
  });
  return (
    transporter
      .sendMail(emailData)
      .then(info => console.log(`Message sent: ${info.response}`))
      .catch(err => console.log(`Problem sending email: ${err}`))
  );
};