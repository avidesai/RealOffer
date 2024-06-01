const express = require('express');
const router = express.Router();
const TransactionController = require('../controllers/TransactionController');

router.get('/', TransactionController.getAllTransactions);
router.get('/:id', TransactionController.getTransactionById);
router.post('/', TransactionController.createTransaction);
router.delete('/:id', TransactionController.deleteTransaction);

module.exports = router;