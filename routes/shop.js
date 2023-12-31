const express = require('express');

const shopController = require('../controllers/shop');

const router = express.Router();

router.get('/', shopController.getIndex);

router.get('/products', shopController.getProducts);

router.get('/products/:productId', shopController.getProduct);

router.get('/cart', shopController.getCart);

router.post('/cart', shopController.postCart);

router.post('/cart-delete-item', shopController.postCartDeleteProduct);

router.post('/create-order', shopController.postCreateOrder);

router.get('/clear-cart', shopController.clearCart);
router.post('/clear-cart', shopController.clearCart);

router.get('/orders', shopController.getOrders);
router.post('/delete-order', shopController.deleteOrder);

router.get('/invoices/:orderId', shopController.getInvoice);

router.get('/checkout', shopController.getCheckout);

module.exports = router;
