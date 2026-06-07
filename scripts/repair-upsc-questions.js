/* eslint-disable @typescript-eslint/no-require-imports */
/*
 * Repair script: fixes UPSC questions whose content was stored as a character
 * array (keys "0","1","2"...) instead of a proper JSON object.
 *
 * Root cause: the original seed script passed JSON.stringify(content) as a
 * plain string to postgres.js which then serialized the string as a character-
 * indexed JSON object. The fix is to UPDATE question_versions.content in place
 * using sql.json() for each question, matched by their stored question text.
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

// Full list of questions with correct content
const QUESTIONS = [
  { text: "Who was the first Prime Minister of independent India?", options: ["Jawaharlal Nehru", "Sardar Vallabhbhai Patel", "C. Rajagopalachari", "Dr. Rajendra Prasad"], correct: 0 },
  { text: "In which year did the Indian National Congress pass the Purna Swaraj resolution?", options: ["1929", "1930", "1931", "1928"], correct: 0 },
  { text: "The Salt March led by Gandhi started from which city?", options: ["Ahmedabad", "Sabarmati", "Delhi", "Bombay"], correct: 0 },
  { text: "Who among the following was associated with the Khilafat Movement in India?", options: ["Maulana Abul Kalam Azad", "Muhammad Ali Jinnah", "Rajendra Prasad", "Chitta Ranjan Das"], correct: 0 },
  { text: "The Partition of India occurred in which year?", options: ["1945", "1946", "1947", "1948"], correct: 2 },
  { text: "Which is the oldest monument built by any of the Mughal emperors?", options: ["Agra Fort", "Humayun's Tomb", "Taj Mahal", "Red Fort"], correct: 1 },
  { text: "Who founded the Indian National Congress?", options: ["Allan Octavian Hume", "Dadabhai Naoroji", "Surendranath Banerjee", "Ishwar Chandra Vidyasagar"], correct: 0 },
  { text: "The Quit India Movement was launched in which year?", options: ["1940", "1941", "1942", "1943"], correct: 2 },
  { text: "Which of the following was the capital of Mauryan Empire?", options: ["Ujjain", "Pataliputra", "Mathura", "Taxila"], correct: 1 },
  { text: "The Battle of Plassey was fought in which year?", options: ["1757", "1760", "1764", "1765"], correct: 0 },
  { text: "Who was the founder of the Mughal Empire?", options: ["Akbar", "Aurangzeb", "Babur", "Shah Jahan"], correct: 2 },
  { text: "The Sepoy Mutiny occurred in which year?", options: ["1855", "1857", "1859", "1861"], correct: 1 },
  { text: "Which ancient university was located in present-day Bihar?", options: ["Nalanda", "Takshashila", "Pushpagiri", "Soma"], correct: 0 },
  { text: "The Vedic period in India lasted approximately for how many years?", options: ["1000 years", "1500 years", "2000 years", "3000 years"], correct: 2 },
  { text: "The Maurya dynasty was founded by which emperor?", options: ["Chandragupta Maurya", "Ashoka", "Bindusara", "Samprati"], correct: 0 },
  { text: "Which is the longest river in India?", options: ["Brahmaputra", "Ganges", "Godavari", "Yamuna"], correct: 1 },
  { text: "The Western Ghats is located in which part of India?", options: ["Eastern", "Western", "Northern", "Southern"], correct: 1 },
  { text: "Which state is known as the 'Land of Gods'?", options: ["Himachal Pradesh", "Uttarakhand", "Kashmir", "Sikkim"], correct: 1 },
  { text: "The Deccan Plateau is located in which part of India?", options: ["North India", "South India", "East India", "Northeast India"], correct: 1 },
  { text: "Which of the following is the highest peak in the Western Ghats?", options: ["Dodabetta", "Anai Mudi", "Nilgiri", "Mahableshwar"], correct: 1 },
  { text: "The Himalayas are divided into how many ranges?", options: ["2", "3", "4", "5"], correct: 1 },
  { text: "Which desert is located in Rajasthan?", options: ["Thar Desert", "Sahara Desert", "Kalahari Desert", "Atacama Desert"], correct: 0 },
  { text: "The Island of Lakshadweep is located in which sea?", options: ["Arabian Sea", "Indian Ocean", "Bay of Bengal", "Red Sea"], correct: 0 },
  { text: "Which state receives the highest rainfall in India?", options: ["Kerala", "Assam", "Meghalaya", "Mizoram"], correct: 2 },
  { text: "The Sundarbans Delta is formed by which river(s)?", options: ["Ganges", "Brahmaputra", "Ganges and Brahmaputra", "Meghna"], correct: 2 },
  { text: "Which is the coldest place in India?", options: ["Leh", "Shimla", "Darjeeling", "Nainital"], correct: 0 },
  { text: "The Eastern Ghats run parallel to which coast of India?", options: ["East coast", "West coast", "North coast", "South coast"], correct: 0 },
  { text: "How many members are there in the Lok Sabha?", options: ["545", "552", "500", "530"], correct: 0 },
  { text: "The Constitution of India was adopted on which date?", options: ["26 January 1950", "26 November 1949", "15 August 1947", "2 October 1869"], correct: 1 },
  { text: "Who is called the Father of the Indian Constitution?", options: ["Dr. Rajendra Prasad", "Dr. B.R. Ambedkar", "Jawaharlal Nehru", "Sardar Vallabhbhai Patel"], correct: 1 },
  { text: "The Indian Constitution originally had how many Articles?", options: ["370", "395", "400", "420"], correct: 1 },
  { text: "How many Schedules are there in the Indian Constitution?", options: ["10", "12", "15", "18"], correct: 1 },
  { text: "The voting age in India is fixed at how many years?", options: ["18 years", "21 years", "16 years", "20 years"], correct: 0 },
  { text: "How many members are there in the Rajya Sabha (maximum)?", options: ["200", "245", "250", "300"], correct: 1 },
  { text: "Which article of the Constitution guarantees the Right to Equality?", options: ["Article 12", "Article 13", "Article 14", "Article 15"], correct: 2 },
  { text: "The President of India can declare a national emergency under which article?", options: ["Article 352", "Article 356", "Article 360", "Article 370"], correct: 0 },
  { text: "Which article of the Constitution abolishes untouchability?", options: ["Article 14", "Article 15", "Article 16", "Article 17"], correct: 3 },
  { text: "Money bills can be introduced only in which house?", options: ["Rajya Sabha", "Lok Sabha", "Either house", "President's office"], correct: 1 },
  { text: "How many states does India have?", options: ["28", "29", "30", "31"], correct: 1 },
  { text: "The Directive Principles of State Policy are in which Part of the Constitution?", options: ["Part II", "Part III", "Part IV", "Part V"], correct: 2 },
  { text: "Which constitutional amendment removed the right to property as a fundamental right?", options: ["42nd", "44th", "46th", "48th"], correct: 1 },
  { text: "GDP stands for?", options: ["Gross Domestic Product", "Gross Development Product", "Global Domestic Product", "Gross Distributed Product"], correct: 0 },
  { text: "The Reserve Bank of India is located in which city?", options: ["New Delhi", "Mumbai", "Bangalore", "Kolkata"], correct: 1 },
  { text: "Which five-year plan was the first to be launched in India?", options: ["First", "Second", "Third", "Fourth"], correct: 0 },
  { text: "GST stands for?", options: ["Global Sales Tax", "Goods and Services Tax", "Government Supply Tax", "Growth and Stability Tax"], correct: 1 },
  { text: "The largest sector of Indian economy by GDP is?", options: ["Agriculture", "Industry", "Services", "Mining"], correct: 2 },
  { text: "Which organization controls the money supply in India?", options: ["Ministry of Finance", "Reserve Bank of India", "State Bank of India", "SEBI"], correct: 1 },
  { text: "Inflation in India is measured by?", options: ["WPI only", "CPI only", "Both WPI and CPI", "Neither"], correct: 2 },
  { text: "Which is the highest body for planning in India currently?", options: ["NITI Aayog", "Ministry of Planning", "Planning Commission", "Cabinet"], correct: 0 },
  { text: "The Monetary Policy Committee (MPC) operates under which institution?", options: ["Ministry of Finance", "Reserve Bank of India", "SEBI", "NABARD"], correct: 1 },
  { text: "Which index measures the health of India's stock market?", options: ["SENSEX only", "NIFTY only", "Both SENSEX and NIFTY", "Bombay Exchange"], correct: 2 },
  { text: "The poverty line in India is determined by?", options: ["National Sample Survey", "Census of India", "Planning Commission", "Ministry of Rural Development"], correct: 0 },
  { text: "Which of the following is NOT an economic sector?", options: ["Primary", "Secondary", "Tertiary", "Educational"], correct: 3 },
  { text: "The speed of light is approximately?", options: ["300,000 km/s", "150,000 km/s", "450,000 km/s", "200,000 km/s"], correct: 0 },
  { text: "The symbol for Gold is?", options: ["Go", "Gd", "Au", "Ag"], correct: 2 },
  { text: "How many bones are there in the human body?", options: ["186", "206", "226", "246"], correct: 1 },
  { text: "The process of conversion of light energy into chemical energy is called?", options: ["Respiration", "Photosynthesis", "Fermentation", "Oxidation"], correct: 1 },
  { text: "Which gas is responsible for the greenhouse effect primarily?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], correct: 2 },
  { text: "The unit of frequency is?", options: ["Hertz", "Watt", "Joule", "Pascal"], correct: 0 },
  { text: "Which of the following is a non-renewable resource?", options: ["Solar energy", "Wind energy", "Coal", "Hydro energy"], correct: 2 },
  { text: "The scientist who developed the theory of evolution is?", options: ["Gregor Mendel", "Charles Darwin", "Louis Pasteur", "Albert Einstein"], correct: 1 },
  { text: "The planet closest to the Sun is?", options: ["Venus", "Earth", "Mercury", "Mars"], correct: 2 },
  { text: "The device used to measure atmospheric pressure is?", options: ["Thermometer", "Barometer", "Hygrometer", "Anemometer"], correct: 1 },
  { text: "Which metal is liquid at room temperature?", options: ["Iron", "Copper", "Mercury", "Aluminum"], correct: 2 },
  { text: "The electron was discovered by which scientist?", options: ["Ernest Rutherford", "J.J. Thomson", "Niels Bohr", "Albert Einstein"], correct: 1 },
  { text: "The chemical symbol for Copper is?", options: ["Cp", "Co", "Cu", "Cb"], correct: 2 },
  { text: "Which gas constitutes about 78% of Earth's atmosphere?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Argon"], correct: 1 },
  { text: "The concept of 'Internet of Things' (IoT) refers to?", options: ["Networking of physical devices", "Software development", "Web design", "Data analysis"], correct: 0 },
  { text: "Which gas is primarily responsible for ozone depletion?", options: ["Methane", "CFCs", "Carbon Dioxide", "Nitrous Oxide"], correct: 1 },
  { text: "The world's largest rainforest is the?", options: ["Congo Rainforest", "Amazon Rainforest", "Southeast Asian Rainforest", "Australian Rainforest"], correct: 1 },
  { text: "Which organization issues 'Red List' for endangered species?", options: ["IUCN", "UNESCO", "WWF", "UNEP"], correct: 0 },
  { text: "Biodiversity hotspots in India include?", options: ["Western Ghats only", "Eastern Himalayas only", "Sundarbans only", "Western Ghats and Eastern Himalayas"], correct: 3 },
  { text: "Which act is the primary environmental law in India?", options: ["Environment Protection Act, 1986", "Water Pollution Control Act, 1974", "Air Quality Management Act", "Waste Management Act"], correct: 0 },
  { text: "The term 'carbon footprint' refers to?", options: ["Fossil fuel consumption", "Total greenhouse gas emissions", "Agricultural waste", "Industrial pollution"], correct: 1 },
  { text: "Wetlands are important for which of the following?", options: ["Flood control", "Water filtration", "Biodiversity", "All of the above"], correct: 3 },
  { text: "Which animal is the national animal of India?", options: ["Lion", "Tiger", "Elephant", "Leopard"], correct: 1 },
  { text: "The concept of 'sustainable development' was first formally defined in?", options: ["Brundtland Report", "Rio Declaration", "Paris Agreement", "Montreal Protocol"], correct: 0 },
  { text: "Tiger reserves in India use which conservation model?", options: ["Project Tiger", "Biodiversity Protection Scheme", "Wildlife Management Plan", "Species Recovery Program"], correct: 0 },
  { text: "Which treaty replaced the Kyoto Protocol?", options: ["Paris Agreement", "Montreal Protocol", "Basel Convention", "Rio Declaration"], correct: 0 },
  { text: "The national bird of India is?", options: ["Peacock", "Eagle", "Parrot", "Crane"], correct: 0 },
  { text: "Which country is the largest democracy in the world?", options: ["United States", "India", "Indonesia", "Brazil"], correct: 1 },
  { text: "The United Nations was founded in which year?", options: ["1945", "1950", "1960", "1975"], correct: 0 },
  { text: "Which country hosts the annual World Economic Forum?", options: ["Switzerland", "United States", "Germany", "France"], correct: 0 },
  { text: "The Paris Climate Agreement aims to limit global warming to?", options: ["1.5 degrees Celsius", "2 degrees Celsius", "2.5 degrees Celsius", "3 degrees Celsius"], correct: 1 },
  { text: "Which country is a permanent member of UN Security Council?", options: ["India", "Brazil", "Japan", "China"], correct: 3 },
  { text: "The Association of Southeast Asian Nations (ASEAN) was founded in which year?", options: ["1955", "1965", "1967", "1975"], correct: 2 },
  { text: "India is a member of which regional organization?", options: ["SAARC", "ASEAN", "African Union", "Arab League"], correct: 0 },
  { text: "The Kyoto Protocol is related to?", options: ["Nuclear non-proliferation", "Climate change", "Trade agreements", "Human rights"], correct: 1 },
  { text: "Which organization publishes the 'Human Development Report'?", options: ["World Bank", "IMF", "UNDP", "WHO"], correct: 2 },
  { text: "The Sustainable Development Goals (SDGs) were adopted in which year?", options: ["2010", "2012", "2015", "2018"], correct: 2 },
];

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

(async () => {
  console.log(`\nRepairing content for ${QUESTIONS.length} UPSC questions (UPDATE in place)...\n`);

  const [exam] = await sql`select id from public.exams where slug = 'upsc-prelims' limit 1`;
  if (!exam) { console.error("UPSC exam not found."); process.exit(1); }

  // Fetch all broken questions
  const broken = await sql`
    select q.id as question_id, qv.id as version_id
    from public.questions q
    join public.question_versions qv on qv.id = q.current_version_id
    where q.exam_id = ${exam.id}
      and q.source_reference = ${SOURCE_REF}
    order by q.created_at
  `;

  if (broken.length === 0) {
    console.log("No questions with source_reference 'upsc-seed-extended' found.");
    await sql.end();
    return;
  }

  if (broken.length !== QUESTIONS.length) {
    console.warn(`⚠️  Found ${broken.length} questions in DB but have ${QUESTIONS.length} in repair list. Proceeding anyway.`);
  }

  let fixed = 0;
  const count = Math.min(broken.length, QUESTIONS.length);

  for (let i = 0; i < count; i++) {
    const q = QUESTIONS[i];
    const row = broken[i];

    const content = {
      text: q.text,
      options: q.options,
      correct_options: [q.correct],
      correct_integer: null,
      pairs: null,
      images: []
    };

    await sql`
      update public.question_versions
      set content = ${sql.json(content)}
      where id = ${row.version_id}
    `;

    fixed++;
    if (fixed % 20 === 0) console.log(`✓ Fixed ${fixed}/${count}...`);
  }

  console.log(`\n✅ Repaired ${fixed} question versions.\n`);

  // Verify
  const [sample] = await sql`
    select qv.content
    from public.questions q
    join public.question_versions qv on qv.id = q.current_version_id
    where q.exam_id = ${exam.id} and q.source_reference = ${SOURCE_REF}
    limit 1
  `;
  console.log("Sample content after repair:");
  console.log("  text:", sample?.content?.text?.slice(0, 60));
  console.log("  options:", sample?.content?.options);
  console.log("\nNow re-start a test to verify questions render correctly.");

  await sql.end();
})();
