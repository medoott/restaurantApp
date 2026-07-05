import PaymentSession from "../../../DB/model/PaymentSession.model.js";
import Order from "../../../DB/model/Order.model.js";
import Visit from "../../../DB/model/Visit.model.js";
import Table from "../../../DB/model/Table.model.js";
import User from "../../../DB/model/User.model.js";
import AuditLog from "../../../DB/model/AuditLog.model.js";
import { createNotification } from "../../notification/notification.service.js";
import { getIO } from "../../../config/socket.js";
import { AppError } from "../../../util/error/AppError.js";
import { getSettings } from "../../settings/settings.service.js";

export async function calculateBill(visitId) {
  const visit = await Visit.findById(visitId).lean();
  if (!visit) throw new AppError("Visit not found", 404);

  const orders = await Order.find({
    _id: { $in: visit.orders.map((o) => o.orderId) },
    status: { $nin: ["Cancelled", "Rejected"] },
  }).lean();

  const settings = await getSettings();
  const taxRate = settings?.payment?.taxRate || 0;
  const serviceChargeRate = settings?.payment?.serviceChargeRate || 0;

  const itemsDetail = [];
  let subtotal = 0;

  for (const order of orders) {
    if (order.itemsDetail && Array.isArray(order.itemsDetail)) {
      for (const item of order.itemsDetail) {
        const existing = itemsDetail.find(
          (i) => i.name === item.name && i.price === item.price
        );
        if (existing) {
          existing.qty += item.qty;
          existing.total = existing.qty * existing.price;
        } else {
          itemsDetail.push({
            name: item.name,
            qty: item.qty,
            price: item.price,
            total: item.qty * item.price,
          });
        }
      }
    }
    subtotal += order.total || 0;
  }

  const discountAmount = visit.billing.discount || 0;
  const afterDiscount = Math.max(subtotal - discountAmount, 0);
  const serviceCharge = afterDiscount * (serviceChargeRate / 100);
  const taxAmount = (afterDiscount + serviceCharge) * (taxRate / 100);
  const total = afterDiscount + serviceCharge + taxAmount;

  return {
    visitNumber: visit.visitNumber,
    tableNumber: visit.table.tableNumber,
    customerName: visit.customer.name,
    items: itemsDetail,
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(discountAmount.toFixed(2)),
    afterDiscount: Number(afterDiscount.toFixed(2)),
    serviceChargeRate: serviceChargeRate,
    serviceCharge: Number(serviceCharge.toFixed(2)),
    taxRate,
    taxAmount: Number(taxAmount.toFixed(2)),
    total: Number(total.toFixed(2)),
    orderCount: orders.length,
  };
}

export async function createVisitPaymentSession(visitId, requestedBy, opts = {}) {
  const visit = await Visit.findById(visitId);
  if (!visit) throw new AppError("Visit not found", 404);
  if (visit.status === "payment_completed" || visit.status === "closed") {
    throw new AppError("Visit is already closed", 400);
  }

  const bill = await calculateBill(visitId);
  const existingSession = await PaymentSession.findOne({
    visitId: visit._id,
    status: { $in: ["pending", "processing"] },
  }).lean();
  if (existingSession) {
    throw new AppError("A payment session already exists for this visit", 409);
  }

  const paymentMethod = opts.paymentMethod || "Cash";
  const isSplitPayment = opts.isSplitPayment || false;
  const splitAmount = opts.splitAmount || bill.total;
  const splitGroup = opts.splitGroup || null;

  const paymentSession = await PaymentSession.create({
    visitId: visit._id,
    visitNumber: visit.visitNumber,
    tableNumber: visit.table.tableNumber,
    requestedBy,
    status: "pending",
    paymentMethod,
    subtotal: bill.subtotal,
    discount: bill.discount,
    taxRate: bill.taxRate,
    taxAmount: bill.taxAmount,
    serviceCharge: bill.serviceCharge,
    total: isSplitPayment ? splitAmount : bill.total,
    amountPaid: 0,
    items: bill.items,
    isSplitPayment,
    splitGroup,
    splitTotal: isSplitPayment ? bill.total : null,
    startedAt: new Date(),
  });

  visit.status = "payment_in_progress";
  visit.billing.paymentSessionIds.push(paymentSession._id);
  await visit.save();

  await Order.updateMany(
    { _id: { $in: visit.orders.map((o) => o.orderId) } },
    { $set: {
      status: "PaymentInProgress",
      paymentStartedAt: new Date(),
      ...(paymentMethod ? { payment: paymentMethod } : {}),
    } },
  );

  await createNotification({
    type: "payment_request",
    title: "Payment Requested",
    message: `Payment for Visit ${visit.visitNumber} — Table ${visit.table.tableNumber}. Total: $${bill.total.toFixed(2)}`,
    priority: "high",
    roleTarget: "Cashier",
    metadata: {
      visitId: visit._id.toString(),
      tableNumber: visit.table.tableNumber,
      paymentSessionId: paymentSession._id.toString(),
      total: bill.total,
    },
  });

  await AuditLog.create({
    action: "payment_session_created",
    description: `Payment session created for Visit ${visit.visitNumber} (Table ${visit.table.tableNumber}) — $${bill.total.toFixed(2)}`,
    tableNumber: visit.table.tableNumber,
    newValue: { total: bill.total, method: paymentMethod, splitPayment: isSplitPayment },
  });

  return paymentSession;
}

