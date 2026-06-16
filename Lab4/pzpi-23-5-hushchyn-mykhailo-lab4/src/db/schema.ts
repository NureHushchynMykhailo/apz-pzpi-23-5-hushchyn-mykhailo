import { pgTable, uuid, varchar, doublePrecision, timestamp, boolean, text, pgEnum, numeric,unique} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- ENUMS (Збігаються з вашим SQL) ---
export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'technician', 'analyst', 'viewer']);
export const stationStatusEnum = pgEnum('station_status', ['active', 'offline', 'maintenance']);
export const alertTypeEnum = pgEnum('alert_type', ['warning', 'critical']);
export const controllerTypeEnum = pgEnum('controller_type', ['aerator', 'filter', 'dispenser_acid','dispenser_alkali', 'dispenser_chlorine','pump','valve']);
export const sensorTypeEnum = pgEnum('sensor_type', [
  'do_meter',          // Для 'aerator' (Кисень)
  'turbidity_meter',   // Для 'filter' (Каламутність)
  'pressure_sensor',   // Для 'filter' (Тиск -> Промивка)
  'ph_meter',          // Для 'dispenser_acid' / 'dispenser_alkali'
  'orp_meter',         // Для 'dispenser_chlorine'
  'level_sensor',      // Для 'pump' / 'valve' (Рівень води)
  'thermometer'        // Впливає на точність pH/DO та загальний стан
]);
// --- TABLES ---

// 1. Users
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 100 }),
  role: userRoleEnum('role').default('viewer'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 2. Stations
export const stations = pgTable('stations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  status: stationStatusEnum('status').default('active'),
  lastSeen: timestamp('last_seen', { withTimezone: true }),
});

// 3. User Stations (Many-to-Many)
export const userStations = pgTable('user_stations', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  stationId: uuid('station_id').references(() => stations.id, { onDelete: 'cascade' }).notNull(),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow(),
});

// 4. Parameters
export const parameters = pgTable('parameters', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  unit: varchar('unit', { length: 20 }).notNull(),
});

// 5. Sensors
export const sensors = pgTable('sensors', {
  id: uuid('id').defaultRandom().primaryKey(),
  stationId: uuid('station_id').references(() => stations.id, { onDelete: 'cascade' }).notNull(),
  parameterId: uuid('parameter_id').references(() => parameters.id).notNull(),
  model: varchar('model', { length: 100 }),
  serialNumber: varchar('serial_number', { length: 100 }),
  type: sensorTypeEnum('type').notNull(), 
  isActive: boolean('is_active').default(true),
});
export const stationThresholds = pgTable('station_thresholds', {
  id: uuid('id').defaultRandom().primaryKey(),
  stationId: uuid('station_id').references(() => stations.id, { onDelete: 'cascade' }).notNull(),
  parameterId: uuid('parameter_id').references(() => parameters.id, { onDelete: 'cascade' }).notNull(),
  
  minWarning: doublePrecision('min_warning'),
  maxWarning: doublePrecision('max_warning'),
  minCritical: doublePrecision('min_critical'),
  maxCritical: doublePrecision('max_critical'),
}, (t) => ({
  unq: unique().on(t.stationId, t.parameterId),
}));
// 7. Telemetry (Нормалізована)
export const telemetry = pgTable('telemetry', {
  id: uuid('id').defaultRandom().primaryKey(),
  sensorId: uuid('sensor_id').references(() => sensors.id, { onDelete: 'cascade' }).notNull(),
  measuredAt: timestamp('measured_at', { withTimezone: true }).defaultNow(),
  value: doublePrecision('value').notNull(),
});

// 8. Alerts
export const alerts = pgTable('alerts', {
  id: uuid('id').defaultRandom().primaryKey(),
  stationId: uuid('station_id').references(() => stations.id, { onDelete: 'cascade' }).notNull(),
  type: alertTypeEnum('type').notNull(),
  targetRole: userRoleEnum('target_role').notNull(),
  message: text('message').notNull(),
  isResolved: boolean('is_resolved').default(false),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 9. Controllers
export const controllers = pgTable('controllers', {
  id: uuid('id').defaultRandom().primaryKey(),
  stationId: uuid('station_id').references(() => stations.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  type: controllerTypeEnum('type').notNull(),
  isActive: boolean('is_active').default(false),
});

// 10. Controller Logs (З відсотками)
export const controllerLogs = pgTable('controller_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  controllerId: uuid('controller_id').references(() => controllers.id, { onDelete: 'cascade' }).notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
  activationPercentage: numeric('activation_percentage', { precision: 5, scale: 2 }).notNull(), // Decimal
  statusMessage: text('status_message'),
});

// --- RELATIONS (Для зручних запитів query builder) ---
// (Тут можна додати relations, якщо потрібно робити вкладені запити findMany({ with: ... }))