/** @format */

// server/middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protectRoute = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization; // get Authorization header
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "Token missing or invalid" });
    }

    const token = authHeader.split(" ")[1]; // extract token after "Bearer "

    // verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    req.user = user;
    next();
  } catch (error) {
    console.error("protectRoute error:", error.message);
    return res.status(401).json({ success: false, message: error.message });
  }
};
