/**
 * server/controller/userController.js
 *
 * @format
 */

import { generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";

// signup new user
export const signup = async (req, res) => {
  const { fullName, email, password, bio } = req.body;

  try {
    if (!fullName || !email || !password || !bio) {
      return res.json({ success: false, message: "Missing details" });
    }

    const user = await User.findOne({ email });
    if (user) {
      return res.json({ success: false, message: "Account already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      bio,
    });

    const token = generateToken(newUser._id);
    // Do not send password in response - Mongoose .create returns the doc with password, but frontend should avoid using it
    const safeUser = (({
      _id,
      fullName: fn,
      email: em,
      profilePic,
      bio: b,
      createdAt,
      updatedAt,
    }) => ({
      _id,
      fullName: fn,
      email: em,
      profilePic,
      bio: b,
      createdAt,
      updatedAt,
    }))(newUser);

    res.json({
      success: true,
      userData: safeUser,
      message: "Account created successfully",
      token,
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Controller for login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userData = await User.findOne({ email });

    if (!userData) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, userData.password);

    if (!isPasswordCorrect) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    const token = generateToken(userData._id);

    const safeUser = (({
      _id,
      fullName,
      email,
      profilePic,
      bio,
      createdAt,
      updatedAt,
    }) => ({
      _id,
      fullName,
      email,
      profilePic,
      bio,
      createdAt,
      updatedAt,
    }))(userData);

    res.json({
      success: true,
      userData: safeUser,
      message: "Login Successful",
      token,
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// controller to check if user is authenticated
export const checkAuth = (req, res) => {
  // req.user is set by protectRoute
  res.json({ success: true, user: req.user });
};

// controller to update profile details
export const updateProfile = async (req, res) => {
  try {
    const { profilePic, fullName, bio } = req.body;
    const userId = req.user._id;

    if (!fullName || !bio) {
      return res
        .status(400)
        .json({ success: false, message: "Missing details" });
    }

    let updatedUser;

    if (profilePic) {
      const upload = await cloudinary.uploader.upload(profilePic);
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { profilePic: upload.secure_url, bio, fullName },
        { new: true }
      ).select("-password");
    } else {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { bio, fullName },
        { new: true }
      ).select("-password");
    }

    return res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.log("Error updating profile:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};
