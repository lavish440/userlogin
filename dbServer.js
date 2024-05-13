const express = require("express");
const bcrypt = require("bcrypt");
const app = express();

const mysql = require("mysql");
const notifier = require("node-notifier");
const jsonwebtoken = require("./generateAccessToken");
const generateAccessToken = jsonwebtoken.generateAccessToken;
const generateRefreshToken = jsonwebtoken.generateRefreshToken;
const validateToken = jsonwebtoken.validateToken;
let refreshTokens = [];

require("dotenv").config();

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

app.listen(PORT, () =>
	console.log("Server started on port " + "http://localhost:" + PORT),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view options", { layout: false });
app.set("views", __dirname + "/public/main");
app.engine("html", require("ejs").renderFile);

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept",
  );
  next();
});

app.post("/createUser", async (req, res) => {
	const user = req.body.user;
	const hashedPassword = await bcrypt.hash(req.body.password, 10);
	const email = req.body.email;

	db.getConnection(async (err, connection) => {
		if (err) throw err;

		const sqlSearch = "SELECT * FROM userTable WHERE user = ?";
		const search_query = mysql.format(sqlSearch, [user]);

		const sqlInsert = "INSERT INTO userTable VALUES (0,?,?,?)";
		const insert_query = mysql.format(sqlInsert, [user, email, hashedPassword]);

		// @ts-ignore
		await connection.query(search_query, async (err, result) => {
			if (err) throw err;
			console.log("---------> Search Results");
			console.log(result.length);

			if (result.length != 0) {
				connection.release();
				console.log("---------> User already exists");
				res.sendStatus(409);
			} else {
				await connection.query(insert_query, (err, result) => {
					connection.release();

					if (err) throw err;
					console.log("---------> Created new user");
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

		await connection.query(search_query, async (err, result) => {
			connection.release();

			if (err) throw err;

			if (result.length == 0) {
				console.log("---------> User does not exist");
				// res.sendStatus(404);
				// res.set("Content-Type", "text/html");
				res.send(
					"<script>alert('User is not registered!' + `\n` + 'Redirecting you to Login Page');window.location.replace('/');</script>",
				);
			} else {
				const hashedPassword = result[0].password;

				if (await bcrypt.compare(password, hashedPassword)) {
					console.log("---------> Login Succesful");
					const user_get = "SELECT user FROM userTable WHERE email = ?";
					const user_query = mysql.format(user_get, [email]);

					if (err) throw err;
					await connection.query(user_query, async (err, result) => {
						const user = result[0].user;
						if (err) throw err;
						// res.sendStatus(200);
						notifier.notify({
							title: "Salutations!",
							message: "Hey there!" + user,
							sound: true,
							wait: true,
						});
						res.redirect("/main");
						console.log(`---------> {user} Redirected Succesfully`);
						// res.send(user + " is logged in!");
					});
				} else {
					console.log("Password Incorrect");
					res.send("Password Incorrect!!");
				}
			}
		});
	});
});

app.post("/jwt", (req, res) => {
	const email = req.body.email;
	const password = req.body.password;
	db.getConnection(async (err, connection) => {
		if (err) throw err;
		const sqlSearch = "SELECT * FROM userTable WHERE email = ?";
		const search_query = mysql.format(sqlSearch, [email]);
		await connection.query(search_query, async (err, result) => {
			connection.release();

			if (err) throw err;
			if (result.length == 0) {
				console.log("---------> email does not exist");
				return res.sendStatus(404);
			} else {
				const hashedPassword = result[0].password;
				if (await bcrypt.compare(password, hashedPassword)) {
					console.log("---------> Login Successful");
					console.log("---------> Generating accessToken");
					const accessToken = generateAccessToken({ user: email });
					const refreshToken = generateRefreshToken({ user: email });
					refreshTokens.push(refreshToken);
					console.log(accessToken);
					return res.json({
						token: accessToken,
						// refreshToken: refreshToken,
					});
				} else {
					res.send("Password incorrect!");
				}
			}
		});
	});
});

app.post("/refreshtoken", (req, res) => {
	if (!refreshTokens.includes(req.body.token))
		res.status(400).send("refresh Token invalid!!");

	refreshTokens = refreshTokens.filter((c) => c != req.body.token);

	const accessToken = generateAccessToken({ user: req.body.email });
	const refreshToken = generateRefreshToken({ user: req.body.email });

	res.json({ token: accessToken, refreshToken: refreshToken });
});

app.delete("/logout", (req, res) => {
	if (!refreshTokens.includes(req.body.token))
		res.status(400).send("refresh Token invalid!!");
	else {
		refreshTokens = refreshTokens.filter((c) => c != req.body.token);
		res /* .status(204) */
			.send("Logged Out");
	}
});

// app.use("/resources", express.static(__dirname + "/public/main/resources"));
app.get("/main", validateToken, (req, res) => {
	console.log("Token is valid");
	console.log(req.body.email);
	// res.sendFile(__dirname + "/public/main/");
	// res.sendFile(__dirname + "/public/main/resources/style.css");
	res.render("index.html");
});

app.use(express.static("public"));
