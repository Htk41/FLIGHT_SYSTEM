const express = require("express");
const mongoose = require("mongoose");
const AuthRouter = require("./routes/auth");
const userRouter = require("./routes/users");
const flightRouter = require("./routes/flight");
const blogsRouter = require("./routes/blogs");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const http = require("http");

const PORT = process.env.PORT || 3001;
const app = express();
const server = http.createServer(app);

app.use(compression());

//MongoDB Connection
mongoose.set("useNewUrlParser", true);
mongoose.set("useFindAndModify", false);
mongoose.set("useCreateIndex", true);