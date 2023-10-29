const express = require("express");
const bcrypt = require("bcrypt");
const app = express();

const mysql = require("mysql");

require("dotenv").config();
const notifier = require("node-notifier");

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_DATABASE = process.env.DB_DATABASE;
const DB_PORT = process.env.DB_PORT;
const PORT = process.env.PORT;

const db = mysql.createPool({
  connectionLimit: 100,
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  port: DB_PORT,
});

db.getConnection((err, connection) => {
  if (err) throw err;
  console.log("DB Connected Succesful: " + connection.threadId);
});

app.listen(PORT, () => console.log("Server started on port " + PORT));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/createUser", async (req, res) => {
  const user = req.body.user;
  const hashedPassword = bcrypt.hash(req.body.password, 10);
  const email = req.body.email;

  db.getConnection(async (err, connection) => {
    if (err) throw err;

    const sqlSearch = "SELECT * FROM userTable WHERE user = ?";
    const search_query = mysql.format(sqlSearch, [user]);

    const sqlInsert = "INSERT INTO userTable VALUES (0,?,?,?)";
    const insert_query = mysql.format(sqlInsert, [user, email, hashedPassword]);

    connection.query(search_query, async (err, result) => {
      if (err) throw err;
      console.log("------> Search Results");
      console.log(result.length);

      if (result.length != 0) {
        connection.release();
        console.log("------> User already exists");
        res.sendStatus(409);
      } else {
        connection.query(insert_query, (err, result) => {
          connection.release();

          if (err) throw err;
          console.log("------> Created new user");
          console.log(result.insertId);
          res.sendStatus(201);
        });
      }
    });
  });
});

app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  db.getConnection(async (err, connection) => {
    if (err) throw err;
    const sqlSearch = "SELECT * FROM userTable WHERE email = ?";
    const search_query = mysql.format(sqlSearch, [email]);

    connection.query(search_query, async (err, result) => {
      connection.release();

      if (err) throw err;

      if (result.length == 0) {
        console.log("-------> User does not exist");
        res.sendStatus(404);
      } else {
        const hashedPassword = result[0].password;

        if (bcrypt.compare(password, hashedPassword)) {
          console.log("-------> Login Succesful");
          const user_get = "SELECT user FROM userTable WHERE email = ?";
          const user_query = mysql.format(user_get, [email]);

          if (err) throw err;
          connection.query(user_query, async (err, result) => {
            if (err) throw err;
            const user = result[0].user;
            res.send(user + " is logged in!");
          });
        } else {
          console.log("Password Incorrect");
          res.send("Password Incorrect!!");
          notifier.notify({
            title: "Salutations!",
            message: "Hey there!",
            sound: true,
            wait: true,
          });
        }
      }
    });
  });
});
