const express = require("express");
const authController = require("../controllers/auth");
const { check } = require("express-validator/check");
const req = require("express/lib/request");
const User = require("../models/user");

const router = express.Router();

router.get("/login", authController.getLogin);
router.post(
  "/login",
  [
    check("email")
      .isEmail()
      .withMessage("Please enter a valid email.")
      .custom((value) => {
        return User.findOne({ where: { email: value } }).then((user) => {
          if (!user) {
            return Promise.reject("E-mail does not exist");
          }
        });
      }),
    check("password", "Please enter a valid password")
      .isLength({ min: 3 })
      .isAlphanumeric(),
  ],
  authController.postLogin
);

router.post("/logout", authController.postLogout);

router.get("/signup", authController.getSignUp);
router.post(
  "/signup",
  [
    check("email")
      .isEmail()
      .withMessage("Please enter a valid email.")
      .custom((value) => {
        return User.findOne({ where: { email: value } }).then((user) => {
          if (user) {
            return Promise.reject("E-mail already in use");
          }
        });
      })
      .normalizeEmail(),
    check("password", "Please enter a valid password")
      .isLength({ min: 3 })
      .isAlphanumeric()
      .trim(),
    check("confirmPassword").trim().custom((password, { req }) => {
      if (password !== req.body.password) {
        throw new Error("Passwords do not match!");
      } else {
        return true;
      }
    }),
  ],
  authController.postSignUp
);

module.exports = router;
