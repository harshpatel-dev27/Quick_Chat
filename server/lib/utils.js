/** @format */

import jwt from "jsonwebtoken";

// Function to generate a token for a user
export const generateToken = (userId) => {
  return jwt.sign(
    { userId }, // payload
    process.env.JWT_SECRET, // secret key
    { expiresIn: "7d" } // token valid for 7 days
  );
};
