const userSessionModel = require('../models/userSessionModel');
const { responseReturn } = require('../utils/response');
const mongoose = require('mongoose'); 
const { Types } = mongoose;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n || 0));

exports.session_start = async (req, res) => {
  try {
    const userId = req.id; // authMiddleware থেকে
    if (!userId) return responseReturn(res, 401, { error: 'Unauthorized' });

    const doc = await userSessionModel.create({
      userId,
      userAgent: req.headers['user-agent'] || '',
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''
    });

    return responseReturn(res, 201, { sessionId: doc._id, startedAt: doc.startedAt });
  } catch (e) {
    return responseReturn(res, 500, { error: 'Server error' });
  }
};

exports.session_ping = async (req, res) => {
  try {
    const userId = req.id;
    const { sessionId, deltaSec, path, visible = true } = req.body || {};
    if (!userId || !sessionId) return responseReturn(res, 400, { error: 'Invalid payload' });

    const session = await userSessionModel.findOne({ _id: sessionId, userId, active: true });
    if (!session) return responseReturn(res, 404, { error: 'Session not found' });

    const now = new Date();
    const serverDelta = Math.round((now - new Date(session.lastSeenAt)) / 1000);
    const safeDelta = clamp(deltaSec ?? serverDelta, 0, 60); // প্রতি পিং 60s এর বেশি না

    const update = {
      lastSeenAt: now
    };
    if (visible) {
      update.$inc = { durationSec: safeDelta };
    }
    if (path && (!session.pages.length || session.pages[session.pages.length - 1].path !== path)) {
      update.$push = { pages: { path, ts: now } };
    }

    await userSessionModel.updateOne({ _id: sessionId }, update);
    return responseReturn(res, 200, { ok: true });
  } catch (e) {
    return responseReturn(res, 500, { error: 'Server error' });
  }
};

exports.session_end = async (req, res) => {
  try {
    const userId = req.id;
    const { sessionId } = req.body || {};
    if (!userId || !sessionId) return responseReturn(res, 400, { error: 'Invalid payload' });

    await userSessionModel.updateOne(
      { _id: sessionId, userId, active: true },
      { $set: { active: false, endedAt: new Date() } }
    );
    return responseReturn(res, 200, { ok: true });
  } catch (e) {
    return responseReturn(res, 500, { error: 'Server error' });
  }
};

exports.user_sessions = async (req, res) => {
  try {
    const { userId } = req.params;

    // validate + build matches
    const isValid =
      (mongoose.isValidObjectId && mongoose.isValidObjectId(userId)) ||
      Types.ObjectId.isValid(userId);

    const uid = isValid ? new Types.ObjectId(userId) : null;

    // primary match (ObjectId) + fallback (string) — very defensive
    const matchOID = uid ? { userId: uid } : null;
    const matchStr = { userId: userId }; // only useful if stored as string (unlikely)
    let match = matchOID || matchStr;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const perPage = Math.max(1, Math.min(100, parseInt(req.query.perPage) || 10));

    // Try with ObjectId first
    let total = await userSessionModel.countDocuments(match);
    let sessions = await userSessionModel
      .find(match)
      .sort({ startedAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .select('startedAt endedAt lastSeenAt durationSec active pages');

    // If nothing found (extremely rare), try string match as fallback
    if (total === 0 && matchOID) {
      total = await userSessionModel.countDocuments(matchStr);
      sessions = await userSessionModel
        .find(matchStr)
        .sort({ startedAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .select('startedAt endedAt lastSeenAt durationSec active pages');

      if (total > 0) match = matchStr; // use string match for summary as well
    }

    // Summary via aggregate (on whichever match worked)
    let totalSec = 0;
    let count = 0;
    let lastVisit = null;

    const agg = await userSessionModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$userId',
          totalSec: { $sum: '$durationSec' },
          count: { $sum: 1 },
          lastVisit: { $max: '$lastSeenAt' }
        }
      }
    ]);

    if (agg && agg[0]) {
      totalSec = agg[0].totalSec || 0;
      count = agg[0].count || 0;
      lastVisit = agg[0].lastVisit || null;
    } else if (total > 0) {
      // Fallback summary compute (in case aggregate failed to match types)
      const allForSum = await userSessionModel
        .find(match)
        .select('durationSec lastSeenAt')
        .lean();

      totalSec = allForSum.reduce((sum, d) => sum + (d.durationSec || 0), 0);
      count = allForSum.length;
      lastVisit = allForSum.reduce(
        (m, d) => (!m || (d.lastSeenAt && d.lastSeenAt > m) ? d.lastSeenAt : m),
        null
      );
    }

    const avgSec = count ? Math.round(totalSec / count) : 0;

    return responseReturn(res, 200, {
      summary: {
        totalSec,
        avgSec,
        sessionCount: count,
        lastVisitAt: lastVisit
      },
      sessions: {
        data: sessions,
        total,
        page,
        perPage
      }
    });
  } catch (e) {
    return responseReturn(res, 500, { error: 'Server error' });
  }
};