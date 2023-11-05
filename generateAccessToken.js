const jwt = require("jsonwebtoken");
function generateAccessToken(user) {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "20m" });
}

function generateRefreshToken(user) {
  return jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "20m" });
}

function validateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (authHeader == null) res.send("auth not");
  else {
    const token = authHeader.split(" ")[1];

    if (token == null) res.sendStatus(400).send("Token not present");

    jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
      if (err) {
        res.status(403).send("Token is very invalid");
      } else {
        req.user = user;
        next();
      }
    });
  }
}

module.exports = {
  generateAccessToken: generateAccessToken,
  generateRefreshToken: generateRefreshToken,
  validateToken: validateToken,
};
