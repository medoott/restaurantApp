import { useSecurity } from "../../context/SecurityContext.jsx";

export default function CanView({
  permission,
  any: anyPerms = [],
  all: allPerms = [],
  not = false,
  fallback = null,
  children,
}) {
  const { can, canAny, canAll } = useSecurity();

  let permitted = false;

  if (permission) {
    permitted = can(permission);
  } else if (anyPerms.length > 0) {
    permitted = canAny(anyPerms);
  } else if (allPerms.length > 0) {
    permitted = canAll(allPerms);
  } else {
    return children;
  }

  if (not) permitted = !permitted;

  return permitted ? children : fallback;
}
