import { prisma } from '../src/config/db.js';
import { ActivityCategory } from '../generated/prisma/enums.js';

async function main() {
  console.log('🌱 Starting database seed with global and Indian destinations...');

  const citiesData = [
    // --- INDIAN DESTINATIONS ---
    {
      name: 'Mumbai',
      country: 'India',
      region: 'South Asia',
      costIndex: 42.0,
      popularity: 97,
      imageUrl: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1200&q=80',
      activities: [
        {
          name: 'Gateway of India & Marine Drive Sunset',
          description: 'Marvel at the historic arch monument overlooking the Arabian Sea and stroll along the Queen’s Necklace.',
          category: ActivityCategory.SIGHTSEEING,
          cost: 0.0,
          durationMin: 90,
          imageUrl: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Elephanta Caves UNESCO Ferry Excursion',
          description: 'Ferry ride from Mumbai harbor to the ancient rock-cut cave temples dedicated to Lord Shiva.',
          category: ActivityCategory.CULTURE,
          cost: 12.0,
          durationMin: 240,
          imageUrl: 'https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Chowpatty & Mohammed Ali Road Food Trail',
          description: 'Savor Mumbai street classics including pav bhaji, pani puri, kebabs, and mawa kulfi.',
          category: ActivityCategory.FOOD,
          cost: 15.0,
          durationMin: 120,
          imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Bandra Heritage & Bollywood Art Walk',
          description: 'Explore trendy Bandra alleys, street art murals, Bandstand promenade, and lively cafes.',
          category: ActivityCategory.NIGHTLIFE,
          cost: 10.0,
          durationMin: 120,
          imageUrl: 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=800&q=80',
        },
      ],
    },
    {
      name: 'Jaipur',
      country: 'India',
      region: 'South Asia',
      costIndex: 35.0,
      popularity: 95,
      imageUrl: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80',
      activities: [
        {
          name: 'Amer Fort Royal Heritage Walk',
          description: 'Explore grand courtyards, Sheesh Mahal (mirror palace), and panoramic Aravalli mountain views.',
          category: ActivityCategory.CULTURE,
          cost: 15.0,
          durationMin: 180,
          imageUrl: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Hawa Mahal & Old Pink City Bazaars',
          description: 'Photograph the Palace of Winds and shop for handcrafted textiles, gemstones, and jootis.',
          category: ActivityCategory.SHOPPING,
          cost: 8.0,
          durationMin: 120,
          imageUrl: 'https://images.unsplash.com/photo-1609137144813-7d9921338f24?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Chokhi Dhani Rajasthani Cultural Dinner',
          description: 'Experience folk dancing, puppet shows, camel rides, and an authentic dal baati churma royal feast.',
          category: ActivityCategory.FOOD,
          cost: 22.0,
          durationMin: 210,
          imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Nahargarh Fort Sunset Viewpoint',
          description: 'Watch the entire Pink City glow golden from atop Nahargarh Fort ramparts at twilight.',
          category: ActivityCategory.RELAXATION,
          cost: 5.0,
          durationMin: 90,
          imageUrl: 'https://images.unsplash.com/photo-1622396481304-4ad90209930f?auto=format&fit=crop&w=800&q=80',
        },
      ],
    },
    {
      name: 'Goa',
      country: 'India',
      region: 'South Asia',
      costIndex: 38.0,
      popularity: 96,
      imageUrl: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
      activities: [
        {
          name: 'Calangute & Baga Watersports Combo',
          description: 'Experience adrenaline-pumping parasailing, jet skiing, bumper rides, and banana boat tours.',
          category: ActivityCategory.ADVENTURE,
          cost: 30.0,
          durationMin: 150,
          imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Old Goa Portuguese Churches & Fontainhas',
          description: 'Walk through the Basilica of Bom Jesus and Latin Quarter pastel-colored historic villas.',
          category: ActivityCategory.CULTURE,
          cost: 10.0,
          durationMin: 150,
          imageUrl: 'https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Dudhsagar Waterfalls & Spice Plantation Safari',
          description: 'Jeep safari to the majestic 4-tiered cascading waterfall followed by a Goan spice lunch.',
          category: ActivityCategory.ADVENTURE,
          cost: 35.0,
          durationMin: 360,
          imageUrl: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Anjuna Sunset Beach Party & Shack Dining',
          description: 'Enjoy fresh seafood, feni cocktails, acoustic music, and vibrant beach shack nightlife.',
          category: ActivityCategory.NIGHTLIFE,
          cost: 20.0,
          durationMin: 180,
          imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
        },
      ],
    },
    {
      name: 'New Delhi',
      country: 'India',
      region: 'South Asia',
      costIndex: 39.0,
      popularity: 94,
      imageUrl: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1200&q=80',
      activities: [
        {
          name: 'Old Delhi Chandni Chowk & Jama Masjid Rickshaw Safari',
          description: 'Cycle rickshaw through spice markets of Khari Baoli, paranthe wali gali, and grand mosque.',
          category: ActivityCategory.FOOD,
          cost: 18.0,
          durationMin: 180,
          imageUrl: 'https://images.unsplash.com/photo-1597044141243-7f329983794a?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Qutub Minar & Humayun Tomb Architecture Tour',
          description: 'Marvel at Persian-Mughal architectural masterworks and the world’s tallest brick minaret.',
          category: ActivityCategory.CULTURE,
          cost: 12.0,
          durationMin: 150,
          imageUrl: 'https://images.unsplash.com/photo-1585136917141-8b7a6e133591?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'India Gate & Kartavya Path Evening Stroll',
          description: 'Walk down India’s ceremonial boulevard and pay homage at the National War Memorial.',
          category: ActivityCategory.SIGHTSEEING,
          cost: 0.0,
          durationMin: 60,
          imageUrl: 'https://images.unsplash.com/photo-1592635196078-9fdc757f27f4?auto=format&fit=crop&w=800&q=80',
        },
      ],
    },
    {
      name: 'Varanasi',
      country: 'India',
      region: 'South Asia',
      costIndex: 28.0,
      popularity: 92,
      imageUrl: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1200&q=80',
      activities: [
        {
          name: 'Sunrise Ganges Wooden Boat Ride',
          description: 'Glide along historic ghats in morning mist watching ancient spiritual rituals along the holy river.',
          category: ActivityCategory.RELAXATION,
          cost: 10.0,
          durationMin: 90,
          imageUrl: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Grand Evening Ganga Aarti at Dashashwamedh Ghat',
          description: 'Experience synchronized brass lamp fire rituals, chanting, and floating flower diyas.',
          category: ActivityCategory.CULTURE,
          cost: 0.0,
          durationMin: 75,
          imageUrl: 'https://images.unsplash.com/photo-1571536802807-30451e3955d8?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Sarnath Buddhist Enlightenment Tour',
          description: 'Visit the Deer Park and Dhamek Stupa where Lord Buddha delivered his first sermon.',
          category: ActivityCategory.CULTURE,
          cost: 8.0,
          durationMin: 150,
          imageUrl: 'https://images.unsplash.com/photo-1627894483216-2138af692e32?auto=format&fit=crop&w=800&q=80',
        },
      ],
    },
    {
      name: 'Udaipur',
      country: 'India',
      region: 'South Asia',
      costIndex: 36.0,
      popularity: 93,
      imageUrl: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80',
      activities: [
        {
          name: 'Lake Pichola Boat Cruise & Jag Mandir Island',
          description: 'Sail past fairytale white marble palaces floating on serene lake waters.',
          category: ActivityCategory.RELAXATION,
          cost: 14.0,
          durationMin: 90,
          imageUrl: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'City Palace Complex & Museum Tour',
          description: 'Explore Rajasthan’s largest palace complex showcasing regal armory, courtyards, and paintings.',
          category: ActivityCategory.CULTURE,
          cost: 12.0,
          durationMin: 150,
          imageUrl: 'https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Bagore Ki Haveli Dharohar Folk Dance & Puppet Show',
          description: 'Evening cultural showcase on the lakefront featuring traditional Chari and Bhavai dance.',
          category: ActivityCategory.CULTURE,
          cost: 6.0,
          durationMin: 75,
          imageUrl: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80',
        },
      ],
    },
    {
      name: 'Agra',
      country: 'India',
      region: 'South Asia',
      costIndex: 32.0,
      popularity: 96,
      imageUrl: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1200&q=80',
      activities: [
        {
          name: 'Taj Mahal Sunrise Guided Experience',
          description: 'Witness the iconic ivory-white marble mausoleum bathed in the soft glow of dawn.',
          category: ActivityCategory.SIGHTSEEING,
          cost: 20.0,
          durationMin: 180,
          imageUrl: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Agra Fort Red Sandstone Citadel Tour',
          description: 'Explore the imperial Mughal walled palace city and Emperor Shah Jahan’s prison tower.',
          category: ActivityCategory.CULTURE,
          cost: 10.0,
          durationMin: 120,
          imageUrl: 'https://images.unsplash.com/photo-1585136917141-8b7a6e133591?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Mehtab Bagh Sunset Taj Viewpoint',
          description: 'Admire the reflection of the Taj Mahal across the Yamuna River from the moonlit garden.',
          category: ActivityCategory.RELAXATION,
          cost: 5.0,
          durationMin: 75,
          imageUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80',
        },
      ],
    },
    {
      name: 'Kochi (Cochin)',
      country: 'India',
      region: 'South Asia',
      costIndex: 34.0,
      popularity: 88,
      imageUrl: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80',
      activities: [
        {
          name: 'Alleppey Backwaters Houseboat Day Cruise',
          description: 'Cruise through palm-fringed canals, paddy fields, and tranquil lagoons with authentic Kerala meal.',
          category: ActivityCategory.RELAXATION,
          cost: 45.0,
          durationMin: 300,
          imageUrl: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Fort Kochi Chinese Fishing Nets & Jew Town',
          description: 'Discover centuries-old cantilevered fishing nets, spice warehouses, and antique art galleries.',
          category: ActivityCategory.SIGHTSEEING,
          cost: 8.0,
          durationMin: 150,
          imageUrl: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Kathakali Drama & Kalaripayattu Martial Arts Show',
          description: 'Watch elaborate facial makeup application, classical storytelling, and ancient martial arts.',
          category: ActivityCategory.CULTURE,
          cost: 12.0,
          durationMin: 120,
          imageUrl: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
        },
      ],
    },
    {
      name: 'Bengaluru',
      country: 'India',
      region: 'South Asia',
      costIndex: 40.0,
      popularity: 89,
      imageUrl: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80',
      activities: [
        {
          name: 'Lalbagh Botanical Garden & Glass House',
          description: 'Stroll through 240 acres of rare tropical flora, lotus pools, and century-old trees.',
          category: ActivityCategory.RELAXATION,
          cost: 4.0,
          durationMin: 120,
          imageUrl: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Indiranagar Craft Brewery & Pub Crawl',
          description: 'Sample world-class artisan craft beers, IPAs, and fusion food in India’s pub capital.',
          category: ActivityCategory.NIGHTLIFE,
          cost: 25.0,
          durationMin: 180,
          imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'South Indian Filter Coffee & Dosa Trail',
          description: 'Taste legendary crispy butter masala dosas and frothy filter kaapi at iconic heritage joints.',
          category: ActivityCategory.FOOD,
          cost: 10.0,
          durationMin: 90,
          imageUrl: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=800&q=80',
        },
      ],
    },
    {
      name: 'Manali',
      country: 'India',
      region: 'South Asia',
      costIndex: 30.0,
      popularity: 91,
      imageUrl: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80',
      activities: [
        {
          name: 'Solang Valley Paragliding & Adventure Park',
          description: 'Soar like an eagle with tandem paragliding over pine-covered Himalayan slopes and snow peaks.',
          category: ActivityCategory.ADVENTURE,
          cost: 40.0,
          durationMin: 150,
          imageUrl: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Old Manali Apple Orchards & Cafe Trail',
          description: 'Relax in bohemian mountain cafes, taste trout fish, and hike to the ancient Hadimba Temple.',
          category: ActivityCategory.RELAXATION,
          cost: 12.0,
          durationMin: 150,
          imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Beas River White Water Rafting',
          description: 'Tackle Grade II and III rapids through the scenic Kullu valley.',
          category: ActivityCategory.ADVENTURE,
          cost: 25.0,
          durationMin: 120,
          imageUrl: 'https://images.unsplash.com/photo-1530866495561-507c9faab2ed?auto=format&fit=crop&w=800&q=80',
        },
      ],
    },

    // --- INTERNATIONAL DESTINATIONS ---
    {
      name: 'Paris',
      country: 'France',
      region: 'Europe',
      costIndex: 85.5,
      popularity: 98,
      imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
      activities: [
        {
          name: 'Eiffel Tower Summit Tour',
          description: 'Experience panoramic views of Paris from the summit of the iconic Eiffel Tower.',
          category: ActivityCategory.SIGHTSEEING,
          cost: 35.0,
          durationMin: 120,
          imageUrl: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Louvre Museum Guided Tour',
          description: 'Marvel at masterworks like the Mona Lisa and Venus de Milo in the world’s largest art museum.',
          category: ActivityCategory.CULTURE,
          cost: 45.0,
          durationMin: 180,
          imageUrl: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Seine River Sunset Cruise & Wine',
          description: 'Cruise along the Seine River seeing Notre-Dame and historic bridges while tasting French wine.',
          category: ActivityCategory.RELAXATION,
          cost: 28.0,
          durationMin: 75,
          imageUrl: 'https://images.unsplash.com/photo-1471623432079-b009d30b6729?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Montmartre Food & Bakery Walk',
          description: 'Taste authentic croissants, artisanal cheeses, and pastries in charming Montmartre.',
          category: ActivityCategory.FOOD,
          cost: 50.0,
          durationMin: 150,
          imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
        },
      ],
    },
    {
      name: 'Tokyo',
      country: 'Japan',
      region: 'East Asia',
      costIndex: 78.2,
      popularity: 96,
      imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80',
      activities: [
        {
          name: 'Shibuya Crossing & Hachiko Statue',
          description: 'Walk the bustling Shibuya scramble crossing and visit the famous Hachiko memorial.',
          category: ActivityCategory.SIGHTSEEING,
          cost: 0.0,
          durationMin: 60,
          imageUrl: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Tsukiji Outer Market Street Food Tour',
          description: 'Sample fresh sashimi, tamagoyaki, wagyu skewers, and matcha sweets.',
          category: ActivityCategory.FOOD,
          cost: 40.0,
          durationMin: 120,
          imageUrl: 'https://images.unsplash.com/photo-1554502078-ef0fc409efce?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Senso-ji Temple & Asakusa Walking',
          description: 'Explore Tokyo’s oldest Buddhist temple and traditional Nakamise shopping street.',
          category: ActivityCategory.CULTURE,
          cost: 10.0,
          durationMin: 90,
          imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Akihabara Tech & Arcade Gaming',
          description: 'Immerse in Japan’s anime, retro gaming, and electronic wonderland.',
          category: ActivityCategory.NIGHTLIFE,
          cost: 25.0,
          durationMin: 150,
          imageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80',
        },
      ],
    },
    {
      name: 'New York City',
      country: 'United States',
      region: 'North America',
      costIndex: 92.0,
      popularity: 95,
      imageUrl: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1200&q=80',
      activities: [
        {
          name: 'Central Park Bike Tour',
          description: 'Pedal through scenic trails, Strawberry Fields, Bethesda Terrace, and the reservoir.',
          category: ActivityCategory.ADVENTURE,
          cost: 30.0,
          durationMin: 120,
          imageUrl: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Broadway Musical Evening',
          description: 'Watch award-winning theatrical performances in the heart of Times Square.',
          category: ActivityCategory.CULTURE,
          cost: 110.0,
          durationMin: 180,
          imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Statue of Liberty & Ellis Island Ferry',
          description: 'Take the ferry to Liberty Island and explore the historic immigration museum.',
          category: ActivityCategory.SIGHTSEEING,
          cost: 25.0,
          durationMin: 180,
          imageUrl: 'https://images.unsplash.com/photo-1605130284535-11dd9eedc58a?auto=format&fit=crop&w=800&q=80',
        },
      ],
    },
    {
      name: 'Rome',
      country: 'Italy',
      region: 'Europe',
      costIndex: 72.0,
      popularity: 94,
      imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80',
      activities: [
        {
          name: 'Colosseum & Roman Forum Tour',
          description: 'Step into ancient history and walk where gladiators once fought.',
          category: ActivityCategory.CULTURE,
          cost: 38.0,
          durationMin: 150,
          imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Vatican Museums & Sistine Chapel',
          description: 'Admire Michelangelo’s iconic ceiling frescoes and historic papal galleries.',
          category: ActivityCategory.SIGHTSEEING,
          cost: 42.0,
          durationMin: 180,
          imageUrl: 'https://images.unsplash.com/photo-1531572753322-ad063cecc140?auto=format&fit=crop&w=800&q=80',
        },
      ],
    },
    {
      name: 'Bali',
      country: 'Indonesia',
      region: 'Southeast Asia',
      costIndex: 45.0,
      popularity: 91,
      imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80',
      activities: [
        {
          name: 'Ubud Sacred Monkey Forest & Rice Terraces',
          description: 'Wander through lush jungle sanctuary and iconic emerald Tegalalang rice terraces.',
          category: ActivityCategory.ADVENTURE,
          cost: 15.0,
          durationMin: 180,
          imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Uluwatu Cliff Sunset & Kecak Fire Dance',
          description: 'Watch traditional Balinese Kecak dance against the backdrop of ocean waves at dusk.',
          category: ActivityCategory.CULTURE,
          cost: 20.0,
          durationMin: 120,
          imageUrl: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=800&q=80',
        },
      ],
    },
    {
      name: 'Dubai',
      country: 'United Arab Emirates',
      region: 'Middle East',
      costIndex: 82.0,
      popularity: 89,
      imageUrl: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80',
      activities: [
        {
          name: 'Burj Khalifa Observation Deck',
          description: 'Look over the desert skyline from the highest building in the world.',
          category: ActivityCategory.SIGHTSEEING,
          cost: 50.0,
          durationMin: 90,
          imageUrl: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80',
        },
        {
          name: 'Desert Safari with Dune Bashing & BBQ',
          description: 'Thrill-filled 4x4 dune bashing, camel riding, and traditional dinner under the stars.',
          category: ActivityCategory.ADVENTURE,
          cost: 65.0,
          durationMin: 360,
          imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
        },
      ],
    },
  ];

  for (const cityItem of citiesData) {
    const { activities, ...cityData } = cityItem;

    const city = await prisma.city.upsert({
      where: {
        name_country: {
          name: cityData.name,
          country: cityData.country,
        },
      },
      update: cityData,
      create: cityData,
    });

    console.log(`📍 City ready: ${city.name}, ${city.country} (${city.region})`);

    for (const act of activities) {
      const existingAct = await prisma.activity.findFirst({
        where: {
          cityId: city.id,
          name: act.name,
        },
      });

      if (!existingAct) {
        await prisma.activity.create({
          data: {
            ...act,
            cityId: city.id,
          },
        });
      }
    }
  }

  console.log('✅ Seed completed successfully with all destinations!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
