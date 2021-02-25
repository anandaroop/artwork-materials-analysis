import ArtworkMaterialsNgramAnalyzer from "./lib/artwork-materials-ngram-analyzer";
import { createObjectCsvWriter } from "csv-writer";
import { NgramFrequency, NgramWithAatMatch } from "./types";
import * as chalk from "chalk";
import { matchNgramsToAatSubjects } from "./lib/aat";

const CATEGORIES_TO_CONSIDER = [
  /* consider all artworks, across categories */
  null,

  /* consider specific categories too */
  "Painting", // n = 356,574
  "Photography", // n = 201,005
  "Print", // n = 114,750
  "Sculpture", // n = 113,776
  "Drawing, Collage or other Work on Paper", // n = 107,768
  "Mixed Media", // n = 35,342
  "Design/Decorative Art", // n = 17,607
  "Installation", // n = 9,850
  "Textile Arts", // n = 7,118
  "Video/Film/Animation", // n = 3,930
  "Other", // n = 3,798
  "Ephemera or Merchandise", // n = 2,766
  "Jewelry", // n = 1,966
  "Books and Portfolios", // n = 1,484
  "Reproduction", // n = 1,425
  "Posters", // n = 1,274
  // "Fashion Design and Wearable Art", // n = 685
  // "Performance Art", // n = 169
  // "Architecture", // n = 107
];

CATEGORIES_TO_CONSIDER.map(async (category) => {
  try {
    const analyzer = await ArtworkMaterialsNgramAnalyzer.create({
      // data: "data/sample-1000.json",
      // data: "data/sample-100000.json",
      data: "data/production-published-artworks-20210208.json",
      category: category,
      stem: false,
    });

    console.log(
      chalk.redBright.bold(
        category
          ? `\nAnalyzing ${category} artworks...`
          : `Analyzing all artworks`
      )
    );

    const path = getPathPrefix(category);

    // e.g. ngram must appear in ~1% of all documents minimum
    // const minFrequency = Math.round(0.01 * analyzer.numDocuments)
    const minFrequency = Math.round(0.01 * analyzer.numDocuments)

    const unigrams = analyzer.getTopUnigrams(minFrequency);
    const unigramsWithAat = await matchNgramsToAatSubjects(unigrams);
    writeCSV(unigramsWithAat, `${path}-1grams.csv`, { length: 1, category });
    displaySummary(unigrams);

    const bigrams = analyzer.getTopBigrams(minFrequency);
    const bigramsWithAat = await matchNgramsToAatSubjects(bigrams);
    writeCSV(bigramsWithAat, `${path}-2grams.csv`, { length: 2, category });
    displaySummary(bigrams);

    const trigrams = analyzer.getTopTrigrams(minFrequency);
    const trigramsWithAat = await matchNgramsToAatSubjects(trigrams);
    writeCSV(trigramsWithAat, `${path}-3grams.csv`, { length: 3, category });
    displaySummary(trigrams);

    const tetragrams = analyzer.getTopTetragrams(minFrequency);
    const tetragramsWithAat = await matchNgramsToAatSubjects(tetragrams);
    writeCSV(tetragramsWithAat, `${path}-4grams.csv`, { length: 4, category });
    displaySummary(tetragrams);

    // const topNgrams = analyzer.getTopNgrams(1, 0.8);
    // displaySummary(topNgrams);
  } catch (error) {
    console.error("Uh oh", error);
  }
});

const getPathPrefix = (category) => {
  const firstWord = category ? category.split(/\W+/)[0].toLowerCase() : "all";
  return `out/${firstWord}`;
};

const writeCSV = (
  data: NgramWithAatMatch[],
  path: string,
  extras: Record<string, unknown>
) => {
  const extraHeaders = Object.keys(extras).map((k) => ({ id: k, title: k }));

  const csvWriter = createObjectCsvWriter({
    path,
    header: [
      ...extraHeaders,
      { id: "ngram", title: "ngram" },
      { id: "frequency", title: "frequency" },
      { id: "aatId", title: "aat_id" },
      { id: "aatName", title: "aat_name" },
      { id: "facetName", title: "facet_name" },
      { id: "recordType", title: "record_type" },
      { id: "matchQuality", title: "match_quality" },
    ],
  });

  const dataWithExtras = data.map(([ngram, aat]) => ({ ...extras, ...ngram, ...aat }));

  csvWriter
    .writeRecords(dataWithExtras)
    .then(() => console.log(chalk.magenta(`Wrote ${path}`)));
};

const displaySummary = (ngrams: NgramFrequency[]) => {
  console.log(chalk.blue.bold("Previewing top 10..."));
  console.log(
    chalk.blue(
      "• " +
        ngrams
          .map((nf) => nf.ngram)
          .slice(0, 10)
          .join("\n• ")
    ),
    "\n"
  );
};
