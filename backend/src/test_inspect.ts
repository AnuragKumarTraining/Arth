import { db } from './db';
import { accounts, customers, transactions } from './db/schema';
import { eq, or } from 'drizzle-orm';

async function main() {
  const accs = await db.select({
    id: accounts.id,
    accountNumber: accounts.accountNumber,
    customerId: accounts.customerId,
    balance: accounts.balance,
    availableBalance: accounts.availableBalance,
    customerEmail: customers.email,
    firstName: customers.firstName,
    lastName: customers.lastName
  }).from(accounts)
  .leftJoin(customers, eq(accounts.customerId, customers.id))
  .where(eq(accounts.accountNumber, '105444613963'));

  console.log('ACCOUNT:', accs);

  if (accs.length > 0) {
    const acc = accs[0];
    const txs = await db.select().from(transactions).where(
      or(
        eq(transactions.senderAccountId, acc.id),
        eq(transactions.receiverAccountId, acc.id)
      )
    );
    console.log('TRANSACTIONS FOR ACCOUNT ID', acc.id, 'CUST ID', acc.customerId, ':', txs);

    const allAccs = await db.select().from(accounts);
    console.log('ALL ACCOUNTS IN DB:', allAccs);
  } else {
    console.log('ALL ACCOUNTS IN DB:');
    const allAccs = await db.select().from(accounts);
    console.log(allAccs);
  }
  process.exit(0);
}

main().catch(console.error);
