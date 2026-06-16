import { db } from '../config/db';
import { parameters } from '../db/schema';
import { eq } from 'drizzle-orm';

export class ParameterRepository {
  async findAll() {
    return await db.select().from(parameters);
  }

  async create(data: any) {
    const res = await db.insert(parameters).values(data).returning();
    return res[0];
  }

  async update(id: string, data: any) {
    const res = await db.update(parameters).set(data).where(eq(parameters.id, id)).returning();
    return res[0];
  }

  async delete(id: string) {
    const res = await db.delete(parameters).where(eq(parameters.id, id)).returning();
    return res[0];
  }
}