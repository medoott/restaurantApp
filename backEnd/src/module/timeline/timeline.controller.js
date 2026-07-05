import * as activityTimelineService from "./service/activity.timeline.service.js";
import { asyncHandler } from "../../util/error/error.js";
import { successResponse } from "../../util/response/success.res.js";

export const getOrderTimeline = asyncHandler(async (req, res) => {
  const result = await activityTimelineService.getOrderTimeline(req.params.orderId);
  res.json({ message: "Done", data: { events: result } });
});

export const getTimelineEvents = asyncHandler(async (req, res) => {
  const result = await activityTimelineService.getTimelineEvents(req.query);
  res.json({ message: "Done", data: result });
});
