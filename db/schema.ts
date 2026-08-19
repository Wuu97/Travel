import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const tripSnapshots = sqliteTable("trip_snapshots", {
	id: text("id").primaryKey(),
	payload: text("payload").notNull(),
	updatedAt: integer("updated_at").notNull(),
	updatedBy: text("updated_by"),
});
