import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  // User profiles with names
  profiles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // Conversation messages
  messages: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // Saved destinations/places
  destinations: defineTable({
    userId: v.id("users"),
    name: v.string(),
    address: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // Navigation history
  navigationHistory: defineTable({
    userId: v.id("users"),
    destination: v.string(),
    address: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});
