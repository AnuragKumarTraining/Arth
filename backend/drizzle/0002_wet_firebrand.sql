ALTER TYPE "public"."transaction_type" ADD VALUE 'FEE';--> statement-breakpoint
ALTER TYPE "public"."transaction_type" ADD VALUE 'INTEREST';--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_branch_id_branches_id_fk";
--> statement-breakpoint
ALTER TABLE "branches" ALTER COLUMN "branch_code" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "branch_id" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "account_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "balance" SET DATA TYPE numeric(15, 2);--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "balance" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "branch_id" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "beneficiaries" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "beneficiaries" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "auth_sessions" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "auth_sessions" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "auth_sessions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "amount" SET DATA TYPE numeric(15, 2);--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "currency" varchar(3) DEFAULT 'INR' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "available_balance" numeric(15, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "status" varchar(20) DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD COLUMN "nickname" varchar(50);--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD COLUMN "daily_limit" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD COLUMN "cooling_period_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD COLUMN "ip_address" varchar(45);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "idempotency_key" varchar(100);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "fee_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "currency" varchar(3) DEFAULT 'INR' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "failure_reason" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_branch_id_branches_branch_code_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("branch_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" DROP COLUMN "account_type";--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_ifsc_code_unique" UNIQUE("ifsc_code");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_idempotency_key_unique" UNIQUE("idempotency_key");