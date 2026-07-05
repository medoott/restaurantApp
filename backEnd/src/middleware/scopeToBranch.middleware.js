export const scopeToBranch = (req, res, next) => {
  if (!req.user) return next();

  const { role, branchId } = req.user;

  const scopedRoles = ["Branch Manager", "Cashier", "Cook", "Order Taker", "Host", "Cleaner"];

  if (scopedRoles.includes(role) && branchId) {
    req.branchScope = { branchId };
  }

  next();
};
