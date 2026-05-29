const jwt = require("jsonwebtoken");

function generateToken(payload) {
	return jwt.sign(payload, process.env.JWT_SECRET || "lawyers-times-secret", {
		expiresIn: "7d",
	});
}

module.exports = generateToken;

