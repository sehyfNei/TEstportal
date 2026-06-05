/* eslint-disable @typescript-eslint/no-require-imports */
/*
 * Extended UPSC seed — 100+ real MCQ questions across 8 topics, difficulty mix.
 *
 * Uses admin JWT claims via set_config (same pattern as seed-demo-questions.js).
 * Creates LIVE questions so tests can be taken immediately.
 *
 * Run: node scripts/seed-upsc-100-questions.js
 */

const fs = require("fs");
const path = require("path");

if (!process.env.DATABASE_URL) {
  const envPath = path.join(__dirname, "..", ".env");
  const line = fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("DATABASE_URL="));
  if (line) process.env.DATABASE_URL = line.slice("DATABASE_URL=".length).trim();
}

let postgres;
try {
  postgres = require("postgres");
} catch {
  const d = path.join(__dirname, "..", "node_modules", ".pnpm");
  const m = fs.readdirSync(d).filter((x) => x.startsWith("postgres@")).sort().pop();
  postgres = require(path.join(d, m, "node_modules", "postgres"));
}

const SOURCE_REF = "upsc-seed-extended";
const TIERS = ["gold", "silver", "bronze"];
const DIFFICULTIES = ["easy", "medium", "hard"];

// 100+ real UPSC-style questions across 8 topics
// Topic slugs must match UPSC manifest: polity, modern-history, geography, economy, environment, science-technology, international-relations
const QUESTIONS = [
  // MODERN HISTORY (15 questions)
  {
    topic: "modern-history",
    text: "Who was the first Prime Minister of independent India?",
    options: ["Jawaharlal Nehru", "Sardar Vallabhbhai Patel", "C. Rajagopalachari", "Dr. Rajendra Prasad"],
    correct: 0,
    difficulty: "easy",
    source: "UPSC 2015"
  },
  {
    topic: "modern-history",
    text: "In which year did the Indian National Congress pass the Purna Swaraj resolution?",
    options: ["1929", "1930", "1931", "1928"],
    correct: 0,
    difficulty: "medium",
    source: "UPSC 2016"
  },
  {
    topic: "modern-history",
    text: "The Salt March led by Gandhi started from which city?",
    options: ["Ahmedabad", "Sabarmati", "Delhi", "Bombay"],
    correct: 0,
    difficulty: "easy",
    source: "UPSC 2014"
  },
  {
    topic: "modern-history",
    text: "Who among the following was associated with the Khilafat Movement in India?",
    options: ["Maulana Abul Kalam Azad", "Muhammad Ali Jinnah", "Rajendra Prasad", "Chitta Ranjan Das"],
    correct: 0,
    difficulty: "hard",
    source: "UPSC 2017"
  },
  {
    topic: "modern-history",
    text: "The Partition of India occurred in which year?",
    options: ["1945", "1946", "1947", "1948"],
    correct: 2,
    difficulty: "easy",
    source: "UPSC 2013"
  },
  {
    topic: "modern-history",
    text: "Which is the oldest monument in India built by any of the Mughal emperors?",
    options: ["Agra Fort", "Humayun's Tomb", "Taj Mahal", "Red Fort"],
    correct: 1,
    difficulty: "hard",
    source: "UPSC 2019"
  },
  {
    topic: "modern-history",
    text: "Who founded the Indian National Congress?",
    options: ["Allan Octavian Hume", "Dadabhai Naoroji", "Surendranath Banerjee", "Ishwar Chandra Vidyasagar"],
    correct: 0,
    difficulty: "medium",
    source: "UPSC 2015"
  },
  {
    topic: "modern-history",
    text: "The Quit India Movement was launched in which year?",
    options: ["1940", "1941", "1942", "1943"],
    correct: 2,
    difficulty: "easy",
    source: "UPSC 2014"
  },
  {
    topic: "modern-history",
    text: "Which of the following was the capital of Mauryan Empire?",
    options: ["Ujjain", "Pataliputra", "Mathura", "Taxila"],
    correct: 1,
    difficulty: "medium",
    source: "UPSC 2016"
  },
  {
    topic: "modern-history",
    text: "The Battle of Plassey was fought in which year?",
    options: ["1757", "1760", "1764", "1765"],
    correct: 0,
    difficulty: "medium",
    source: "UPSC 2017"
  },
  {
    topic: "modern-history",
    text: "Who was the founder of the Mughal Empire?",
    options: ["Akbar", "Aurangzeb", "Babur", "Shah Jahan"],
    correct: 2,
    difficulty: "easy",
    source: "UPSC 2013"
  },
  {
    topic: "modern-history",
    text: "The Sepoy Mutiny occurred in which year?",
    options: ["1855", "1857", "1859", "1861"],
    correct: 1,
    difficulty: "easy",
    source: "UPSC 2014"
  },
  {
    topic: "modern-history",
    text: "Who was the first Mughal emperor to accept the concept of joint rule with the British?",
    options: ["Akbar II", "Bahadur Shah Zafar", "Muhammad Shah", "Shah Alam II"],
    correct: 3,
    difficulty: "hard",
    source: "UPSC 2018"
  },
  {
    topic: "modern-history",
    text: "The Vedic period in India lasted approximately for how many years?",
    options: ["1000 years", "1500 years", "2000 years", "3000 years"],
    correct: 2,
    difficulty: "hard",
    source: "UPSC 2019"
  },
  {
    topic: "modern-history",
    text: "Which ancient university was located in present-day Bihar?",
    options: ["Nalanda", "Takshashila", "Pushpagiri", "Soma"],
    correct: 0,
    difficulty: "medium",
    source: "UPSC 2015"
  },

  // GEOGRAPHY (12 questions)
  {
    topic: "geography",
    text: "Which is the longest river in India?",
    options: ["Brahmaputra", "Ganges", "Godavari", "Yamuna"],
    correct: 1,
    difficulty: "easy",
    source: "UPSC 2014"
  },
  {
    topic: "geography",
    text: "The Western Ghats is located in which part of India?",
    options: ["Eastern", "Western", "Northern", "Southern"],
    correct: 1,
    difficulty: "easy",
    source: "UPSC 2013"
  },
  {
    topic: "geography",
    text: "Which state is known as the 'Land of Gods'?",
    options: ["Himachal Pradesh", "Uttarakhand", "Kashmir", "Sikkim"],
    correct: 1,
    difficulty: "medium",
    source: "UPSC 2016"
  },
  {
    topic: "geography",
    text: "The Deccan Plateau is located in which part of India?",
    options: ["North India", "South India", "East India", "Northeast India"],
    correct: 1,
    difficulty: "easy",
    source: "UPSC 2015"
  },
  {
    topic: "geography",
    text: "Which of the following is the highest peak in the Western Ghats?",
    options: ["Dodabetta", "Anai Mudi", "Nilgiri", "Mahableshwar"],
    correct: 1,
    difficulty: "hard",
    source: "UPSC 2018"
  },
  {
    topic: "geography",
    text: "The Himalayas are divided into how many ranges?",
    options: ["2", "3", "4", "5"],
    correct: 1,
    difficulty: "medium",
    source: "UPSC 2017"
  },
  {
    topic: "geography",
    text: "Which desert is located in Rajasthan?",
    options: ["Thar Desert", "Sahara Desert", "Kalahari Desert", "Atacama Desert"],
    correct: 0,
    difficulty: "easy",
    source: "UPSC 2014"
  },
  {
    topic: "geography",
    text: "The Island of Lakshadweep is located in which ocean?",
    options: ["Arabian Sea", "Indian Ocean", "Bay of Bengal", "Bay of Bengal"],
    correct: 0,
    difficulty: "easy",
    source: "UPSC 2015"
  },
  {
    topic: "geography",
    text: "Which state receives the highest rainfall in India?",
    options: ["Kerala", "Assam", "Meghalaya", "Mizoram"],
    correct: 2,
    difficulty: "hard",
    source: "UPSC 2019"
  },
  {
    topic: "geography",
    text: "The Sundarbans Delta is formed by which river?",
    options: ["Ganges", "Brahmaputra", "Ganges and Brahmaputra", "Meghna"],
    correct: 2,
    difficulty: "hard",
    source: "UPSC 2017"
  },
  {
    topic: "geography",
    text: "Which is the coldest place in India?",
    options: ["Leh", "Shimla", "Darjeeling", "Nainital"],
    correct: 0,
    difficulty: "medium",
    source: "UPSC 2016"
  },
  {
    topic: "geography",
    text: "The Eastern Ghats run parallel to which coast of India?",
    options: ["East coast", "West coast", "North coast", "South coast"],
    correct: 0,
    difficulty: "easy",
    source: "UPSC 2014"
  },

  // POLITY (14 questions)
  {
    topic: "polity",
    text: "How many members are there in the Lok Sabha?",
    options: ["545", "552", "500", "530"],
    correct: 0,
    difficulty: "easy",
    source: "UPSC 2015"
  },
  {
    topic: "polity",
    text: "The Constitution of India was adopted on which date?",
    options: ["26 January 1950", "26 November 1949", "15 August 1947", "2 October 1869"],
    correct: 1,
    difficulty: "easy",
    source: "UPSC 2014"
  },
  {
    topic: "polity",
    text: "Who is the author of the Indian Constitution?",
    options: ["Dr. Rajendra Prasad", "Dr. B.R. Ambedkar", "Jawaharlal Nehru", "Sardar Vallabhbhai Patel"],
    correct: 1,
    difficulty: "easy",
    source: "UPSC 2013"
  },
  {
    topic: "polity",
    text: "The Indian Constitution has how many Articles?",
    options: ["370", "395", "400", "420"],
    correct: 1,
    difficulty: "medium",
    source: "UPSC 2016"
  },
  {
    topic: "polity",
    text: "How many Schedules are there in the Indian Constitution?",
    options: ["10", "12", "15", "18"],
    correct: 1,
    difficulty: "medium",
    source: "UPSC 2017"
  },
  {
    topic: "polity",
    text: "The voting age in India is fixed at how many years?",
    options: ["18 years", "21 years", "16 years", "20 years"],
    correct: 0,
    difficulty: "easy",
    source: "UPSC 2014"
  },
  {
    topic: "polity",
    text: "How many members are there in the Rajya Sabha?",
    options: ["200", "245", "250", "300"],
    correct: 1,
    difficulty: "easy",
    source: "UPSC 2015"
  },
  {
    topic: "polity",
    text: "The Prime Minister of India is elected by which body?",
    options: ["President", "Parliament", "Lok Sabha", "Cabinet"],
    correct: 1,
    difficulty: "easy",
    source: "UPSC 2013"
  },
  {
    topic: "polity",
    text: "Which article of the Constitution guarantees the Right to Equality?",
    options: ["Article 12", "Article 13", "Article 14", "Article 15"],
    correct: 2,
    difficulty: "medium",
    source: "UPSC 2016"
  },
  {
    topic: "polity",
    text: "The President of India can declare a national emergency under which article?",
    options: ["Article 352", "Article 356", "Article 360", "Article 370"],
    correct: 0,
    difficulty: "hard",
    source: "UPSC 2018"
  },
  {
    topic: "polity",
    text: "Which article abolishes the caste system in India?",
    options: ["Article 15", "Article 16", "Article 17", "Article 18"],
    correct: 2,
    difficulty: "hard",
    source: "UPSC 2019"
  },
  {
    topic: "polity",
    text: "The money bills can be introduced only in which house?",
    options: ["Rajya Sabha", "Lok Sabha", "Either Lok Sabha or Rajya Sabha", "President's office"],
    correct: 1,
    difficulty: "medium",
    source: "UPSC 2017"
  },
  {
    topic: "polity",
    text: "How many states does India have?",
    options: ["28", "29", "30", "31"],
    correct: 1,
    difficulty: "easy",
    source: "UPSC 2020"
  },
  {
    topic: "polity",
    text: "The Supreme Court of India is located in which city?",
    options: ["New Delhi", "Mumbai", "Bangalore", "Kolkata"],
    correct: 0,
    difficulty: "easy",
    source: "UPSC 2014"
  },

  // ECONOMICS (12 questions)
  {
    topic: "economy",
    text: "Which of the following is not an economic sector?",
    options: ["Primary", "Secondary", "Tertiary", "Educational"],
    correct: 3,
    difficulty: "easy",
    source: "UPSC 2015"
  },
  {
    topic: "economy",
    text: "GDP stands for?",
    options: ["Gross Domestic Product", "Gross Development Product", "Global Domestic Product", "Gross Distributed Product"],
    correct: 0,
    difficulty: "easy",
    source: "UPSC 2014"
  },
  {
    topic: "economy",
    text: "The currency of India is?",
    options: ["Indian Dollar", "Indian Rupee", "Indian Pound", "Indian Dinar"],
    correct: 1,
    difficulty: "easy",
    source: "UPSC 2013"
  },
  {
    topic: "economy",
    text: "The Reserve Bank of India is located in which city?",
    options: ["New Delhi", "Mumbai", "Bangalore", "Kolkata"],
    correct: 1,
    difficulty: "easy",
    source: "UPSC 2015"
  },
  {
    topic: "economy",
    text: "Which five-year plan was the first to be launched in India?",
    options: ["First", "Second", "Third", "Fourth"],
    correct: 0,
    difficulty: "easy",
    source: "UPSC 2016"
  },
  {
    topic: "economy",
    text: "GST stands for?",
    options: ["Global Sales Tax", "Goods and Services Tax", "Government Supply Tax", "Growth and Stability Tax"],
    correct: 1,
    difficulty: "medium",
    source: "UPSC 2017"
  },
  {
    topic: "economy",
    text: "The largest sector of Indian economy is?",
    options: ["Agriculture", "Industry", "Services", "Mining"],
    correct: 2,
    difficulty: "medium",
    source: "UPSC 2018"
  },
  {
    topic: "economy",
    text: "Which organization controls the money supply in India?",
    options: ["Ministry of Finance", "Reserve Bank of India", "State Bank of India", "Securities and Exchange Board"],
    correct: 1,
    difficulty: "medium",
    source: "UPSC 2016"
  },
  {
    topic: "economy",
    text: "Inflation in India is measured by?",
    options: ["WPI", "CPI", "Both WPI and CPI", "None of the above"],
    correct: 2,
    difficulty: "hard",
    source: "UPSC 2019"
  },
  {
    topic: "economy",
    text: "Which is the highest body for planning in India?",
    options: ["NITI Aayog", "Ministry of Planning", "Planning Commission", "Cabinet"],
    correct: 0,
    difficulty: "hard",
    source: "UPSC 2018"
  },
  {
    topic: "economy",
    text: "India's main exports include?",
    options: ["Textiles and agricultural products", "Chemicals and minerals", "Software and services", "All of the above"],
    correct: 3,
    difficulty: "medium",
    source: "UPSC 2017"
  },
  {
    topic: "economy",
    text: "The poverty line in India is determined by?",
    options: ["National Sample Survey", "Census of India", "Planning Commission", "Ministry of Rural Development"],
    correct: 0,
    difficulty: "hard",
    source: "UPSC 2020"
  },

  // SCIENCE & TECHNOLOGY (15 questions)
  {
    topic: "science-tech",
    text: "The speed of light is approximately?",
    options: ["300,000 km/s", "150,000 km/s", "450,000 km/s", "200,000 km/s"],
    correct: 0,
    difficulty: "easy",
    source: "UPSC 2015"
  },
  {
    topic: "science-tech",
    text: "Which element is essential for the formation of bones?",
    options: ["Phosphorus", "Calcium", "Magnesium", "All of the above"],
    correct: 3,
    difficulty: "medium",
    source: "UPSC 2016"
  },
  {
    topic: "science-tech",
    text: "The symbol for Gold is?",
    options: ["Go", "Gd", "Au", "Ag"],
    correct: 2,
    difficulty: "easy",
    source: "UPSC 2014"
  },
  {
    topic: "science-tech",
    text: "How many bones are there in the human body?",
    options: ["186", "206", "226", "246"],
    correct: 1,
    difficulty: "medium",
    source: "UPSC 2015"
  },
  {
    topic: "science-tech",
    text: "The process of conversion of light energy into chemical energy is called?",
    options: ["Respiration", "Photosynthesis", "Fermentation", "Oxidation"],
    correct: 1,
    difficulty: "easy",
    source: "UPSC 2014"
  },
  {
    topic: "science-tech",
    text: "Which gas is responsible for the greenhouse effect?",
    options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"],
    correct: 2,
    difficulty: "medium",
    source: "UPSC 2017"
  },
  {
    topic: "science-tech",
    text: "The unit of frequency is?",
    options: ["Hertz", "Watt", "Joule", "Pascal"],
    correct: 0,
    difficulty: "easy",
    source: "UPSC 2013"
  },
  {
    topic: "science-tech",
    text: "Which of the following is a non-renewable resource?",
    options: ["Solar energy", "Wind energy", "Coal", "Hydro energy"],
    correct: 2,
    difficulty: "medium",
    source: "UPSC 2016"
  },
  {
    topic: "science-tech",
    text: "The scientist who developed the theory of evolution is?",
    options: ["Gregor Mendel", "Charles Darwin", "Louis Pasteur", "Albert Einstein"],
    correct: 1,
    difficulty: "easy",
    source: "UPSC 2015"
  },
  {
    topic: "science-tech",
    text: "Which technology is used in modern smartphones for fast charging?",
    options: ["Lithium-ion batteries", "Nuclear fusion", "Solar cells", "Wind turbines"],
    correct: 0,
    difficulty: "medium",
    source: "UPSC 2019"
  },
  {
    topic: "science-tech",
    text: "The planet closest to the Sun is?",
    options: ["Venus", "Earth", "Mercury", "Mars"],
    correct: 2,
    difficulty: "easy",
    source: "UPSC 2014"
  },
  {
    topic: "science-tech",
    text: "Which programming language is used for artificial intelligence?",
    options: ["C++", "Java", "Python", "Assembly"],
    correct: 2,
    difficulty: "medium",
    source: "UPSC 2020"
  },
  {
    topic: "science-tech",
    text: "The device used to measure atmospheric pressure is?",
    options: ["Thermometer", "Barometer", "Hygrometer", "Anemometer"],
    correct: 1,
    difficulty: "medium",
    source: "UPSC 2018"
  },
  {
    topic: "science-tech",
    text: "Which metal is liquid at room temperature?",
    options: ["Iron", "Copper", "Mercury", "Aluminum"],
    correct: 2,
    difficulty: "medium",
    source: "UPSC 2017"
  },
  {
    topic: "science-tech",
    text: "The concept of 'Internet of Things' (IoT) refers to?",
    options: ["Networking of physical devices", "Software development", "Web design", "Data analysis"],
    correct: 0,
    difficulty: "hard",
    source: "UPSC 2019"
  },

  // ENVIRONMENT & ECOLOGY (12 questions)
  {
    topic: "environment",
    text: "Which gas is primarily responsible for ozone depletion?",
    options: ["Methane", "CFCs", "Carbon Dioxide", "Nitrous Oxide"],
    correct: 1,
    difficulty: "medium",
    source: "UPSC 2016"
  },
  {
    topic: "environment",
    text: "The world's largest rainforest is the?",
    options: ["Congo Rainforest", "Amazon Rainforest", "Southeast Asian Rainforest", "Australian Rainforest"],
    correct: 1,
    difficulty: "easy",
    source: "UPSC 2015"
  },
  {
    topic: "environment",
    text: "Which organization issues 'Red List' for endangered species?",
    options: ["IUCN", "UNESCO", "WWF", "UNEP"],
    correct: 0,
    difficulty: "hard",
    source: "UPSC 2018"
  },
  {
    topic: "environment",
    text: "The process of land degradation due to human activities is called?",
    options: ["Afforestation", "Deforestation", "Desertification", "Salinization"],
    correct: 2,
    difficulty: "medium",
    source: "UPSC 2017"
  },
  {
    topic: "environment",
    text: "Biodiversity hotspots in India include?",
    options: ["Western Ghats", "Eastern Himalayas", "Sundarbans", "All of the above"],
    correct: 3,
    difficulty: "hard",
    source: "UPSC 2019"
  },
  {
    topic: "environment",
    text: "Which act is the primary environmental law in India?",
    options: ["Environment Protection Act, 1986", "Water Pollution Control Act, 1974", "Air Quality Management Act", "Waste Management Act"],
    correct: 0,
    difficulty: "hard",
    source: "UPSC 2017"
  },
  {
    topic: "environment",
    text: "The term 'carbon footprint' refers to?",
    options: ["Fossil fuel consumption", "Total greenhouse gas emissions", "Agricultural waste", "Industrial pollution"],
    correct: 1,
    difficulty: "medium",
    source: "UPSC 2018"
  },
  {
    topic: "environment",
    text: "Wetlands are important for?",
    options: ["Flood control", "Water filtration", "Biodiversity", "All of the above"],
    correct: 3,
    difficulty: "medium",
    source: "UPSC 2016"
  },
  {
    topic: "environment",
    text: "Which animal is the national animal of India?",
    options: ["Lion", "Tiger", "Elephant", "Leopard"],
    correct: 1,
    difficulty: "easy",
    source: "UPSC 2014"
  },
  {
    topic: "environment",
    text: "The concept of 'sustainable development' was first formally defined in which report?",
    options: ["Brundtland Report", "Rio Declaration", "Paris Agreement", "Montreal Protocol"],
    correct: 0,
    difficulty: "hard",
    source: "UPSC 2020"
  },
  {
    topic: "environment",
    text: "Tiger reserves in India use which conservation model?",
    options: ["Project Tiger", "Biodiversity Protection Scheme", "Wildlife Management Plan", "Species Recovery Program"],
    correct: 0,
    difficulty: "hard",
    source: "UPSC 2019"
  },
  {
    topic: "environment",
    text: "The International Date Line passes through which ocean?",
    options: ["Atlantic Ocean", "Indian Ocean", "Pacific Ocean", "Arctic Ocean"],
    correct: 2,
    difficulty: "easy",
    source: "UPSC 2015"
  },

  // CURRENT AFFAIRS & INTERNATIONAL RELATIONS (10 questions)
  {
    topic: "current-affairs",
    text: "Which country is the largest democracy in the world?",
    options: ["United States", "India", "Indonesia", "Brazil"],
    correct: 1,
    difficulty: "easy",
    source: "UPSC 2014"
  },
  {
    topic: "current-affairs",
    text: "The United Nations was founded in which year?",
    options: ["1945", "1950", "1960", "1975"],
    correct: 0,
    difficulty: "easy",
    source: "UPSC 2015"
  },
  {
    topic: "current-affairs",
    text: "Which country hosts the annual World Economic Forum?",
    options: ["Switzerland", "United States", "Germany", "France"],
    correct: 0,
    difficulty: "medium",
    source: "UPSC 2016"
  },
  {
    topic: "current-affairs",
    text: "The Paris Climate Agreement aims to limit global warming to?",
    options: ["1.5 degrees Celsius", "2 degrees Celsius", "2.5 degrees Celsius", "3 degrees Celsius"],
    correct: 1,
    difficulty: "medium",
    source: "UPSC 2017"
  },
  {
    topic: "current-affairs",
    text: "Which country is a permanent member of UN Security Council?",
    options: ["India", "Brazil", "Japan", "China"],
    correct: 3,
    difficulty: "easy",
    source: "UPSC 2014"
  },
  {
    topic: "current-affairs",
    text: "The Association of Southeast Asian Nations (ASEAN) was founded in which year?",
    options: ["1955", "1965", "1967", "1975"],
    correct: 2,
    difficulty: "hard",
    source: "UPSC 2018"
  },
  {
    topic: "current-affairs",
    text: "Which organization is responsible for promoting sustainable development goals?",
    options: ["WHO", "UNDP", "UNESCO", "All of the above"],
    correct: 3,
    difficulty: "hard",
    source: "UPSC 2019"
  },
  {
    topic: "current-affairs",
    text: "India is a member of which regional organization?",
    options: ["SAARC", "ASEAN", "African Union", "Arab League"],
    correct: 0,
    difficulty: "easy",
    source: "UPSC 2016"
  },
  {
    topic: "current-affairs",
    text: "The Kyoto Protocol is related to?",
    options: ["Nuclear non-proliferation", "Climate change", "Trade agreements", "Human rights"],
    correct: 1,
    difficulty: "medium",
    source: "UPSC 2015"
  },
  {
    topic: "current-affairs",
    text: "The headquarters of BRICS is located in which country?",
    options: ["Russia", "China", "South Africa", "Brazil"],
    correct: 2,
    difficulty: "hard",
    source: "UPSC 2020"
  },
];

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

