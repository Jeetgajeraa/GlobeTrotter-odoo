import { Role, ActivityCategory, ExpenseCategory } from '../generated/prisma/client';
import { prisma } from '../src/config/db.js';


async function main() {
  console.log('Clearing existing data...');
  // Delete in reverse dependency order
  await prisma.communityPost.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.stopActivity.deleteMany();
  await prisma.stop.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.savedDestination.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.city.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding 5+ rows per table...');

  // 1. Create 5 Users
  const [alice, bob, charlie, diana, ethan] = await Promise.all([
    prisma.user.create({ data: { firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', passwordHash: 'hash', role: Role.USER } }),
    prisma.user.create({ data: { firstName: 'Bob', lastName: 'Jones', email: 'bob@example.com', passwordHash: 'hash', role: Role.USER } }),
    prisma.user.create({ data: { firstName: 'Charlie', lastName: 'Brown', email: 'charlie@example.com', passwordHash: 'hash', role: Role.ADMIN } }),
    prisma.user.create({ data: { firstName: 'Diana', lastName: 'Prince', email: 'diana@example.com', passwordHash: 'hash', role: Role.USER } }),
    prisma.user.create({ data: { firstName: 'Ethan', lastName: 'Hunt', email: 'ethan@example.com', passwordHash: 'hash', role: Role.USER } }),
  ]);

  // 2. Create 5 Cities
  const [tokyo, paris, newYork, rome, sydney] = await Promise.all([
    prisma.city.create({ data: { name: 'Tokyo', country: 'Japan', costIndex: 120.5, popularity: 95 } }),
    prisma.city.create({ data: { name: 'Paris', country: 'France', costIndex: 130.0, popularity: 98 } }),
    prisma.city.create({ data: { name: 'New York', country: 'USA', costIndex: 150.0, popularity: 99 } }),
    prisma.city.create({ data: { name: 'Rome', country: 'Italy', costIndex: 110.0, popularity: 90 } }),
    prisma.city.create({ data: { name: 'Sydney', country: 'Australia', costIndex: 140.0, popularity: 85 } }),
  ]);

  // 3. Create 5 Activities (Linked to Cities)
  const [sushi, eiffel, broadway, colosseum, surfing] = await Promise.all([
    prisma.activity.create({ data: { cityId: tokyo.id, name: 'Sushi Making', category: ActivityCategory.FOOD, cost: 50, durationMin: 120 } }),
    prisma.activity.create({ data: { cityId: paris.id, name: 'Eiffel Tower Tour', category: ActivityCategory.SIGHTSEEING, cost: 30, durationMin: 180 } }),
    prisma.activity.create({ data: { cityId: newYork.id, name: 'Broadway Show', category: ActivityCategory.CULTURE, cost: 120, durationMin: 150 } }),
    prisma.activity.create({ data: { cityId: rome.id, name: 'Colosseum Entry', category: ActivityCategory.SIGHTSEEING, cost: 25, durationMin: 90 } }),
    prisma.activity.create({ data: { cityId: sydney.id, name: 'Bondi Surf Lesson', category: ActivityCategory.ADVENTURE, cost: 65, durationMin: 120 } }),
  ]);

  // 4. Create 5 Saved Destinations
  await Promise.all([
    prisma.savedDestination.create({ data: { userId: alice.id, cityId: tokyo.id } }),
    prisma.savedDestination.create({ data: { userId: bob.id, cityId: paris.id } }),
    prisma.savedDestination.create({ data: { userId: charlie.id, cityId: newYork.id } }),
    prisma.savedDestination.create({ data: { userId: diana.id, cityId: rome.id } }),
    prisma.savedDestination.create({ data: { userId: ethan.id, cityId: sydney.id } }),
  ]);

  // 5. Create 5 Trips
  const [trip1, trip2, trip3, trip4, trip5] = await Promise.all([
    prisma.trip.create({ data: { userId: alice.id, name: 'Japan 2026', startDate: new Date('2026-10-01'), endDate: new Date('2026-10-15'), isPublic: true, shareSlug: 'alice-japan' } }),
    prisma.trip.create({ data: { userId: bob.id, name: 'Romantic Paris', startDate: new Date('2026-11-01'), endDate: new Date('2026-11-07') } }),
    prisma.trip.create({ data: { userId: charlie.id, name: 'NY Business', startDate: new Date('2026-12-01'), endDate: new Date('2026-12-05') } }),
    prisma.trip.create({ data: { userId: diana.id, name: 'Rome Getaway', startDate: new Date('2026-09-10'), endDate: new Date('2026-09-20') } }),
    prisma.trip.create({ data: { userId: ethan.id, name: 'Aussie Adventure', startDate: new Date('2026-12-20'), endDate: new Date('2027-01-10') } }),
  ]);

  // 6. Create 5 Stops (Linked to Trips and Cities)
  const [stop1, stop2, stop3, stop4, stop5] = await Promise.all([
    prisma.stop.create({ data: { tripId: trip1.id, cityId: tokyo.id, startDate: new Date('2026-10-01'), endDate: new Date('2026-10-07'), order: 1 } }),
    prisma.stop.create({ data: { tripId: trip2.id, cityId: paris.id, startDate: new Date('2026-11-01'), endDate: new Date('2026-11-07'), order: 1 } }),
    prisma.stop.create({ data: { tripId: trip3.id, cityId: newYork.id, startDate: new Date('2026-12-01'), endDate: new Date('2026-12-05'), order: 1 } }),
    prisma.stop.create({ data: { tripId: trip4.id, cityId: rome.id, startDate: new Date('2026-09-10'), endDate: new Date('2026-09-20'), order: 1 } }),
    prisma.stop.create({ data: { tripId: trip5.id, cityId: sydney.id, startDate: new Date('2026-12-20'), endDate: new Date('2027-01-10'), order: 1 } }),
  ]);

  // 7. Create 5 Stop Activities (Scheduling Activities into Stops)
  await Promise.all([
    prisma.stopActivity.create({ data: { stopId: stop1.id, activityId: sushi.id, scheduledDate: new Date('2026-10-02'), startTime: '12:00', order: 1 } }),
    prisma.stopActivity.create({ data: { stopId: stop2.id, activityId: eiffel.id, scheduledDate: new Date('2026-11-02'), startTime: '10:00', order: 1 } }),
    prisma.stopActivity.create({ data: { stopId: stop3.id, activityId: broadway.id, scheduledDate: new Date('2026-12-02'), startTime: '19:00', order: 1 } }),
    prisma.stopActivity.create({ data: { stopId: stop4.id, activityId: colosseum.id, scheduledDate: new Date('2026-09-11'), startTime: '09:00', order: 1 } }),
    prisma.stopActivity.create({ data: { stopId: stop5.id, activityId: surfing.id, scheduledDate: new Date('2026-12-21'), startTime: '08:00', order: 1 } }),
  ]);

  // 8. Create 5 Expenses
  await Promise.all([
    prisma.expense.create({ data: { tripId: trip1.id, stopId: stop1.id, category: ExpenseCategory.MEALS, amount: 50, date: new Date('2026-10-02') } }),
    prisma.expense.create({ data: { tripId: trip2.id, stopId: stop2.id, category: ExpenseCategory.STAY, amount: 200, date: new Date('2026-11-01') } }),
    prisma.expense.create({ data: { tripId: trip3.id, stopId: stop3.id, category: ExpenseCategory.TRANSPORT, amount: 45, date: new Date('2026-12-01') } }),
    prisma.expense.create({ data: { tripId: trip4.id, stopId: stop4.id, category: ExpenseCategory.ACTIVITY, amount: 25, date: new Date('2026-09-11') } }),
    prisma.expense.create({ data: { tripId: trip5.id, stopId: stop5.id, category: ExpenseCategory.OTHER, amount: 15, date: new Date('2026-12-21') } }),
  ]);

  // 9. Create 5 Community Posts
  await Promise.all([
    prisma.communityPost.create({ data: { userId: alice.id, tripId: trip1.id, title: 'Tokyo is amazing!', content: 'The sushi here is unreal.', likeCount: 12 } }),
    prisma.communityPost.create({ data: { userId: bob.id, tripId: trip2.id, title: 'Paris Tips?', content: 'Anyone know a good cafe near the Eiffel Tower?', likeCount: 3 } }),
    prisma.communityPost.create({ data: { userId: charlie.id, tripId: trip3.id, title: 'NY Transit', content: 'The subway is confusing but efficient.', likeCount: 8 } }),
    prisma.communityPost.create({ data: { userId: diana.id, tripId: trip4.id, title: 'When in Rome', content: 'Just saw the Colosseum!', likeCount: 20 } }),
    prisma.communityPost.create({ data: { userId: ethan.id, tripId: trip5.id, title: 'Surfs up', content: 'Bondi beach is beautiful this time of year.', likeCount: 15 } }),
  ]);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });