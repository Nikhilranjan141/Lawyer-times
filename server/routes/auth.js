const router = require("express").Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { protect } = require("../middleware/auth");

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@lawyerstimes.com").toLowerCase();

function serializeUser(user) {
	return {
		_id: user._id,
		name: user.name,
		email: user.email,
		role: user.role,
	};
}

router.post("/register", async (req, res) => {
	try {
		const { name, email, password } = req.body;

		if (!name || !email || !password) {
			return res.status(400).json({ message: "Name, email and password are required" });
		}

		const existing = await User.findOne({ email: email.toLowerCase() });
		if (existing) {
			return res.status(400).json({ message: "User already exists" });
		}

		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		const user = await User.create({
			name,
			email: email.toLowerCase(),
			password: hashedPassword,
			role: email.toLowerCase() === ADMIN_EMAIL ? "admin" : "user",
		});

		res.status(201).json({
			token: generateToken({ id: user._id, email: user.email, role: user.role }),
			user: serializeUser(user),
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

router.post("/login", async (req, res) => {
	try {
		const { email, password } = req.body;

		const user = await User.findOne({ email: String(email || "").toLowerCase() });
		if (!user) {
			return res.status(401).json({ message: "Invalid email or password" });
		}

		const isMatch = await bcrypt.compare(password || "", user.password);
		if (!isMatch) {
			return res.status(401).json({ message: "Invalid email or password" });
		}

		res.json({
			token: generateToken({ id: user._id, email: user.email, role: user.role }),
			user: serializeUser(user),
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

router.get("/me", protect, async (req, res) => {
	res.json({ user: serializeUser(req.user), notifications: req.user.notifications || [] });
});

router.get("/notifications", protect, async (req, res) => {
	res.json(req.user.notifications || []);
});

router.patch("/notifications/:notificationId/read", protect, async (req, res) => {
	const notification = req.user.notifications.id(req.params.notificationId);

	if (!notification) {
		return res.status(404).json({ message: "Notification not found" });
	}

	notification.read = true;
	await req.user.save();

	res.json(notification);
});

module.exports = router;

