const BRANCH_ROOM_PREFIX = "branch:";

export function emitToBranch(io, branchId, event, data) {
  if (!io || !branchId) {
    if (io) io.emit(event, data);
    return;
  }
  io.to(`${BRANCH_ROOM_PREFIX}${branchId}`).emit(event, data);
}

export function emitToOrderAndBranch(io, order, event, data) {
  const rooms = [`order:${order.id || order._id}`];
  if (order.branchId) {
    rooms.push(`${BRANCH_ROOM_PREFIX}${order.branchId}`);
  }
  io.to(rooms).emit(event, data);
}
