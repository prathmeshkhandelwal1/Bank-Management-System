const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const port = 3333;
const dotenv = require("dotenv");
const auth = require('./src/middleware/auth')
const util = require('util')

dotenv.config();

app.use(express.json());

var mysql = require("mysql");
// var connection = mysql.createConnection({
//   host: "sql6.freemysqlhosting.net",
//   user: "sql6404970",
//   password: process.env.password,
//   database: "sql6404970",
// });

// connection.connect((err) => {
//   if (err) {
//     console.log(err, "errror");
//   } else {
//     console.log("Connected!");
//   }
// });

const config = {
  host: "sql6.freemysqlhosting.net",
  user: "sql6404970",
  password: process.env.password,
  database: "sql6404970"
}


function makeDb( config ) {
  const connection = mysql.createConnection( config );
  return {
    query( sql, args ) {
      return util.promisify( connection.query )
        .call( connection, sql, args );
    },
    close() {
      return util.promisify( connection.end ).call( connection );
    }
  };
}

const db = makeDb( config );



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

app.post('/createAccount', auth , async (req, res)=> {
  try{
    connection.query(`insert into account (account_type,customerID,balance) values ('${req.body.account_type}',${req.user.customerID}, ${req.body.balance} )`, (err,rows)=> {
      if(err){
        res.status(400).send(err)
      }else{
        res.send(rows)
      }
    })
  }catch(e){
    res.status(500).send()
  }
})

app.post('/address', auth, async(req,res)=>{
  try{
    connection.query(`insert into address (PIN, Locality, state, country, customerID) values (${req.body.PIN},'${req.body.Locality}', '${req.body.state}', '${req.body.country}', ${req.user.customerID})`, (err,rows)=> {
      if(err){
        console.log(err)
      }else{
        console.log(rows)
        res.send(rows)
      }
    })
  }catch(e){
    console.log(e)
  }
})

app.post('/updateBalance', auth, async(req,res)=>{
  try{
    let currBalance = await db.query(`select balance from account where customerID = ${req.user.customerID}`)
    // console.log(currBalance[0].balance)
    let updatedbalance = currBalance[0].balance + req.body.amount;
    console.log(updatedbalance)
    await db.query(`update account set balance = ${updatedbalance} where customerID = ${req.user.customerID}`, (err,rows)=> {
      if(err){
        console.log(err, 'update')
      }else{
        console.log(rows)
      }
    })

  }catch(e){
    console.log(e)
  }
})

app.listen(port, () => {
  console.log("Server is up on port" + port);
});
