const bcryptjs = require("bcryptjs");
const User = require("../models/user");
const { validationResult } = require("express-validator/check");
const { dbErrorCatcher } = require("./error");

exports.getLogin = (req, res, next) => {
  res.render("auth/login", {
    pageTitle: "Log In",
    path: "/login",
    errorMessage: req.flash("error"),
    oldInfo: null,
    validationErrors: [],
  });
};

exports.postLogin = (req, res, next) => {
  let email = req.body.email;
  let password = req.body.password;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/login", {
      pageTitle: "Log In",
      path: "/login",
      errorMessage: errors.array()[0].msg,
      oldInfo: {
        email: email,
        password: password
      },
      validationErrors: errors.array(),
    });
  } else {
    User.findOne({ where: { email: email } })
      .then((user) => {
        return bcryptjs.compare(password, user.password).then((doMatch) => {
          if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.userId = user.id;
            req.session.save(() => {
              res.redirect("/");
            });
          } else {
            req.flash("error", "Invalid email or password");
            res.redirect("/login");
          }
        });
      })
      .catch((err) => {
        dbErrorCatcher(err, next);
      });
  }
};

exports.getSignUp = (req, res, next) => {
  res.render("auth/signup", {
    pageTitle: "Sign Up",
    path: "/signup",
    errorMessage: req.flash("error"),
    oldInfo: null,
    validationErrors: [],
  });
};

exports.postSignUp = (req, res, next) => {
  let name = req.body.name;
  let email = req.body.email;
  let password = req.body.password;
  let confirmPassword = req.body.confirmPassword;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/signup", {
      pageTitle: "Sign Up",
      path: "/signup",
      errorMessage: errors.array()[0].msg,
      oldInfo: {
        name: name,
        email: email,
        password: password,
        confirmPassword: confirmPassword
      },
      validationErrors: errors.array(),
    });
  } else {
    bcryptjs
      .hash(password, 12)
      .then((hashedPassword) => {
        return User.create({
          name: name,
          email: email,
          password: hashedPassword,
        });
      })
      .then((userCreated) => {
        req.session.isLoggedIn = true;
        req.session.userId = userCreated.id;
        return req.session.save(() => {
          return userCreated.createCart();
        });
      })
      .then(() => {
        res.redirect("/");
      })
      .catch((err) => {
        dbErrorCatcher(err, next);
      });
  }
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(() => res.redirect("/login"));
};
