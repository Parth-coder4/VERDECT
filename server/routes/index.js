const express = require('express');
const router = express.Router();

const complianceRouter = require('./compliance');
const counterfeitRouter = require('./counterfeit');
const violationsRouter = require('./violations');
const registryRouter = require('./registry');
const rulebookRouter = require('./rulebook');
const adminRouter = require('./admin');
const { requireAdmin } = require('../middlewares/auth');

router.use('/compliance', complianceRouter);
router.use('/counterfeit', counterfeitRouter);
router.use('/violations', violationsRouter);
router.use('/registry', registryRouter);
router.use('/rulebook', rulebookRouter);
router.use('/admin', requireAdmin, adminRouter);

module.exports = router;

