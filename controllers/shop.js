const Product = require("../models/product");
const Cart = require("../models/cart");
const Order = require("../models/order");
const { regexp } = require("sequelize/lib/operators");
const User = require("../models/user");
const { dbErrorCatcher } = require("./error");
const fs = require("fs");
const path = require("path");
const PDFDocument = require('pdfkit');
const fileHelper = require('../util/file');
const ITEMS_PER_PAGE = 2;

exports.getProducts = (req, res, next) => {
  Product.findAll()
    .then((products) => {
      res.render("shop/product-list", {
        prods: products,
        pageTitle: "All Products",
        path: "/products",
      });
    })
    .catch((err) => {
      dbErrorCatcher(err, next);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findByPk(prodId)
    .then((product) => {
      res.render("shop/product-detail", {
        product: product,
        pageTitle: product.title,
        path: "/products",
      });
    })
    .catch((err) => {
      dbErrorCatcher(err, next);
    });
};

exports.getIndex = (req, res, next) => {
  let page = 1;
  if (req.query.page) {
    page = req.query.page;
  }
  let totalPages = 0;
  Product.count()
    .then((count) => {
      totalPages = Math.ceil(count / ITEMS_PER_PAGE);
      if(page > totalPages){
        page = 1;
      }
      return Product.findAll({
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE,
      });
    })
    .then((products) => {
      res.render("shop/index", {
        prods: products,
        pageTitle: "Shop",
        path: "/",
        totalPages: totalPages,
        currentPage: page
      });
    })
    .catch((err) => {
      dbErrorCatcher(err, next);
    });
};

exports.getCart = (req, res, next) => {
  User.findByPk(req.session.userId)
    .then((user) => {
      if (user) {
        return user.getCart();
      } else {
        return res.redirect("/login");
      }
    })
    .then((cart) => {
      return cart.getProducts();
    })
    .then((products) => {
      res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your Cart",
        products: products,
      });
    })
    .catch((err) => {
      dbErrorCatcher(err, next);
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  let userCart;
  let newQty = 1;
  User.findByPk(req.session.userId)
    .then((user) => user.getCart())
    .then((cart) => {
      userCart = cart;
      return cart.getProducts({ where: { id: prodId } });
    })
    .then((products) => {
      if (products.length > 0) {
        newQty = products[0].cart_product.qty + 1;
      }
      return Product.findByPk(prodId)
        .then((product) => {
          return userCart.addProduct(product, { through: { qty: newQty } });
        })
        .catch((err) => {
          console.log(err);
        });
    })
    .then(() => {
      res.redirect("/cart");
    })
    .catch((err) => {
      dbErrorCatcher(err, next);
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  User.findByPk(req.session.userId)
    .then((user) => user.getCart())
    .then((cart) => {
      return cart.getProducts({ where: { id: prodId } });
    })
    .then((products) => {
      return products[0].cart_product.destroy();
    })
    .then(() => {
      res.redirect("/cart");
    })
    .catch((err) => {
      dbErrorCatcher(err, next);
    });
};

exports.getOrders = (req, res, next) => {
  User.findByPk(req.session.userId)
    .then((user) => {
      if (user) {
        return user.getOrders({ include: ["products"] });
      } else {
        return res.redirect("/login");
      }
    })
    .then((orders) => {
      res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your Orders",
        orders: orders,
      });
    })
    .catch((err) => {
      dbErrorCatcher(err, next);
    });
};

exports.postCreateOrder = (req, res, next) => {
  let cartProducts;
  let userLoggedIn;
  User.findByPk(req.session.userId)
    .then((user) => {
      userLoggedIn = user;
      return user.getCart();
    })
    .then((cart) => {
      return cart.getProducts();
    })
    .then((products) => {
      cartProducts = products;
      return cartProducts;
    })
    .then(() => {
      return userLoggedIn.createOrder();
    })
    .then((order) => {
      order.addProducts(
        cartProducts.map((product) => {
          product.order_product = { qty: product.cart_product.qty };
          return product;
        })
      );
    })
    .then(() => {
      res.redirect("/clear-cart");
    })
    .catch((err) => {
      dbErrorCatcher(err, next);
    });
};

exports.deleteOrder = (req, res, next) => {
  let orderId = req.body.orderId;
  let orderToDelete;
  User.findByPk(req.session.userId)
    .then((user) => user.getOrders({ where: { id: orderId } }))
    .then((orders) => {
      orderToDelete = orders[0];
      return orders[0].setProducts(null);
    })
    .then(() => {
      return orderToDelete.destroy();
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) => {
      dbErrorCatcher(err, next);
    });
};

exports.clearCart = (req, res, next) => {
  User.findByPk(req.session.userId)
    .then((user) => user.getCart())
    .then((cart) => {
      return cart.setProducts(null);
    })
    .then(() => {
      res.redirect("/cart");
    })
    .catch((err) => {
      dbErrorCatcher(err, next);
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  const invoiceName = "Invoice-" + orderId + ".pdf";
  const invoicePath = path.join("data", "invoices", invoiceName);
  let totalPrice = 0;
  Order.findByPk(orderId, { include: ["products"] }).then((order) => {
    if (order) {
      if (order.userId !== req.session.userId) {
        const error = new Error("You are not authorized to see this invoice");
        return next(error);
      } else {
        // fs.readFile(invoicePath, (error, data) => {
        //   if (error) {
        //     return next(error);
        //   } else {
        //     res.setHeader('Content-Type', 'application/pdf');
        //     res.setHeader('Content-Disposition', 'inline; filename="'+invoiceName+'"');
        //     res.send(data);
        //   }
        // });

        const pdfDoc = new PDFDocument();
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          'inline; filename="' + invoiceName + '"'
        );
        pdfDoc.pipe(fs.createWriteStream(invoicePath));
        pdfDoc.pipe(res);

        pdfDoc.fontSize(25).text("Invoice #" + orderId);
        pdfDoc.text("-------------------------------------------------------");
        
        order.products.forEach(product => {
          pdfDoc.fontSize(14).text(product.title + " - " + product.order_product.qty + " - $" + product.price);
          totalPrice = totalPrice + product.order_product.qty * product.price;
        });
        pdfDoc.text("-------------------------------------------------------");
        pdfDoc.fontSize(16).text("Total Price: $" + totalPrice);
        pdfDoc.end();
        fileHelper.deleteFile(invoicePath);
        // const file = fs.createReadStream(invoicePath);
        // res.setHeader("Content-Type", "application/pdf");
        // res.setHeader(
        //   "Content-Disposition",
        //   'inline; filename="' + invoiceName + '"'
        // );
        // file.pipe(res);
      }
    } else {
      const error = new Error("No order found");
      return next(error);
    }
  });
};

exports.getCheckout = (req, res, next) => {
  res.render("shop/checkout", {
    path: "/checkout",
    pageTitle: "Checkout",
  });
};