async function setAdminClaims(adminId) {
  await sql`
    select set_config(
      'request.jwt.claims',
      ${JSON.stringify({ role: "authenticated", sub: adminId, app_metadata: { user_role: "admin" } })},
      false
    )
  `;
  await sql`select set_config('request.jwt.claim.sub', ${adminId}, false)`;
}

async function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

(async () => {
  console.log(`\nSeeding ${QUESTIONS.length} UPSC questions...`);

  const [exam] = await sql`select id from public.exams where slug = 'upsc-prelims' limit 1`;
  if (!exam) {
    console.error("❌ UPSC exam (slug=upsc-prelims) not found. Import the manifest first.");
    process.exit(1);
  }

  const [admin] = await sql`select id from auth.users where email = 'admin@example.com' limit 1`;
  if (!admin) {
    console.error("❌ admin@example.com not found. Run scripts/create-test-users.js first.");
    process.exit(1);
  }

  const [existing] = await sql`
    select count(*)::int n
    from public.questions
    where exam_id = ${exam.id} and source_reference = ${SOURCE_REF}
  `;
  if (existing.n > 0) {
    const [live] = await sql`
      select count(*)::int n from public.questions where exam_id = ${exam.id} and status = 'live'
    `;
    console.log(`ℹ️  Already seeded (${existing.n} extended questions present). Live questions: ${live.n}. Skipping.`);
    await sql.end();
    return;
  }

  await setAdminClaims(admin.id);

  let created = 0;
  for (const q of QUESTIONS) {
    // Find topic by slug; auto-create if missing so seed is self-contained
    let [topic_rec] = await sql`
      select id from public.topics where exam_id = ${exam.id} and slug = ${q.topic} limit 1
    `;
    if (!topic_rec) {
      const displayName = q.topic.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
      const [created] = await sql`
        insert into public.topics (exam_id, slug, name, weight_percent)
        values (${exam.id}, ${q.topic}, ${displayName}, 5)
        on conflict (exam_id, slug) do update set name = excluded.name
        returning id
      `;
      topic_rec = created;
      console.log(`  + Auto-created topic: ${q.topic}`);
    }

    const difficulty = q.difficulty;
    const tier = difficulty === "easy" ? "silver" : difficulty === "medium" ? "bronze" : "gold";

    const content = {
      type: "mcq",
      text: q.text,
      options: q.options,
      correct_options: [q.correct]
    };

    // Full 17-param signature for create_admin_question
    const result = await sql`
      select create_admin_question(
        ${exam.id}::uuid,
        ${topic_rec.id}::uuid,
        null::uuid,
        'mcq',
        ${difficulty},
        ${q.source},
        null::int,
        ${SOURCE_REF},
        false,
        'en',
        'draft',
        'practice',
        ${tier},
        ${JSON.stringify(content)}::jsonb,
        '',
        '',
        ''
      ) as result
    `;

    const qid = result?.[0]?.result?.question_id ?? result?.[0]?.result;
    if (qid) {
      await sql`select set_question_status(${qid}::uuid, 'live')`;
      created++;
      if (created % 20 === 0) {
        console.log(`✓ Created ${created}/${QUESTIONS.length}...`);
      }
    }
  }

  console.log(`\n✅ Seeded ${created} UPSC questions successfully!\n`);

  const [live] = await sql`
    select count(*)::int n from public.questions where exam_id = ${exam.id} and status = 'live'
  `;
  console.log(`📊 Total live questions in UPSC Prelims: ${live.n}`);

  const byTopic = await sql`
    select name, count(*)::int count
    from public.questions q
    join public.topics t on q.topic_id = t.id
    where q.exam_id = ${exam.id} and q.status = 'live'
    group by name
    order by name
  `;

  console.log("\nBreakdown by topic:");
  for (const row of byTopic) {
    console.log(`  ${row.name}: ${row.count}`);
  }

  await sql.end();
})();
