const Product = require('../models/product');
const User = require("../models/user");
const { validationResult } = require("express-validator/check");
const { dbErrorCatcher } = require("./error");
const fileHelper = require('../util/file');

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false
  });
};

exports.postAddProduct = async (req, res, next) => {
  const title = req.body.title;
  // const imageUrl = req.body.imageUrl;
  const imageUrl = req.file.path;
  const price = req.body.price;
  const description = req.body.description;
  const userId = req.session.userId;
  try {
    const user = await User.findByPk(userId);
    await user.createProduct({
      title: title,
      imageUrl: imageUrl,
      price: price,
      description: description,
      userId: userId,
    });

    res.redirect("/admin/products");
  }
    catch (err){
      dbErrorCatcher(err, next);
    }
};

exports.getEditProduct = async (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  try {
    const product = Product.findByPk(prodId);
    if (!product) {
      return res.redirect("/");
    } else {
      res.render("admin/edit-product", {
        pageTitle: "Edit Product",
        path: "/admin/edit-product",
        editing: editMode,
        product: product,
      });
    }
  } catch (err) {
    dbErrorCatcher(err, next);
  }
};

exports.postEditProduct = async (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  // const updatedImageUrl = req.body.imageUrl;
  let updatedImageUrl = ''
  
  
  const updatedDesc = req.body.description;
  try {
    const product = await Product.findByPk(prodId);
    if (product.userId === req.session.userId) {
      product.title = updatedTitle;
      product.price = updatedPrice;
      if (!req.file) {
        updatedImageUrl = product.imageUrl;
      } else {
        fileHelper.deleteFile(product.imageUrl);
        updatedImageUrl = req.file.path;
      }
      product.imageUrl = updatedImageUrl;
      product.description = updatedDesc;
      await product.save();
      res.redirect("/admin/products");
    } else {
      res.redirect("/");
    }
  } catch (err) {
    dbErrorCatcher(err, next);
  }
};

exports.getProducts = async (req, res, next) => {
  const products = await Product.findAll({
    where: { userId: req.session.userId },
  });
  try {
    res.render("admin/products", {
      prods: products,
      pageTitle: "Admin Products",
      path: "/admin/products",
    });
  } catch (err) {
    dbErrorCatcher(err, next);
  }
};

exports.postDeleteProduct = async (req, res, next) => {
  const prodId = req.body.productId;
  try {
    const product = await Product.findOne({
      where: { id: prodId, userId: req.session.userId },
    });

    if (product) {
      fileHelper.deleteFile(product.imageUrl);
      await Product.destroy({
        where: { id: prodId, userId: req.session.userId },
      });
    }
    res.redirect("/admin/products");
  } catch (err) {
    dbErrorCatcher(err, next);
  }
};
