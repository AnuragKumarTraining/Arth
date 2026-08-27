import bcrypt from 'bcrypt';

const password = 'Admin@1234';

async function createHash() {
  const hashedPassword = await bcrypt.hash(password, 12);

  console.log(hashedPassword);
}

createHash().catch((error) => {
  console.error('Failed to create password hash:', error);
  process.exit(1);
});