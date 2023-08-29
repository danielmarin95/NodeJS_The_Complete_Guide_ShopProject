const Sequelize = require('sequelize')
const sequelize = require('../util/database');

const CartProduct = sequelize.define("cart_product", {
  id:{
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true
  },

  qty: Sequelize.INTEGER
  
});

module.exports = CartProduct;