export async function processVisitPaymentSession(paymentSessionId, userId, opts = {}) {
  const session = await PaymentSession.findById(paymentSessionId).lean();
  if (!session) throw new AppError("Payment session not found", 404);
  if (session.status !== "pending") throw new AppError("Payment already processed", 400);

  const visit = await Visit.findById(session.visitId);
  if (!visit) throw new AppError("Visit not found", 404);

  const amountPaid = Number(opts.amountPaid) || session.total;
  const paymentMethod = opts.paymentMethod || session.paymentMethod;
  const now = new Date();

  const updatedSession = await PaymentSession.findByIdAndUpdate(
    paymentSessionId,
    {
      $set: {
        status: "completed",
        processedBy: userId,
        paymentMethod,
        amountPaid: Math.min(amountPaid, session.total),
        change: Math.max(amountPaid - session.total, 0),
        completedAt: now,
        receiptGenerated: true,
      },
    },
    { new: true },
  ).lean();

  visit.billing.amountPaid = (visit.billing.amountPaid || 0) + updatedSession.amountPaid;
  visit.billing.total = session.total;

  if (session.isSplitPayment && visit.billing.amountPaid < session.splitTotal) {
    visit.billing.paymentStatus = "partial";
  } else {
    visit.billing.paymentStatus = "paid";
    visit.status = "payment_completed";
    visit.timestamps.paidAt = now;
    visit.metrics.totalSpent = visit.billing.amountPaid;

    const ordersToPay = session.orderIds && session.orderIds.length > 0
      ? { _id: { $in: session.orderIds } }
      : { visitId: session.visitId };

    await Order.updateMany(
      { _id: { $in: visit.orders.map((o) => o.orderId) } },
      {
        $set: {
          paymentStatus: "paid",
          paidAt: now,
          paidBy: userId,
        },
      },
    );
  }

  await visit.save();

  await createNotification({
    type: "payment_completed",
    title: "Payment Received",
    message: `$${updatedSession.amountPaid.toFixed(2)} received for Visit ${visit.visitNumber} (Table ${visit.table.tableNumber})`,
    priority: "medium",
    recipientId: session.requestedBy || visit.staff.assignedWaiter,
    metadata: {
      visitId: visit._id.toString(),
      tableNumber: visit.table.tableNumber,
      amount: updatedSession.amountPaid,
    },
  });

  await AuditLog.create({
    action: "payment_processed",
    description: `Payment processed for Visit ${visit.visitNumber}: $${updatedSession.amountPaid.toFixed(2)} via ${paymentMethod}`,
    tableNumber: visit.table.tableNumber,
    newValue: { amount: updatedSession.amountPaid, method: paymentMethod },
  });

  return { session: updatedSession, visit };
}

export async function splitBillByItems(visitId, splits, requestedBy) {
  const visit = await Visit.findById(visitId).lean();
  if (!visit) throw new AppError("Visit not found", 404);

  const session = await createVisitPaymentSession(visitId, requestedBy, {
    isSplitPayment: true,
    splitGroup: "items",
  });

  return session;
}

export async function splitBillByAmount(visitId, amounts, requestedBy) {
  const visit = await Visit.findById(visitId).lean();
  if (!visit) throw new AppError("Visit not found", 404);

  const bill = await calculateBill(visitId);
  const totalAllocated = amounts.reduce((sum, a) => sum + a, 0);

  if (Math.abs(totalAllocated - bill.total) > 0.01) {
    throw new AppError(`Split amounts ($${totalAllocated.toFixed(2)}) must equal total ($${bill.total.toFixed(2)})`, 400);
  }

  const sessions = [];
  for (let i = 0; i < amounts.length; i++) {
    const session = await createVisitPaymentSession(visitId, requestedBy, {
      isSplitPayment: true,
      splitAmount: amounts[i],
      splitGroup: `guest_${i + 1}`,
      paymentMethod: "Cash",
    });
    sessions.push(session);
  }

  return sessions;
}

export async function applyCoupon(visitId, couponCode) {
  const settings = await getSettings();
  const coupons = settings?.payment?.coupons || [];

  const coupon = coupons.find(
    (c) => c.code === couponCode && c.active !== false
  );
  if (!coupon) throw new AppError("Invalid or expired coupon code", 400);

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    throw new AppError("Coupon has expired", 400);
  }

  const discount = coupon.type === "percentage"
    ? 0
    : (coupon.amount || 0);

  const visit = await Visit.findById(visitId);
  if (!visit) throw new AppError("Visit not found", 404);

  visit.billing.discount = (visit.billing.discount || 0) + discount;
  await visit.save();

  await AuditLog.create({
    action: "coupon_applied",
    description: `Coupon ${couponCode} applied — $${discount.toFixed(2)} discount`,
    tableNumber: visit.table.tableNumber,
    newValue: { couponCode, discount },
  });

  return { discount, remainingBalance: (visit.billing.subtotal || 0) - visit.billing.discount };
}
