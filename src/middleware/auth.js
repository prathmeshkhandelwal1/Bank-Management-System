const jwt = require('jsonwebtoken')
const mysql = require('mysql')
const dotenv = require("dotenv");
const util = require('util')

dotenv.config()


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

const auth = async (req,res, next) => {
    try{
        let user; 
        const token = req.header('Authorization')
        const decoded = jwt.verify(token, 'thisissecret')
        console.log(decoded)
        const rows = await db.query(`select * from customer where Email='${decoded.email}'`)
        req.user = rows[0]
        next()
    }catch(e){
        res.status(401).send('Please authorize')
    }
    
}

module.exports = auth