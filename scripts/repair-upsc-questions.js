/* eslint-disable @typescript-eslint/no-require-imports */
/*
 * Repair script: re-seeds the 90 UPSC questions that have broken content.
 * The original seed passed content as JSON.stringify()::jsonb which worked,
 * but the content had a redundant "type" key inside. More importantly, the
 * demo seed shows content should use sql.json() for proper parameterization.
 *
 * This script:
 * 1. Deletes questions seeded with source_reference = 'upsc-seed-extended'
 * 2. Re-seeds them with correct content format using sql.json()
 *
 * Run: node scripts/repair-upsc-questions.js
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

const QUESTIONS = [
  // MODERN HISTORY (15 questions)
  { topic: "modern-history", text: "Who was the first Prime Minister of independent India?", options: ["Jawaharlal Nehru", "Sardar Vallabhbhai Patel", "C. Rajagopalachari", "Dr. Rajendra Prasad"], correct: 0, difficulty: "easy" },
  { topic: "modern-history", text: "In which year did the Indian National Congress pass the Purna Swaraj resolution?", options: ["1929", "1930", "1931", "1928"], correct: 0, difficulty: "medium" },
  { topic: "modern-history", text: "The Salt March led by Gandhi started from which city?", options: ["Ahmedabad", "Sabarmati", "Delhi", "Bombay"], correct: 0, difficulty: "easy" },
  { topic: "modern-history", text: "Who among the following was associated with the Khilafat Movement in India?", options: ["Maulana Abul Kalam Azad", "Muhammad Ali Jinnah", "Rajendra Prasad", "Chitta Ranjan Das"], correct: 0, difficulty: "hard" },
  { topic: "modern-history", text: "The Partition of India occurred in which year?", options: ["1945", "1946", "1947", "1948"], correct: 2, difficulty: "easy" },
  { topic: "modern-history", text: "Which is the oldest monument built by any of the Mughal emperors?", options: ["Agra Fort", "Humayun's Tomb", "Taj Mahal", "Red Fort"], correct: 1, difficulty: "hard" },
  { topic: "modern-history", text: "Who founded the Indian National Congress?", options: ["Allan Octavian Hume", "Dadabhai Naoroji", "Surendranath Banerjee", "Ishwar Chandra Vidyasagar"], correct: 0, difficulty: "medium" },
  { topic: "modern-history", text: "The Quit India Movement was launched in which year?", options: ["1940", "1941", "1942", "1943"], correct: 2, difficulty: "easy" },
  { topic: "modern-history", text: "Which of the following was the capital of Mauryan Empire?", options: ["Ujjain", "Pataliputra", "Mathura", "Taxila"], correct: 1, difficulty: "medium" },
  { topic: "modern-history", text: "The Battle of Plassey was fought in which year?", options: ["1757", "1760", "1764", "1765"], correct: 0, difficulty: "medium" },
  { topic: "modern-history", text: "Who was the founder of the Mughal Empire?", options: ["Akbar", "Aurangzeb", "Babur", "Shah Jahan"], correct: 2, difficulty: "easy" },
  { topic: "modern-history", text: "The Sepoy Mutiny occurred in which year?", options: ["1855", "1857", "1859", "1861"], correct: 1, difficulty: "easy" },
  { topic: "modern-history", text: "Which ancient university was located in present-day Bihar?", options: ["Nalanda", "Takshashila", "Pushpagiri", "Soma"], correct: 0, difficulty: "medium" },
  { topic: "modern-history", text: "The Vedic period in India lasted approximately for how many years?", options: ["1000 years", "1500 years", "2000 years", "3000 years"], correct: 2, difficulty: "hard" },
  { topic: "modern-history", text: "The Maurya dynasty was founded by which emperor?", options: ["Chandragupta Maurya", "Ashoka", "Bindusara", "Samprati"], correct: 0, difficulty: "easy" },

  // GEOGRAPHY (12 questions)
  { topic: "geography", text: "Which is the longest river in India?", options: ["Brahmaputra", "Ganges", "Godavari", "Yamuna"], correct: 1, difficulty: "easy" },
  { topic: "geography", text: "The Western Ghats is located in which part of India?", options: ["Eastern", "Western", "Northern", "Southern"], correct: 1, difficulty: "easy" },
  { topic: "geography", text: "Which state is known as the 'Land of Gods'?", options: ["Himachal Pradesh", "Uttarakhand", "Kashmir", "Sikkim"], correct: 1, difficulty: "medium" },
  { topic: "geography", text: "The Deccan Plateau is located in which part of India?", options: ["North India", "South India", "East India", "Northeast India"], correct: 1, difficulty: "easy" },
  { topic: "geography", text: "Which of the following is the highest peak in the Western Ghats?", options: ["Dodabetta", "Anai Mudi", "Nilgiri", "Mahableshwar"], correct: 1, difficulty: "hard" },
  { topic: "geography", text: "The Himalayas are divided into how many ranges?", options: ["2", "3", "4", "5"], correct: 1, difficulty: "medium" },
  { topic: "geography", text: "Which desert is located in Rajasthan?", options: ["Thar Desert", "Sahara Desert", "Kalahari Desert", "Atacama Desert"], correct: 0, difficulty: "easy" },
  { topic: "geography", text: "The Island of Lakshadweep is located in which sea?", options: ["Arabian Sea", "Indian Ocean", "Bay of Bengal", "Red Sea"], correct: 0, difficulty: "easy" },
  { topic: "geography", text: "Which state receives the highest rainfall in India?", options: ["Kerala", "Assam", "Meghalaya", "Mizoram"], correct: 2, difficulty: "hard" },
  { topic: "geography", text: "The Sundarbans Delta is formed by which river(s)?", options: ["Ganges", "Brahmaputra", "Ganges and Brahmaputra", "Meghna"], correct: 2, difficulty: "hard" },
  { topic: "geography", text: "Which is the coldest place in India?", options: ["Leh", "Shimla", "Darjeeling", "Nainital"], correct: 0, difficulty: "medium" },
  { topic: "geography", text: "The Eastern Ghats run parallel to which coast of India?", options: ["East coast", "West coast", "North coast", "South coast"], correct: 0, difficulty: "easy" },

  // POLITY (14 questions)
  { topic: "polity", text: "How many members are there in the Lok Sabha?", options: ["545", "552", "500", "530"], correct: 0, difficulty: "easy" },
  { topic: "polity", text: "The Constitution of India was adopted on which date?", options: ["26 January 1950", "26 November 1949", "15 August 1947", "2 October 1869"], correct: 1, difficulty: "easy" },
  { topic: "polity", text: "Who is called the Father of the Indian Constitution?", options: ["Dr. Rajendra Prasad", "Dr. B.R. Ambedkar", "Jawaharlal Nehru", "Sardar Vallabhbhai Patel"], correct: 1, difficulty: "easy" },
  { topic: "polity", text: "The Indian Constitution originally had how many Articles?", options: ["370", "395", "400", "420"], correct: 1, difficulty: "medium" },
  { topic: "polity", text: "How many Schedules are there in the Indian Constitution?", options: ["10", "12", "15", "18"], correct: 1, difficulty: "medium" },
  { topic: "polity", text: "The voting age in India is fixed at how many years?", options: ["18 years", "21 years", "16 years", "20 years"], correct: 0, difficulty: "easy" },
  { topic: "polity", text: "How many members are there in the Rajya Sabha (maximum)?", options: ["200", "245", "250", "300"], correct: 1, difficulty: "easy" },
  { topic: "polity", text: "Which article of the Constitution guarantees the Right to Equality?", options: ["Article 12", "Article 13", "Article 14", "Article 15"], correct: 2, difficulty: "medium" },
  { topic: "polity", text: "The President of India can declare a national emergency under which article?", options: ["Article 352", "Article 356", "Article 360", "Article 370"], correct: 0, difficulty: "hard" },
  { topic: "polity", text: "Which article of the Constitution abolishes untouchability?", options: ["Article 14", "Article 15", "Article 16", "Article 17"], correct: 3, difficulty: "hard" },
  { topic: "polity", text: "Money bills can be introduced only in which house?", options: ["Rajya Sabha", "Lok Sabha", "Either house", "President's office"], correct: 1, difficulty: "medium" },
  { topic: "polity", text: "How many states does India have?", options: ["28", "29", "30", "31"], correct: 1, difficulty: "easy" },
  { topic: "polity", text: "The Directive Principles of State Policy are in which Part of the Constitution?", options: ["Part II", "Part III", "Part IV", "Part V"], correct: 2, difficulty: "medium" },
  { topic: "polity", text: "Which constitutional amendment removed the right to property as a fundamental right?", options: ["42nd", "44th", "46th", "48th"], correct: 1, difficulty: "hard" },

  // ECONOMY (12 questions)
  { topic: "economy", text: "GDP stands for?", options: ["Gross Domestic Product", "Gross Development Product", "Global Domestic Product", "Gross Distributed Product"], correct: 0, difficulty: "easy" },
  { topic: "economy", text: "The Reserve Bank of India is located in which city?", options: ["New Delhi", "Mumbai", "Bangalore", "Kolkata"], correct: 1, difficulty: "easy" },
  { topic: "economy", text: "Which five-year plan was the first to be launched in India?", options: ["First", "Second", "Third", "Fourth"], correct: 0, difficulty: "easy" },
  { topic: "economy", text: "GST stands for?", options: ["Global Sales Tax", "Goods and Services Tax", "Government Supply Tax", "Growth and Stability Tax"], correct: 1, difficulty: "medium" },
  { topic: "economy", text: "The largest sector of Indian economy by GDP is?", options: ["Agriculture", "Industry", "Services", "Mining"], correct: 2, difficulty: "medium" },
  { topic: "economy", text: "Which organization controls the money supply in India?", options: ["Ministry of Finance", "Reserve Bank of India", "State Bank of India", "SEBI"], correct: 1, difficulty: "medium" },
  { topic: "economy", text: "Inflation in India is measured by?", options: ["WPI only", "CPI only", "Both WPI and CPI", "Neither"], correct: 2, difficulty: "hard" },
  { topic: "economy", text: "Which is the highest body for planning in India currently?", options: ["NITI Aayog", "Ministry of Planning", "Planning Commission", "Cabinet"], correct: 0, difficulty: "hard" },
  { topic: "economy", text: "The Monetary Policy Committee (MPC) operates under which institution?", options: ["Ministry of Finance", "Reserve Bank of India", "SEBI", "NABARD"], correct: 1, difficulty: "medium" },
  { topic: "economy", text: "Which index measures the health of India's stock market?", options: ["SENSEX only", "NIFTY only", "Both SENSEX and NIFTY", "Bombay Exchange"], correct: 2, difficulty: "medium" },
  { topic: "economy", text: "The poverty line in India is determined by?", options: ["National Sample Survey", "Census of India", "Planning Commission", "Ministry of Rural Development"], correct: 0, difficulty: "hard" },
  { topic: "economy", text: "Which of the following is NOT an economic sector?", options: ["Primary", "Secondary", "Tertiary", "Educational"], correct: 3, difficulty: "easy" },

  // SCIENCE & TECHNOLOGY (15 questions)
  { topic: "science-tech", text: "The speed of light is approximately?", options: ["300,000 km/s", "150,000 km/s", "450,000 km/s", "200,000 km/s"], correct: 0, difficulty: "easy" },
  { topic: "science-tech", text: "The symbol for Gold is?", options: ["Go", "Gd", "Au", "Ag"], correct: 2, difficulty: "easy" },
  { topic: "science-tech", text: "How many bones are there in the human body?", options: ["186", "206", "226", "246"], correct: 1, difficulty: "medium" },
  { topic: "science-tech", text: "The process of conversion of light energy into chemical energy is called?", options: ["Respiration", "Photosynthesis", "Fermentation", "Oxidation"], correct: 1, difficulty: "easy" },
  { topic: "science-tech", text: "Which gas is responsible for the greenhouse effect primarily?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], correct: 2, difficulty: "medium" },
  { topic: "science-tech", text: "The unit of frequency is?", options: ["Hertz", "Watt", "Joule", "Pascal"], correct: 0, difficulty: "easy" },
  { topic: "science-tech", text: "Which of the following is a non-renewable resource?", options: ["Solar energy", "Wind energy", "Coal", "Hydro energy"], correct: 2, difficulty: "medium" },
  { topic: "science-tech", text: "The scientist who developed the theory of evolution is?", options: ["Gregor Mendel", "Charles Darwin", "Louis Pasteur", "Albert Einstein"], correct: 1, difficulty: "easy" },
  { topic: "science-tech", text: "The planet closest to the Sun is?", options: ["Venus", "Earth", "Mercury", "Mars"], correct: 2, difficulty: "easy" },
  { topic: "science-tech", text: "The device used to measure atmospheric pressure is?", options: ["Thermometer", "Barometer", "Hygrometer", "Anemometer"], correct: 1, difficulty: "medium" },
  { topic: "science-tech", text: "Which metal is liquid at room temperature?", options: ["Iron", "Copper", "Mercury", "Aluminum"], correct: 2, difficulty: "medium" },
  { topic: "science-tech", text: "The electron was discovered by which scientist?", options: ["Ernest Rutherford", "J.J. Thomson", "Niels Bohr", "Albert Einstein"], correct: 1, difficulty: "easy" },
  { topic: "science-tech", text: "The chemical symbol for Copper is?", options: ["Cp", "Co", "Cu", "Cb"], correct: 2, difficulty: "easy" },
  { topic: "science-tech", text: "Which gas constitutes about 78% of Earth's atmosphere?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Argon"], correct: 1, difficulty: "easy" },
  { topic: "science-tech", text: "The concept of 'Internet of Things' (IoT) refers to?", options: ["Networking of physical devices", "Software development", "Web design", "Data analysis"], correct: 0, difficulty: "hard" },

  // ENVIRONMENT & ECOLOGY (12 questions)
  { topic: "environment", text: "Which gas is primarily responsible for ozone depletion?", options: ["Methane", "CFCs", "Carbon Dioxide", "Nitrous Oxide"], correct: 1, difficulty: "medium" },
  { topic: "environment", text: "The world's largest rainforest is the?", options: ["Congo Rainforest", "Amazon Rainforest", "Southeast Asian Rainforest", "Australian Rainforest"], correct: 1, difficulty: "easy" },
  { topic: "environment", text: "Which organization issues 'Red List' for endangered species?", options: ["IUCN", "UNESCO", "WWF", "UNEP"], correct: 0, difficulty: "hard" },
  { topic: "environment", text: "Biodiversity hotspots in India include?", options: ["Western Ghats only", "Eastern Himalayas only", "Sundarbans only", "Western Ghats and Eastern Himalayas"], correct: 3, difficulty: "hard" },
  { topic: "environment", text: "Which act is the primary environmental law in India?", options: ["Environment Protection Act, 1986", "Water Pollution Control Act, 1974", "Air Quality Management Act", "Waste Management Act"], correct: 0, difficulty: "hard" },
  { topic: "environment", text: "The term 'carbon footprint' refers to?", options: ["Fossil fuel consumption", "Total greenhouse gas emissions", "Agricultural waste", "Industrial pollution"], correct: 1, difficulty: "medium" },
  { topic: "environment", text: "Wetlands are important for which of the following?", options: ["Flood control", "Water filtration", "Biodiversity", "All of the above"], correct: 3, difficulty: "medium" },
  { topic: "environment", text: "Which animal is the national animal of India?", options: ["Lion", "Tiger", "Elephant", "Leopard"], correct: 1, difficulty: "easy" },
  { topic: "environment", text: "The concept of 'sustainable development' was first formally defined in?", options: ["Brundtland Report", "Rio Declaration", "Paris Agreement", "Montreal Protocol"], correct: 0, difficulty: "hard" },
  { topic: "environment", text: "Tiger reserves in India use which conservation model?", options: ["Project Tiger", "Biodiversity Protection Scheme", "Wildlife Management Plan", "Species Recovery Program"], correct: 0, difficulty: "hard" },
  { topic: "environment", text: "Which treaty replaced the Kyoto Protocol?", options: ["Paris Agreement", "Montreal Protocol", "Basel Convention", "Rio Declaration"], correct: 0, difficulty: "medium" },
  { topic: "environment", text: "The national bird of India is?", options: ["Peacock", "Eagle", "Parrot", "Crane"], correct: 0, difficulty: "easy" },

  // CURRENT AFFAIRS (10 questions)
  { topic: "current-affairs", text: "Which country is the largest democracy in the world?", options: ["United States", "India", "Indonesia", "Brazil"], correct: 1, difficulty: "easy" },
  { topic: "current-affairs", text: "The United Nations was founded in which year?", options: ["1945", "1950", "1960", "1975"], correct: 0, difficulty: "easy" },
  { topic: "current-affairs", text: "Which country hosts the annual World Economic Forum?", options: ["Switzerland", "United States", "Germany", "France"], correct: 0, difficulty: "medium" },
  { topic: "current-affairs", text: "The Paris Climate Agreement aims to limit global warming to?", options: ["1.5 degrees Celsius", "2 degrees Celsius", "2.5 degrees Celsius", "3 degrees Celsius"], correct: 1, difficulty: "medium" },
  { topic: "current-affairs", text: "Which country is a permanent member of UN Security Council?", options: ["India", "Brazil", "Japan", "China"], correct: 3, difficulty: "easy" },
  { topic: "current-affairs", text: "The Association of Southeast Asian Nations (ASEAN) was founded in which year?", options: ["1955", "1965", "1967", "1975"], correct: 2, difficulty: "hard" },
  { topic: "current-affairs", text: "India is a member of which regional organization?", options: ["SAARC", "ASEAN", "African Union", "Arab League"], correct: 0, difficulty: "easy" },
  { topic: "current-affairs", text: "The Kyoto Protocol is related to?", options: ["Nuclear non-proliferation", "Climate change", "Trade agreements", "Human rights"], correct: 1, difficulty: "medium" },
  { topic: "current-affairs", text: "Which organization publishes the 'Human Development Report'?", options: ["World Bank", "IMF", "UNDP", "WHO"], correct: 2, difficulty: "hard" },
  { topic: "current-affairs", text: "The Sustainable Development Goals (SDGs) were adopted in which year?", options: ["2010", "2012", "2015", "2018"], correct: 2, difficulty: "medium" },
];

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

async function setAdminClaims(adminId) {
  await sql`select set_config('request.jwt.claims', ${JSON.stringify({ role: "authenticated", sub: adminId, app_metadata: { user_role: "admin" } })}, false)`;
  await sql`select set_config('request.jwt.claim.sub', ${adminId}, false)`;
}

(async () => {
  console.log("\nRepairing UPSC questions (delete + re-seed with correct format)...\n");

  const [exam] = await sql`select id from public.exams where slug = 'upsc-prelims' limit 1`;
  if (!exam) { console.error("UPSC exam not found."); process.exit(1); }

  const [admin] = await sql`select id from auth.users where email = 'admin@example.com' limit 1`;
  if (!admin) { console.error("admin@example.com not found."); process.exit(1); }

  // Delete broken questions
  const [deleted] = await sql`
    select count(*)::int n from public.questions
    where exam_id = ${exam.id} and source_reference = ${SOURCE_REF}
  `;
  if (deleted.n > 0) {
    console.log(`Deleting ${deleted.n} broken questions...`);
    // Must delete versions first due to FK
    await sql`
      delete from public.question_versions
      where question_id in (
        select id from public.questions
        where exam_id = ${exam.id} and source_reference = ${SOURCE_REF}
      )
    `;
    await sql`
      delete from public.questions
      where exam_id = ${exam.id} and source_reference = ${SOURCE_REF}
    `;
    console.log("Deleted.\n");
  }

  await setAdminClaims(admin.id);

  let created = 0;
  for (const q of QUESTIONS) {
    let [topic_rec] = await sql`
      select id from public.topics where exam_id = ${exam.id} and slug = ${q.topic} limit 1
    `;
    if (!topic_rec) {
      const displayName = q.topic.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
      const [created_topic] = await sql`
        insert into public.topics (exam_id, slug, name, weight_percent)
        values (${exam.id}, ${q.topic}, ${displayName}, 5)
        on conflict (exam_id, slug) do update set name = excluded.name
        returning id
      `;
      topic_rec = created_topic;
    }

    const tier = q.difficulty === "easy" ? "silver" : q.difficulty === "medium" ? "bronze" : "gold";

    // Content WITHOUT "type" key — matching the demo seed format
    // Use sql.json() for correct parameterization
    const content = {
      text: q.text,
      options: q.options,
      correct_options: [q.correct],
      correct_integer: null,
      pairs: null,
      images: []
    };

    const [row] = await sql`
      select public.create_admin_question(
        ${exam.id}, ${topic_rec.id}, ${null}, ${"mcq"}, ${q.difficulty},
        ${"pyq"}, ${null}, ${SOURCE_REF}, ${false}, ${"en"}, ${"draft"},
        ${"practice"}, ${tier}, ${sql.json(content)},
        ${""}, ${null}, ${""}
      ) as result
    `;

    const questionId = row?.result?.question_id;
    if (questionId) {
      await sql`select public.set_question_status(${questionId}, ${"live"}, ${"upsc seed"}) as result`;
      created++;
    }

    if (created % 20 === 0 && created > 0) {
      console.log(`✓ Created ${created}/${QUESTIONS.length}...`);
    }
  }

  console.log(`\n✅ Repaired ${created} UPSC questions successfully!\n`);

  const byTopic = await sql`
    select t.name, count(*)::int as count
    from public.questions q
    join public.topics t on q.topic_id = t.id
    where q.exam_id = ${exam.id} and q.status = 'live' and q.source_reference = ${SOURCE_REF}
    group by t.name order by t.name
  `;

  console.log("Breakdown by topic:");
  for (const row of byTopic) {
    console.log(`  ${row.name}: ${row.count}`);
  }

  const [total] = await sql`
    select count(*)::int n from public.questions where exam_id = ${exam.id} and status = 'live'
  `;
  console.log(`\nTotal live questions in UPSC Prelims: ${total.n}`);
  await sql.end();
})();
