import { db } from '../config/db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export class UserRepository {
  async findAll() {
    return await db.select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      createdAt: users.createdAt
    }).from(users);
  }

  async findById(id: string) {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] || null;
  }

  async findByEmail(email: string) {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] || null;
  }

  async create(data: any) {
    const result = await db.insert(users).values(data).returning();
    return result[0];
  }

  async update(id: string, data: any) {
    const result = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return result[0];
  }

  async delete(id: string) {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result[0];
  }
}