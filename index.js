const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const port = 3333;
const dotenv = require("dotenv");
const auth = require("./src/middleware/auth");
const util = require("util");
const cors = require('cors')
dotenv.config();

app.use(express.json());
app.use(cors())

var mysql = require('mysql')
const { type } = require("os");

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
  user: "sql6407693",
  password: process.env.password,
  database: "sql6407693",
  // port:3306,
  // insecureAuth : true
};

function makeDb(config) {
  const connection = mysql.createConnection(config);
  return {
    query(sql, args) {
      return util.promisify(connection.query).call(connection, sql, args);
    },
    close() {
      return util.promisify(connection.end).call(connection);
    },
  };
}

const db = makeDb(config);

const selfTransfer = async (amount, type, id) => {
  console.log("selftransfer");
  let now = new Date();
  now = now.toString();
  let date = now.slice(0, 24);
  const query = await db.query(
    `insert into transaction (dateOfTransfer,amount,type,customerID) values ('${date}', ${amount}, '${type}', ${id})`);
  console.log(query)
  return query;
};

const moneyTransfer = async(accountNo, type, amount) => {
  const response = await db.query(`select * from account where account_number = ${accountNo}`)
  const ID = response[0].customerID
  let now = new Date();
  now = now.toString();
  let date = now.slice(0, 24);
  const updateTransaction = await db.query(`insert into transaction (dateOfTransfer,amount,type,customerID) values ('${date}', ${amount}, '${type}', ${ID})`)
  console.log(updateTransaction)
}

app.get('/me', auth, async(req,res)=> {
  const query = await db.query(`select * from customer where customerID = ${req.user.customerID}`)
  // console.log(query)
  const query2 = await db.query(`select * from address where customerID = '${req.user.customerID}'`)
  query[0].token = ""
  query[0].password = ""
  const obj = {
    ...query[0],
    ...query2[0]
  }
  res.send(obj)
})

app.get('/checkBalance', auth, async (req,res)=> {
  const query = await db.query(`select balance from account where customerID = ${req.user.customerID}`)
  res.send(query[0])
})

app.get('/transactions', auth, async(req,res)=> {
  const query = await db.query(`select * from transaction where customerID = ${req.user.customerID}`)
  console.log(query)
  res.send(query)
})

app.get('/accountDetails', auth, async(req,res)=>{
  const query = await db.query(`select * from account where customerID = '${req.user.customerID}'`)
  console.log(query)
  res.send(query)
})




app.post("/register", async (req, res) => {
  const token = jwt.sign({ email: req.body.Email.toString() }, process.env.secret);
  const query = await db.query(
    `INSERT INTO customer (Name,Email,DOB,password,token) values ('${req.body.Name}', '${req.body.Email}', '${req.body.DOB}', '${req.body.password}', '${token}')`
  );
  // const query = await db.execute(`INSERT INTO customer (Name,Email,DOB,password,token) values ('${req.body.Name}', '${req.body.Email}', '${req.body.DOB}', '${req.body.password}', '${token}`)
  console.log(query.insertId)
  const obj = {
    id: query.insertId,
    token: token
  }
  res.send(obj)
});

app.post("/login", async (req, res) => {
  let user;
  console.log('hi')
  const query = await db.query(`select * from customer where Email='${req.body.Email}'`)
  user = query[0];
  if(req.body.password === user.password){
    user.password="";
    return res.send(user)
  }else{
    return res.status(400).send('invalid credentials')
  }
});

app.post("/createAccount", auth, async (req, res) => {
  try {
    db.query(
      `insert into account (account_type,customerID,balance) values ('${req.body.account_type}',${req.user.customerID}, ${req.body.balance} )`,
      (err, rows) => {
        if (err) {
          res.status(400).send(err);
        } else {
          res.send(rows);
        }
      }
    );
  } catch (e) {
    res.status(500).send();
  }
});

app.post("/address", auth, async (req, res) => {
  try {
    db.query(
      `insert into address (PIN, Locality, state, country, customerID) values (${req.body.PIN},'${req.body.Locality}', '${req.body.state}', '${req.body.country}', ${req.user.customerID})`,
      (err, rows) => {
        if (err) {
          console.log(err);
        } else {
          console.log(rows);
          res.send(rows);
        }
      }
    );
  } catch (e) {
    console.log(e);
  }
});

app.post("/updateBalance", auth, async (req, res) => {
  try {
    let currBalance = await db.query(
      `select balance from account where customerID = ${req.user.customerID}`
    );
    let updatedbalance;
    if (req.body.type === "deposit") {
      updatedbalance = currBalance[0].balance + req.body.amount;
    } else {
      updatedbalance = currBalance[0].balance - req.body.amount;
      if (updatedbalance < 0) {
        return res.status(400).send("You have insufficient amount!");
      }
    }

    console.log(updatedbalance);
    await db.query(
      `update account set balance = ${updatedbalance} where customerID = ${req.user.customerID}`,
      (err, rows) => {
        if (err) {
          res.status(400).send("balance not updated!");
        } else {
          selfTransfer(req.body.amount, req.body.type, req.user.customerID)
          res.send('done')
        }
      }
    );
  } catch (e) {
    console.log(e);
  }
});

app.post("/moneyTransfer", auth, async (req, res) => {
  try{
    const { accountNo, amount } = req.body;
    let senderBalance = await db.query(`select balance from account where customerID = ${req.user.customerID}`)
    senderBalance = senderBalance[0].balance
    let recieverbalance = await db.query(`select balance from account where account_number = ${accountNo}`)
    recieverbalance = recieverbalance[0].balance
    if(amount<= senderBalance){
      let updatedbalance = senderBalance - amount;
      const updatequery = await db.query(`update account set balance = ${updatedbalance} where customerID = ${req.user.customerID} `)
      // console.log(updatequery)
      let  temp = recieverbalance + amount
      const recievequery = await db.query(`update account set balance = ${temp} where account_number = ${accountNo}`)
      // console.log(recievequery)
      selfTransfer(amount,"withdrawl", req.user.customerID)
      moneyTransfer(accountNo, "credit",amount)

      res.send('Transfer done!')
    }else{
      res.status(400).send('Insufficient balance')
    }
  }catch(e){
    res.status(500).send()
  }
  
});

app.listen(process.env.PORT || 3333, () => {
  console.log("Server starting on port 3333")
});