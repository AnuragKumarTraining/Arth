CREATE TYPE "public"."loan_status" AS ENUM('ACTIVE', 'CLOSED', 'DEFAULTED', 'PENDING_DISBURSAL');--> statement-breakpoint
CREATE TYPE "public"."loan_type" AS ENUM('PERSONAL', 'HOME', 'AUTO', 'EDUCATION');--> statement-breakpoint
CREATE TABLE "loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_number" varchar(20) NOT NULL,
	"customer_id" integer NOT NULL,
	"type" "loan_type" NOT NULL,
	"status" "loan_status" DEFAULT 'ACTIVE' NOT NULL,
	"principal_amount" numeric(15, 2) NOT NULL,
	"outstanding_balance" numeric(15, 2) NOT NULL,
	"interest_rate" numeric(5, 2) NOT NULL,
	"tenure_months" integer NOT NULL,
	"emi_amount" numeric(15, 2) NOT NULL,
	"next_emi_date" timestamp,
	"disbursed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loans_loan_number_unique" UNIQUE("loan_number")
);
--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;