import { z } from "zod";

// Getting the Rooms with Limit
const listRoomsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

// Room Id Validation
const roomIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Create a Room Validation
const createRoomBodySchema = z
  .object({
    name: z
      .string()
      .min(1, "Room name is required")
      .max(255, "Room name must be at most 255 characters"),
    createdAt: z.string().optional(),
    maxConnections: z.coerce.number().int().positive().max(1000).optional(),
  })
  .refine(
    (data) => {
      return (
        data.createdAt === undefined ||
        !Number.isNaN(Date.parse(data.createdAt))
      );
    },
    {
      message: "createdAt must be a valid date string",
      path: ["createdAt"],
    },
  );

export { listRoomsQuerySchema, roomIdParamSchema, createRoomBodySchema };
