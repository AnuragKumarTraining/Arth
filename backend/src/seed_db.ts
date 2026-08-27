import dotenv from 'dotenv';

dotenv.config();

import { randomInt, randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';

import { db } from './db';

import {
  customers,
  accounts,
  branches,
} from './db/schema';

import { transactions } from './db/schema/transaction';

const SEED_BRANCH_CODE = 'ARTH001';

const SEED_PASSWORD_HASH =
  process.env.SEED_PASSWORD_HASH;

if (!SEED_PASSWORD_HASH) {
  throw new Error(
    'SEED_PASSWORD_HASH environment variable is required.',
  );
}

const passwordHash:string = SEED_PASSWORD_HASH

const CONFIG = {
  customerCount: 500_000,
  accountCount: 750_000,
  transactionCount: 1_000_000,

  customerBatchSize: 2_000,
  accountBatchSize: 2_000,
  transactionBatchSize: 2_000,
  balanceUpdateBatchSize: 2_000,
};

const FIRST_NAMES = [
  'Aarav',
  'Arjun',
  'Aditya',
  'Rahul',
  'Rohan',
  'Vikram',
  'Karan',
  'Ankit',
  'Akash',
  'Ravi',
  'Amit',
  'Nikhil',
  'Sahil',
  'Varun',
  'Vivek',
  'Priya',
  'Ananya',
  'Aditi',
  'Neha',
  'Pooja',
  'Sneha',
  'Kavya',
  'Riya',
  'Isha',
  'Simran',
];

const LAST_NAMES = [
  'Sharma',
  'Singh',
  'Kumar',
  'Patel',
  'Gupta',
  'Verma',
  'Reddy',
  'Mehta',
  'Shah',
  'Joshi',
  'Malhotra',
  'Agarwal',
  'Mishra',
  'Nair',
  'Iyer',
  'Rao',
];

const ACCOUNT_TYPES = [
  'SAVINGS',
  'CURRENT',
] as const;

const TRANSACTION_TYPES = [
  'DEPOSIT',
  'WITHDRAWAL',
  'TRANSFER',
  'FEE',
  'INTEREST',
] as const;

const TRANSACTION_STATUSES = [
  'COMPLETED',
  'COMPLETED',
  'COMPLETED',
  'COMPLETED',
  'COMPLETED',
  'COMPLETED',
  'COMPLETED',
  'COMPLETED',
  'FAILED',
  'PENDING',
] as const;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function randomItem<T>(
  items: readonly T[],
): T {
  return items[randomInt(items.length)];
}

function pad(
  value: number,
  length: number,
): string {
  return value.toString().padStart(length, '0');
}

function randomAmount(
  min: number,
  max: number,
): number {
  const minCents = Math.round(min * 100);
  const maxCents = Math.round(max * 100);

  return (
    randomInt(
      minCents,
      maxCents + 1,
    ) / 100
  );
}

function money(
  value: number,
): string {
  return value.toFixed(2);
}

function accountNumber(
  accountIndex: number,
): string {
  /*
   * 501000 + 14 digits = 20 characters
   */
  return `501000${pad(accountIndex, 14)}`;
}

function customerEmail(
  customerIndex: number,
): string {
  return `seed.customer.${customerIndex}@arth.local`;
}

function phoneNumber(
  customerIndex: number,
): string {
  /*
   * 9 + 9 digits = 10 digits
   */
  return `9${pad(customerIndex, 9)}`;
}

function nationalId(
  customerIndex: number,
): string {
  return `SEED${pad(customerIndex, 12)}`;
}

function referenceNumber(
  transactionIndex: number,
): string {
  return `SEED-TXN-${pad(
    transactionIndex,
    12,
  )}`;
}

function idempotencyKey(
  transactionIndex: number,
): string {
  return `SEED-IDEMP-${pad(
    transactionIndex,
    12,
  )}`;
}

/* -------------------------------------------------------------------------- */
/* Branch validation                                                          */
/* -------------------------------------------------------------------------- */

async function validateBranch(): Promise<void> {
  const result = await db
    .select({
      branchCode: branches.branchCode,
    })
    .from(branches)
    .where(
      sql`${branches.branchCode} = ${SEED_BRANCH_CODE}`,
    )
    .limit(1);

  if (result.length === 0) {
    throw new Error(
      `Branch ${SEED_BRANCH_CODE} does not exist. Seed the branch first.`,
    );
  }

  console.log(
    `Using existing branch: ${SEED_BRANCH_CODE}`,
  );
}

/* -------------------------------------------------------------------------- */
/* Customers                                                                  */
/* -------------------------------------------------------------------------- */

async function seedCustomers(): Promise<
  number[]
> {
  console.log(
    `Seeding ${CONFIG.customerCount.toLocaleString()} customers...`,
  );

  const customerIds: number[] = [];

  for (
    let start = 0;
    start < CONFIG.customerCount;
    start += CONFIG.customerBatchSize
  ) {
    const end = Math.min(
      start + CONFIG.customerBatchSize,
      CONFIG.customerCount,
    );

    const rows = [];

    for (
      let index = start;
      index < end;
      index++
    ) {
      const customerNumber = index + 1;

      const firstName =
        randomItem(FIRST_NAMES);

      const lastName =
        randomItem(LAST_NAMES);

      const birthYear =
        randomInt(1970, 2000);

      const birthMonth =
        randomInt(0, 12);

      const birthDay =
        randomInt(1, 28);

      rows.push({
        email:
          customerEmail(
            customerNumber,
          ),

        passwordHash:
          passwordHash,

        firstName,
        lastName,

        dateOfBirth: new Date(
          birthYear,
          birthMonth,
          birthDay,
        ),

        phoneNumber:
          phoneNumber(
            customerNumber,
          ),

        nationalId:
          nationalId(
            customerNumber,
          ),

        address:
          `${customerNumber} Banking Avenue, India`,

        /*
         * Every customer belongs to
         * the already-existing branch.
         */
        branchId:
          SEED_BRANCH_CODE,

        isActive: true,

        kycStatus: 'APPROVED',
      });
    }

    const inserted = await db
      .insert(customers)
      .values(rows)
      .returning({
        id: customers.id,
      });

    customerIds.push(
      ...inserted.map(
        (customer) => customer.id,
      ),
    );

    console.log(
      `Customers: ${end.toLocaleString()} / ${CONFIG.customerCount.toLocaleString()}`,
    );
  }

  return customerIds;
}

/* -------------------------------------------------------------------------- */
/* Accounts                                                                   */
/* -------------------------------------------------------------------------- */

async function seedAccounts(
  customerIds: number[],
): Promise<number[]> {
  console.log(
    `Seeding ${CONFIG.accountCount.toLocaleString()} accounts...`,
  );

  const accountIds: number[] = [];

  for (
    let start = 0;
    start < CONFIG.accountCount;
    start += CONFIG.accountBatchSize
  ) {
    const end = Math.min(
      start + CONFIG.accountBatchSize,
      CONFIG.accountCount,
    );

    const rows = [];

    for (
      let index = start;
      index < end;
      index++
    ) {
      const accountIndex = index + 1;

      /*
       * Every account gets an existing customer.
       */
      const customerId =
        customerIds[
          randomInt(customerIds.length)
        ];

      rows.push({
        accountNumber:
          accountNumber(
            accountIndex,
          ),

        accountType:
          randomItem(
            ACCOUNT_TYPES,
          ),

        currency: 'INR',

        /*
         * Start at zero.
         *
         * Completed transactions will determine
         * the final balance.
         */
        balance: '0.00',

        availableBalance: '0.00',

        status: 'ACTIVE',

        customerId,

        /*
         * Every account belongs to the
         * existing branch.
         */
        branchId:
          SEED_BRANCH_CODE,
      });
    }

    const inserted = await db
      .insert(accounts)
      .values(rows)
      .returning({
        id: accounts.id,
      });

    accountIds.push(
      ...inserted.map(
        (account) => account.id,
      ),
    );

    console.log(
      `Accounts: ${end.toLocaleString()} / ${CONFIG.accountCount.toLocaleString()}`,
    );
  }

  return accountIds;
}

/* -------------------------------------------------------------------------- */
/* Balance state                                                              */
/* -------------------------------------------------------------------------- */

function createBalances(): Float64Array {
  return new Float64Array(
    CONFIG.accountCount,
  );
}

/* -------------------------------------------------------------------------- */
/* Transactions                                                               */
/* -------------------------------------------------------------------------- */

type GeneratedTransaction = {
  type:
    | 'DEPOSIT'
    | 'WITHDRAWAL'
    | 'TRANSFER'
    | 'FEE'
    | 'INTEREST';

  status:
    | 'PENDING'
    | 'COMPLETED'
    | 'FAILED'
    | 'REVERSED';

  amount: number;

  feeAmount: number;

  senderIndex: number | null;

  receiverIndex: number | null;

  description: string;
};

function generateTransaction(
  accountIds: number[],
): GeneratedTransaction {
  const type =
    randomItem(
      TRANSACTION_TYPES,
    );

  const status =
    randomItem(
      TRANSACTION_STATUSES,
    );

  switch (type) {
    case 'DEPOSIT': {
      return {
        type,
        status,
        amount: randomAmount(
          500,
          100_000,
        ),
        feeAmount: 0,

        senderIndex: null,

        receiverIndex:
          randomInt(
            accountIds.length,
          ),

        description:
          'Seeded cash deposit',
      };
    }

    case 'WITHDRAWAL': {
      return {
        type,
        status,
        amount: randomAmount(
          100,
          25_000,
        ),
        feeAmount: 0,

        senderIndex:
          randomInt(
            accountIds.length,
          ),

        receiverIndex: null,

        description:
          'Seeded cash withdrawal',
      };
    }

    case 'TRANSFER': {
      const senderIndex =
        randomInt(
          accountIds.length,
        );

      let receiverIndex =
        randomInt(
          accountIds.length,
        );

      while (
        receiverIndex ===
        senderIndex
      ) {
        receiverIndex =
          randomInt(
            accountIds.length,
          );
      }

      return {
        type,
        status,
        amount: randomAmount(
          100,
          25_000,
        ),
        feeAmount: 0,

        senderIndex,

        receiverIndex,

        description:
          'Seeded account transfer',
      };
    }

    case 'FEE': {
      return {
        type,
        status,
        amount: randomAmount(
          10,
          500,
        ),
        feeAmount: 0,

        senderIndex:
          randomInt(
            accountIds.length,
          ),

        receiverIndex: null,

        description:
          'Seeded banking service fee',
      };
    }

    case 'INTEREST': {
      return {
        type,
        status,
        amount: randomAmount(
          10,
          2_000,
        ),
        feeAmount: 0,

        senderIndex: null,

        receiverIndex:
          randomInt(
            accountIds.length,
          ),

        description:
          'Seeded interest credit',
      };
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Transaction seeding                                                        */
/* -------------------------------------------------------------------------- */

async function seedTransactions(
  accountIds: number[],
  balances: Float64Array,
): Promise<void> {
  console.log(
    `Seeding ${CONFIG.transactionCount.toLocaleString()} transactions...`,
  );

  for (
    let start = 0;
    start < CONFIG.transactionCount;
    start += CONFIG.transactionBatchSize
  ) {
    const end = Math.min(
      start +
        CONFIG.transactionBatchSize,
      CONFIG.transactionCount,
    );

    const rows = [];

    for (
      let index = start;
      index < end;
      index++
    ) {
      const transactionNumber =
        index + 1;

      const generated =
        generateTransaction(
          accountIds,
        );

      let {
        type,
        status,
        amount,
        feeAmount,
        senderIndex,
        receiverIndex,
        description,
      } = generated;

      /*
       * Convert account indexes into
       * actual PostgreSQL account IDs.
       */
      const senderAccountId =
        senderIndex === null
          ? null
          : accountIds[
              senderIndex
            ];

      const receiverAccountId =
        receiverIndex === null
          ? null
          : accountIds[
              receiverIndex
            ];

      /*
       * Only COMPLETED transactions
       * affect balances.
       */
      if (
        status === 'COMPLETED'
      ) {
        /*
         * Withdrawal / Fee
         */
        if (
          senderIndex !== null &&
          receiverIndex === null
        ) {
          if (
            balances[
              senderIndex
            ] < amount
          ) {
            status = 'FAILED';
          } else {
            balances[
              senderIndex
            ] -= amount;
          }
        }

        /*
         * Deposit / Interest
         */
        else if (
          senderIndex === null &&
          receiverIndex !== null
        ) {
          balances[
            receiverIndex
          ] += amount;
        }

        /*
         * Transfer
         */
        else if (
          senderIndex !== null &&
          receiverIndex !== null
        ) {
          if (
            balances[
              senderIndex
            ] < amount
          ) {
            status = 'FAILED';
          } else {
            balances[
              senderIndex
            ] -= amount;

            balances[
              receiverIndex
            ] += amount;
          }
        }
      }

      /*
       * If transaction failed because
       * of insufficient funds, record
       * the reason.
       */
      const failureReason =
        status === 'FAILED'
          ? 'Insufficient funds'
          : null;

      rows.push({
        id: randomUUID(),

        referenceNumber:
          referenceNumber(
            transactionNumber,
          ),

        idempotencyKey:
          idempotencyKey(
            transactionNumber,
          ),

        senderAccountId,

        receiverAccountId,

        externalAccountNumber:
          null,

        externalRoutingCode:
          null,

        externalBankName:
          null,

        amount: money(amount),

        feeAmount:
          money(feeAmount),

        currency: 'INR',

        type,

        status,

        failureReason,

        description,

        completedAt:
          status === 'COMPLETED'
            ? new Date()
            : null,
      });
    }

    await db
      .insert(transactions)
      .values(rows);

    console.log(
      `Transactions: ${end.toLocaleString()} / ${CONFIG.transactionCount.toLocaleString()}`,
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Update balances                                                            */
/* -------------------------------------------------------------------------- */

async function updateAccountBalances(
  accountIds: number[],
  balances: Float64Array,
): Promise<void> {
  console.log(
    'Updating final account balances...',
  );

  for (
    let start = 0;
    start < accountIds.length;
    start +=
      CONFIG.balanceUpdateBatchSize
  ) {
    const end = Math.min(
      start +
        CONFIG.balanceUpdateBatchSize,
      accountIds.length,
    );

    const values = [];

    for (
      let index = start;
      index < end;
      index++
    ) {
      values.push({
        id: accountIds[index],
        balance: money(
          balances[index],
        ),
      });
    }

    const valuesSql = sql.join(
      values.map(
        ({ id, balance }) =>
          sql`(${id}::integer, ${balance}::numeric)`,
      ),
      sql`, `,
    );

    await db.execute(sql`
      UPDATE accounts
      SET
        balance = data.balance,
        available_balance = data.balance,
        updated_at = NOW()
      FROM (
        VALUES ${valuesSql}
      ) AS data(id, balance)
      WHERE accounts.id = data.id
    `);

    console.log(
      `Balances: ${end.toLocaleString()} / ${accountIds.length.toLocaleString()}`,
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

async function main(): Promise<void> {
  const startedAt =
    Date.now();

  console.log('');
  console.log(
    '==========================================',
  );
  console.log(
    '       ARTH MILLION-ROW DATABASE SEED',
  );
  console.log(
    '==========================================',
  );
  console.log('');

  /*
   * Make sure ARTH001 exists.
   */
  await validateBranch();

  /*
   * 500,000 customers
   */
  const customerIds =
    await seedCustomers();

  /*
   * 750,000 accounts
   */
  const accountIds =
    await seedAccounts(
      customerIds,
    );

  /*
   * 1,000,000 transactions
   */
  const balances =
    createBalances();

  await seedTransactions(
    accountIds,
    balances,
  );

  /*
   * Persist the balances resulting from
   * completed transactions.
   */
  await updateAccountBalances(
    accountIds,
    balances,
  );

  const elapsedSeconds =
    (Date.now() -
      startedAt) /
    1000;

  console.log('');
  console.log(
    '==========================================',
  );
  console.log(
    '              SEED COMPLETE',
  );
  console.log(
    '==========================================',
  );

  console.log(
    `Branch:       ${SEED_BRANCH_CODE}`,
  );

  console.log(
    `Customers:    ${CONFIG.customerCount.toLocaleString()}`,
  );

  console.log(
    `Accounts:     ${CONFIG.accountCount.toLocaleString()}`,
  );

  console.log(
    `Transactions: ${CONFIG.transactionCount.toLocaleString()}`,
  );

  console.log(
    `Time:         ${elapsedSeconds.toFixed(2)} seconds`,
  );

  console.log(
    '==========================================',
  );
}

main().catch((error) => {
  console.error('');
  console.error(
    'DATABASE SEED FAILED',
  );
  console.error(error);
  console.error('');

  process.exit(1);
});