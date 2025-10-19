const { sendMail } = require('../../utils/mailer');

const APP_NAME   = process.env.NODEMAILER_USER  || 'MM Fashion';
const ADMIN_MAIL = process.env.ADMIN_EMAIL       || process.env.NODEMAILER_EMAIL;
const clientUrl = process.env.CLIENT_URL        || 'http://localhost:5173';

const money = (n=0) => `TK ${Number(n || 0).toLocaleString('en-BD')}`;
const BRAND_COLOR = '#0d6b54'; // requested theme color
const displayUrl = clientUrl.replace(/^https?:\/\//,'').replace(/\/$/,'');

// order.products format in your DB = flat array of { name, price, quantity, selectedColor, selectedSize, ... }
function buildBuyerRows(order) {
  const items = Array.isArray(order?.products) ? order.products : [];
  return items.map((p) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">
        <div style="font-weight:600">${p?.name || '-'}</div>
        ${p?.selectedColor ? `<div style="font-size:12px;color:#555">Color: ${p.selectedColor}</div>` : ''}
        ${p?.selectedSize ? `<div style="font-size:12px;color:#555">Size: ${p.selectedSize}</div>` : ''}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${p?.quantity || 1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${money(p?.price)}</td>
    </tr>
  `).join('');
}

function buyerAdminHtml({ title='Order', order, user, shippingFee = 0 }) {
  const rows = buildBuyerRows(order);
  const shipping = order?.shippingInfo || {};
  // আপনার order.price = subtotal + shipping_fee
  const total = Number(order?.price || 0);
  const subtotal = Math.max(0, total - Number(shippingFee || 0));

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f7f7f7;padding:20px;">
    <div style="max-width:720px;margin:auto;background:#fff;border:1px solid #eaeaea;border-radius:8px;overflow:hidden">
      <div style="background:${BRAND_COLOR};color:#fff;padding:14px 18px;font-size:18px;font-weight:600">
        ${APP_NAME} • ${title} ${order?._id || ''}
      </div>
      <div style="padding:18px">
        <p style="margin:0 0 10px;">Hi ${user?.name || 'Customer'},</p>
        <p style="margin:0 0 12px;">Here is your order summary.</p>

        <table style="width:100%;border-collapse:collapse;margin-top:12px">
          <thead>
            <tr>
              <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #ddd">Product</th>
              <th style="text-align:center;padding:8px 12px;border-bottom:1px solid #ddd">Qty</th>
              <th style="text-align:right;padding:8px 12px;border-bottom:1px solid #ddd">Price</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td></td>
              <td style="text-align:right;padding:8px 12px;">Subtotal:</td>
              <td style="text-align:right;padding:8px 12px;font-weight:600">${money(subtotal)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="text-align:right;padding:8px 12px;">Shipping:</td>
              <td style="text-align:right;padding:8px 12px;font-weight:600">${money(shippingFee)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="text-align:right;padding:8px 12px;">Total:</td>
              <td style="text-align:right;padding:8px 12px;font-weight:700;color:#ef4444">${money(total)}</td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top:16px">
          <div style="font-weight:600;margin-bottom:4px;">Shipping to:</div>
          <div style="font-size:14px;line-height:1.5;color:#444">
            ${shipping?.name || user?.name || ''}<br/>
            ${shipping?.address || ''}${shipping?.city ? ', ' + shipping.city : ''}${shipping?.province ? ', ' + shipping.province : ''}<br/>
            ${shipping?.area || ''}${shipping?.post ? ' - ' + shipping.post : ''}<br/>
            ${shipping?.phone ? 'Phone: ' + shipping.phone : ''}<br/>
            ${user?.email ? 'Email: ' + user.email : ''}
          </div>
        </div>

        <div style="margin-top:16px;font-size:12px;color:#666">
          Manage order: 
          <a href="${clientUrl}/dashboard/orders" style="color:${BRAND_COLOR};text-decoration:none">My Orders</a>
        </div>
      </div>
      <div style="background:#f1f5f9;padding:12px 18px;font-size:12px;color:#64748b;text-align:center">
        This is an automated email. Please do not reply.<br/>
        <a href="${clientUrl}" style="color:${BRAND_COLOR};text-decoration:none;">${displayUrl}</a>
      </div>
    </div>
  </div>`;
}

// seller-specific html using grouped input (products groups from request) or authorOrders
function sellerHtml({ title='New Order', user, shippingInfo, group }) {
  const rows = (Array.isArray(group?.products) ? group.products : []).map((it) => {
    const p = it?.productInfo || it || {};
    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">
          <div style="font-weight:600">${p?.name || '-'}</div>
          ${p?.selectedColor ? `<div style="font-size:12px;color:#555">Color: ${p.selectedColor}</div>` : ''}
          ${p?.selectedSize ? `<div style="font-size:12px;color:#555">Size: ${p.selectedSize}</div>` : ''}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${it?.quantity || p?.quantity || 1}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${money(p?.price)}</td>
      </tr>
    `;
  }).join('');

  const total = Number(group?.price || 0);

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f7f7f7;padding:20px;">
    <div style="max-width:720px;margin:auto;background:#fff;border:1px solid #eaeaea;border-radius:8px;overflow:hidden">
      <div style="background:${BRAND_COLOR};color:#fff;padding:14px 18px;font-size:18px;font-weight:600">
        ${APP_NAME} • ${title}
      </div>
      <div style="padding:18px">
        <p style="margin:0 0 10px;">Hi Seller,</p>
        <p style="margin:0 0 12px;">You have received a new order from ${user?.name || 'Customer'} (${user?.email || ''}).</p>

        <table style="width:100%;border-collapse:collapse;margin-top:12px">
          <thead>
            <tr>
              <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #ddd">Product</th>
              <th style="text-align:center;padding:8px 12px;border-bottom:1px solid #ddd">Qty</th>
              <th style="text-align:right;padding:8px 12px;border-bottom:1px solid #ddd">Price</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td></td>
              <td style="text-align:right;padding:8px 12px;">Subtotal:</td>
              <td style="text-align:right;padding:8px 12px;font-weight:700;color:#ef4444">${money(total)}</td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top:16px">
          <div style="font-weight:600;margin-bottom:4px;">Ship to:</div>
          <div style="font-size:14px;line-height:1.5;color:#444">
            ${shippingInfo?.name || user?.name || ''}<br/>
            ${shippingInfo?.address || ''}${shippingInfo?.city ? ', ' + shippingInfo.city : ''}${shippingInfo?.province ? ', ' + shippingInfo.province : ''}<br/>
            ${shippingInfo?.area || ''}${shippingInfo?.post ? ' - ' + shippingInfo.post : ''}<br/>
            ${shippingInfo?.phone ? 'Phone: ' + shippingInfo.phone : ''}<br/>
            ${user?.email ? 'Email: ' + user.email : ''}
          </div>
        </div>
      </div>
      <div style="background:#f1f5f9;padding:12px 18px;font-size:12px;color:#64748b;text-align:center">
        This is an automated email. Please do not reply.<br/>
        <a href="${clientUrl}" style="color:${BRAND_COLOR};text-decoration:none;">${displayUrl}</a>
      </div>
    </div>
  </div>`;
}

// senders
async function sendOrderPlacedEmails({ order, user, groups = [], sellers = [], shippingFee = 0 }) {
  const subject = `${APP_NAME} • Order Placed ${order?._id || ''}`;

  // buyer
  if (user?.email) {
    await sendMail({
      to: user.email,
      subject,
      html: buyerAdminHtml({ title: 'Order Placed', order, user, shippingFee }),
      text: `Thanks for your order ${order?._id || ''}`
    }).catch(console.error);
  }

  // admin
  if (ADMIN_MAIL) {
    await sendMail({
      to: ADMIN_MAIL,
      subject: `[ADMIN] ${subject}`,
      html: buyerAdminHtml({ title: 'Order Placed', order, user, shippingFee }),
      text: `New order placed by ${user?.name || ''} (${user?.email || ''}).`
    }).catch(console.error);
  }

  // sellers: only their own group items
  const map = new Map();
  groups.forEach(g => { if (g?.sellerId) map.set(String(g.sellerId), g); });

  await Promise.allSettled(
    sellers
      .filter(s => s?.email)
      .map(s => {
        const g = map.get(String(s._id)) || null;
        if (!g) return Promise.resolve();
        return sendMail({
          to: s.email,
          subject: `[SELLER] ${subject}`,
          html: sellerHtml({ title: 'New Order', user, shippingInfo: order?.shippingInfo, group: g }),
          text: `New order from ${user?.name || ''} (${user?.email || ''}).`
        });
      })
  );
}

async function sendOrderPaidEmails({ order, user, authorOrders = [], sellers = [] }) {
  const subject = `${APP_NAME} • Payment Confirmed ${order?._id || ''}`;

  // buyer
  if (user?.email) {
    await sendMail({
      to: user.email,
      subject,
      html: buyerAdminHtml({ title: 'Payment Confirmed', order, user, shippingFee: 0 }),
      text: `Payment received for order ${order?._id || ''}`
    }).catch(console.error);
  }

  // admin
  if (ADMIN_MAIL) {
    await sendMail({
      to: ADMIN_MAIL,
      subject: `[ADMIN] ${subject}`,
      html: buyerAdminHtml({ title: 'Payment Confirmed', order, user, shippingFee: 0 }),
      text: `Payment confirmed for order ${order?._id || ''}`
    }).catch(console.error);
  }

  // sellers
  const map = new Map();
  authorOrders.forEach(ao => { if (ao?.sellerId) map.set(String(ao.sellerId), ao); });

  await Promise.allSettled(
    sellers
      .filter(s => s?.email)
      .map(s => {
        const g = map.get(String(s._id)) || null;
        if (!g) return Promise.resolve();
        return sendMail({
          to: s.email,
          subject: `[SELLER] ${subject}`,
          html: sellerHtml({ title: 'Payment Confirmed', user, shippingInfo: order?.shippingInfo, group: g }),
          text: `Payment confirmed for an order that contains your products.`
        });
      })
  );
}

module.exports = { sendOrderPlacedEmails, sendOrderPaidEmails };