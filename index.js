const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const port = 3333;
const dotenv = require("dotenv");
const auth = require('./src/middleware/auth')

dotenv.config();

app.use(express.json());

var mysql = require("mysql");
var connection = mysql.createConnection({
  host: "sql6.freemysqlhosting.net",
  user: "sql6404970",
  password: process.env.password,
  database: "sql6404970",
});

connection.connect((err) => {
  if (err) {
    console.log(err, "errror");
  } else {
    console.log("Connected!");
  }
});

app.post("/register", async (req, res) => {
  const token = jwt.sign({ email: req.body.Email.toString() }, "thisissecret");
  connection.query(
    `INSERT INTO customer (Name,Email,DOB,password,token) values ('${req.body.Name}', '${req.body.Email}', '${req.body.DOB}', '${req.body.password}', '${token}')`,
    (err, rows) => {
      if (err) {
        console.log(err);
        return res.status(400).send("fuck");
      }
      res.send(rows);
      console.log(rows.insertID);
      const token = jwt.sign({ id: rows.insertID.toString() }, "thisissecret");
    }
  );
});

app.post("/login", async (req, res) => {
  let user;
  connection.query(
    `select * from customer where email='${req.body.Email}'`,
    (err, rows) => {
      if (err) {
        console.log(err);
        return res.status(404).send();
      }
      console.log(rows[0].customerID);
      user = { ...rows[0] };
      user.password = "";
      res.send(user);
    }
  );
});

app.post('/test',auth, (req,res) => {
    res.send(req.user)
})


app.get("/", (req, res) => {
  res.send("hello");
});

app.listen(port, () => {
  console.log("Server is up on port" + port);
});
