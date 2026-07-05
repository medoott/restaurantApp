import usePermissions from "../../hooks/usePermissions.js";

export default function Can({
  permission,
  any = [],
  all = [],
  not = false,
  user,
  fallback = null,
  children,
}) {
  const { can, canAny, canAll } = usePermissions(user);

  let permitted = false;

  if (permission) {
    permitted = can(permission);
  } else if (any.length > 0) {
    permitted = canAny(any);
  } else if (all.length > 0) {
    permitted = canAll(all);
  }

  if (not) permitted = !permitted;

  return permitted ? children : fallback;
}
