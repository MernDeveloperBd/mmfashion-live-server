// controllers/withdrawal.controller.js
const Withdrawal = require('../models/Withdrawal');
const customerModel = require('../models/customerModel');

const MIN_WITHDRAW = 500;

exports.createWithdrawal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;
    const amt = Number(amount);

    if (!amt || Number.isNaN(amt)) return res.status(400).json({ message: 'Invalid amount' });
    if (amt < MIN_WITHDRAW) return res.status(400).json({ message: `Minimum ৳${MIN_WITHDRAW}` });

    const user = await customerModel.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.referralBalance < amt) {
      return res.status(400).json({ message: 'Amount exceeds available balance' });
    }

    // Move funds to pending (hold)
    user.referralBalance -= amt;
    user.referralPending += amt;

    const session = await customerModel.startSession();
    session.startTransaction();
    try {
      await user.save({ session });
      const request = await Withdrawal.create([{ user: user._id, amount: amt }], { session });
      await session.commitTransaction();

      return res.status(201).json({
        message: 'Withdraw request submitted',
        request: request[0]
      });
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getMyWithdrawals = async (req, res) => {
  try {
    const userId = req.user.id;
    const requests = await Withdrawal.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50);
    return res.json({ requests });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// Admin
exports.listAll = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const requests = await Withdrawal.find(filter).populate('user', 'name email').sort({ createdAt: -1 });
    return res.json({ requests });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body; // 'approved' | 'rejected'
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const request = await Withdrawal.findById(id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ message: 'Already processed' });

    const user = await customerModel.findById(request.user);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const session = await customerModel.startSession();
    session.startTransaction();
    try {
      if (status === 'approved') {
        // finalize: reduce pending
        if (user.referralPending < request.amount) throw new Error('Pending balance mismatch');
        user.referralPending -= request.amount;
      } else if (status === 'rejected') {
        // return to available balance
        if (user.referralPending < request.amount) throw new Error('Pending balance mismatch');
        user.referralPending -= request.amount;
        user.referralBalance += request.amount;
      }

      request.status = status;
      if (note) request.note = note;

      await user.save({ session });
      await request.save({ session });

      await session.commitTransaction();
      return res.json({ message: `Request ${status}`, request });
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
};