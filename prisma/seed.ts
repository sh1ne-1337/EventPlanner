import "dotenv/config";

import { hash } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { addDays, format, setHours, setMinutes, startOfDay } from "date-fns";

import { PrismaClient, type Importance } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

export const DEMO_USER = {
  email: "demo@example.com",
  password: "Demo12345",
  name: "Demo User",
};

type SeedEvent = {
  title: string;
  description?: string;
  day: number;
  at?: [number, number];
  durationMin?: number;
  days?: number;
  importance: Importance;
};

const EVENTS: SeedEvent[] = [
  {
    title: "Daily stand-up",
    description: "Sync with the team: blockers and plans.",
    day: 0,
    at: [10, 0],
    durationMin: 15,
    importance: "NORMAL",
  },
  {
    title: "Code review session",
    description: "Review the auth refactor PR.",
    day: 0,
    at: [15, 0],
    durationMin: 60,
    importance: "IMPORTANT",
  },
  {
    title: "Release v2.0 to production",
    description: "Deploy window, rollback plan ready.",
    day: 1,
    at: [18, 0],
    durationMin: 90,
    importance: "CRITICAL",
  },
  {
    title: "Зустріч з командою",
    description: "Обговорення планів на наступний спринт.",
    day: 2,
    at: [11, 0],
    durationMin: 60,
    importance: "IMPORTANT",
  },
  { title: "Gym", day: 2, at: [19, 30], durationMin: 60, importance: "NORMAL" },
  {
    title: "Dentist appointment",
    description: "Clinic on Khreshchatyk, bring the insurance card.",
    day: 3,
    at: [9, 30],
    durationMin: 45,
    importance: "IMPORTANT",
  },
  {
    title: "Conference: JS Fest",
    description: "Two days of talks about JavaScript and Node.js.",
    day: 5,
    days: 2,
    importance: "IMPORTANT",
  },
  {
    title: "День народження мами",
    description: "Купити квіти та торт!",
    day: 6,
    importance: "CRITICAL",
  },
  {
    title: "Sprint planning",
    description: "Estimate backlog items for the next sprint.",
    day: 7,
    at: [10, 0],
    durationMin: 120,
    importance: "IMPORTANT",
  },
  { title: "Pay utility bills", day: 8, importance: "CRITICAL" },
  {
    title: "1:1 with manager",
    description: "Career growth and feedback.",
    day: 9,
    at: [14, 0],
    durationMin: 30,
    importance: "NORMAL",
  },
  { title: "Йога", day: 10, at: [8, 0], durationMin: 60, importance: "NORMAL" },
  {
    title: "Vacation in the Carpathians",
    description: "Hiking trip, no laptop.",
    day: 14,
    days: 5,
    importance: "NORMAL",
  },
  {
    title: "Tax declaration deadline",
    description: "Submit the quarterly declaration.",
    day: 20,
    importance: "CRITICAL",
  },
  {
    title: "Book club",
    description: 'Discussing "Designing Data-Intensive Applications".',
    day: 12,
    at: [19, 0],
    durationMin: 90,
    importance: "NORMAL",
  },
  {
    title: "Retrospective",
    description: "What went well, what to improve.",
    day: -2,
    at: [16, 0],
    durationMin: 60,
    importance: "NORMAL",
  },
  {
    title: "Interview: frontend candidate",
    description: "Technical interview, React + TypeScript.",
    day: -3,
    at: [12, 0],
    durationMin: 60,
    importance: "IMPORTANT",
  },
  {
    title: "Production incident post-mortem",
    description: "Root cause analysis of the outage.",
    day: -5,
    at: [11, 0],
    durationMin: 60,
    importance: "CRITICAL",
  },
  {
    title: "Лікар",
    description: "Плановий огляд.",
    day: -8,
    at: [9, 0],
    durationMin: 30,
    importance: "IMPORTANT",
  },
  { title: "Team dinner", day: -10, at: [19, 0], durationMin: 120, importance: "NORMAL" },
];

function toEventData(e: SeedEvent, userId: string, today: Date) {
  const day = addDays(today, e.day);
  if (!e.at) {
    const startsAt = new Date(`${format(day, "yyyy-MM-dd")}T00:00:00.000Z`);
    return {
      userId,
      title: e.title,
      description: e.description ?? null,
      importance: e.importance,
      allDay: true,
      startsAt,
      endsAt: new Date(startsAt.getTime() + (e.days ?? 1) * 24 * 60 * 60 * 1000),
    };
  }
  const startsAt = setMinutes(setHours(day, e.at[0]), e.at[1]);
  return {
    userId,
    title: e.title,
    description: e.description ?? null,
    importance: e.importance,
    allDay: false,
    startsAt,
    endsAt: new Date(startsAt.getTime() + (e.durationMin ?? 60) * 60_000),
  };
}

async function main() {
  const passwordHash = await hash(DEMO_USER.password, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const user = await prisma.user.upsert({
    where: { email: DEMO_USER.email },
    update: { passwordHash, name: DEMO_USER.name },
    create: { email: DEMO_USER.email, name: DEMO_USER.name, passwordHash },
  });

  await prisma.event.deleteMany({ where: { userId: user.id } });
  const today = startOfDay(new Date());
  await prisma.event.createMany({
    data: EVENTS.map((e) => toEventData(e, user.id, today)),
  });

  console.log(
    `Seeded ${EVENTS.length} events for ${DEMO_USER.email} (password: ${DEMO_USER.password})`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
