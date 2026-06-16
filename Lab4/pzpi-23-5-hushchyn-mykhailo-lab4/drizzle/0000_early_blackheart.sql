CREATE TYPE "public"."alert_type" AS ENUM('warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."controller_type" AS ENUM('aerator', 'filter', 'reagent_dispenser', 'pump');--> statement-breakpoint
CREATE TYPE "public"."station_status" AS ENUM('active', 'offline', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'manager', 'technician', 'analyst', 'viewer');--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"station_id" uuid NOT NULL,
	"type" "alert_type" NOT NULL,
	"target_role" "user_role" NOT NULL,
	"message" text NOT NULL,
	"is_resolved" boolean DEFAULT false,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "controller_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"controller_id" uuid NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now(),
	"activation_percentage" numeric(5, 2) NOT NULL,
	"status_message" text
);
--> statement-breakpoint
CREATE TABLE "controllers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"station_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" "controller_type" NOT NULL,
	"is_active" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "parameters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"unit" varchar(20) NOT NULL,
	CONSTRAINT "parameters_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sensors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"station_id" uuid NOT NULL,
	"parameter_id" uuid NOT NULL,
	"model" varchar(100),
	"serial_number" varchar(100),
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "station_thresholds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"station_id" uuid NOT NULL,
	"parameter_id" uuid NOT NULL,
	"min_warning" double precision,
	"max_warning" double precision,
	"min_critical" double precision,
	"max_critical" double precision,
	CONSTRAINT "station_thresholds_station_id_parameter_id_unique" UNIQUE("station_id","parameter_id")
);
--> statement-breakpoint
CREATE TABLE "stations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"status" "station_status" DEFAULT 'active',
	"last_seen" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "telemetry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sensor_id" uuid NOT NULL,
	"measured_at" timestamp with time zone DEFAULT now(),
	"value" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_stations" (
	"user_id" uuid NOT NULL,
	"station_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"full_name" varchar(100),
	"role" "user_role" DEFAULT 'viewer',
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "controller_logs" ADD CONSTRAINT "controller_logs_controller_id_controllers_id_fk" FOREIGN KEY ("controller_id") REFERENCES "public"."controllers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "controllers" ADD CONSTRAINT "controllers_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sensors" ADD CONSTRAINT "sensors_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sensors" ADD CONSTRAINT "sensors_parameter_id_parameters_id_fk" FOREIGN KEY ("parameter_id") REFERENCES "public"."parameters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_thresholds" ADD CONSTRAINT "station_thresholds_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_thresholds" ADD CONSTRAINT "station_thresholds_parameter_id_parameters_id_fk" FOREIGN KEY ("parameter_id") REFERENCES "public"."parameters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry" ADD CONSTRAINT "telemetry_sensor_id_sensors_id_fk" FOREIGN KEY ("sensor_id") REFERENCES "public"."sensors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stations" ADD CONSTRAINT "user_stations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stations" ADD CONSTRAINT "user_stations_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;