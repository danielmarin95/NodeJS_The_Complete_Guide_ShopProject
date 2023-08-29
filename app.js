require('dotenv');
const path = require("path");
const express = require("express");
const session = require("express-session");
const SessionStore = require("express-session-sequelize")(session.Store);
const errorController = require("./controllers/error");
const csrf = require("csurf");
const flash = require("connect-flash");
const multer = require("multer");
const sequelize = require("./util/database");
const sequelizeSessionStore = new SessionStore({
  db: sequelize,
});
const csrfProtection = csrf();
const Product = require("./models/product");
const User = require("./models/user");
const Cart = require("./models/cart");
const CartProduct = require("./models/cart-product");
const Order = require("./models/order");
const OrderProduct = require("./models/order-product");

const app = express();

app.set("view engine", "ejs");
app.set("views", "views");

const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use('/images', express.static(path.join(__dirname, "images")));

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      new Date().toISOString().replace(/:/g, "-") + "-" + file.originalname
    );
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);

app.use(
  session({
    secret: "my secret",
    resave: false,
    saveUninitialized: false,
    store: sequelizeSessionStore,
  })
);

app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
  res.locals.isLoggedIn = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use("/500", errorController.get500);
app.use(errorController.get404);
app.use((error, req, res, next) => {
  console.log(error);
  res.redirect("/500");
});

Product.belongsTo(User, { constraints: true, onDelete: "CASCADE" });
User.hasMany(Product);

User.hasOne(Cart);
Cart.belongsTo(User);

Cart.belongsToMany(Product, { through: CartProduct });
Product.belongsToMany(Cart, { through: CartProduct });

Product.belongsToMany(Order, { through: OrderProduct });
Order.belongsToMany(Product, { through: OrderProduct });

User.hasMany(Order);
Order.belongsTo(User, { constraints: true, onDelete: "CASCADE" });

sequelize
  .sync()
  // .sync({force: true})
  .then(() => {
    app.listen(3000, () => {
      console.log("Server started at port 3000");
    });
  })
  .catch((err) => {
    console.log(err);
  });
