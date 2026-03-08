import { Router } from "express";
import {
  createRoomBodySchema,
  listRoomsQuerySchema,
  roomIdParamSchema,
} from "../validation/roomValidation.js";
import { db } from "../database/db.js";
import { rooms } from "../database/schema.js";
import { desc, eq } from "drizzle-orm";

export const roomRouter = Router();
const MAX_LIMIT = 100;

roomRouter.get("/", async (req, res) => {
  const parsed = listRoomsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid Query Parameters", details: parsed.error });
  }

  const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

  try {
    const results = await db
      .select()
      .from(rooms)
      .orderBy(desc(rooms.createdAt))
      .limit(limit);

    res.status(200).json({ rooms: results });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    res.status(500).json({ error: "Failed to list rooms" });
  }
});

roomRouter.post("/", async (req, res) => {
  const parsed = createRoomBodySchema.safeParse(req.body);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid Payload", details: parsed.error });
  }

  try {
    const [event] = await db.insert(rooms).values(parsed.data).returning();

    // BroadCast to All

    try {
      res.app.locals.broadCastCreatedRoom?.(event);
    } catch (broadCastError) {
      console.error("Error broadcasting created room:", broadCastError);
    }

    res.status(201).json({ message: "Room created successfully", room: event });
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ error: "Failed to create room" });
  }
});

roomRouter.delete("/:id", async (req, res) => {
  const parsed = roomIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid Room ID", details: parsed.error });
  }

  try {
    const [room] = await db
      .delete(rooms)
      .where(eq(rooms.id, parsed.data.id))
      .returning();

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    res.status(200).json({ message: "Room deleted successfully", room });
  } catch (error) {
    console.error("Error deleting room:", error);
    return res.status(500).json({ error: "Failed to delete room" });
  }
});

roomRouter.post("/:id/send", (req, res) => {
  const parsed = roomIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid Room ID", details: parsed.error });
  }

  res.app.locals.broadCastToRoomMembers?.(parsed.data.id, {
    type: "Test Message to the Room",
  });

  res.status(200).json({ message: "Message broadcasted to room members" });
});
