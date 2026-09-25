import * as fs from 'fs';

async function generateGeographyQuestions() {
  console.log('Fetching country data from restcountries.com...');
  const res = await fetch('https://restcountries.com/v3.1/all?fields=name,population,area,region,subregion');
  const countries = await res.json();

  const questions = [];

  for (const country of countries) {
    if (!country.name?.common || !country.population || !country.area) continue;

    const countryName = country.name.common;
    const pop = country.population;
    const area = country.area;

    // Population Question
    if (pop > 100000) {
      questions.push({
        text: `What is the population of ${countryName}?`,
        referenceAnswer: pop,
        unit: "person",
        unitPlural: "people",
        category: "geography",
        difficulty: pop > 50000000 ? "medium" : "hard",
        explanation: `As of recent estimates, the population of ${countryName} is approximately ${pop.toLocaleString()}.`,
        estimationApproach: `Consider the size of ${countryName} and its region (${country.region}).`,
        hint: `It is located in ${country.subregion || country.region}.`,
        sourceName: "World Bank / UN",
        referencePeriod: "2023",
        tags: ["population", "geography", countryName.toLowerCase()]
      });
    }

    // Area Question
    if (area > 10000) {
      questions.push({
        text: `What is the total land area of ${countryName} in square kilometers?`,
        referenceAnswer: area,
        unit: "km²",
        unitPlural: "km²",
        category: "geography",
        difficulty: area > 1000000 ? "medium" : "hard",
        explanation: `${countryName} covers a total area of approximately ${area.toLocaleString()} square kilometers.`,
        estimationApproach: `Compare it to a known country or state.`,
        hint: `It is located in ${country.subregion || country.region}.`,
        sourceName: "World Bank / UN",
        referencePeriod: "2023",
        tags: ["area", "geography", countryName.toLowerCase()]
      });
    }
  }

  fs.writeFileSync('./src/data/geography_auto.json', JSON.stringify(questions, null, 2));
  console.log(`Successfully generated ${questions.length} geography questions!`);
}

generateGeographyQuestions().catch(console.error);
