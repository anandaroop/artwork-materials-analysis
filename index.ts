import ArtworkMaterialsNgramAnalyzer from "./lib/artwork-materials-ngram-analyzer";
import { writeFile } from "fs";
import { NgramFrequency } from "./types";
import * as chalk from "chalk";

const CATEGORIES_TO_CONSIDER = [
  /* consider all artworks, across categories */
  null,

  /* consider specific categories too */
  "Painting",
  "Photography",
  "Print",
  "Sculpture",
  "Drawing, Collage or other Work on Paper",
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

    const unigrams = analyzer.getTopUnigrams();
    writeCSV(unigrams, `${path}-1grams.csv`);
    displaySummary(unigrams);

    const bigrams = analyzer.getTopBigrams();
    writeCSV(bigrams, `${path}-2grams.csv`);
    displaySummary(bigrams);

    const trigrams = analyzer.getTopTrigrams();
    writeCSV(trigrams, `${path}-3grams.csv`);
    displaySummary(trigrams);

    const tetragrams = analyzer.getTopTetragrams();
    writeCSV(tetragrams, `${path}-4grams.csv`);
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

const writeCSV = (data: NgramFrequency[], path: string) => {
  const createCsvWriter = require("csv-writer").createObjectCsvWriter;
  const csvWriter = createCsvWriter({
    path,
    header: [
      { id: "ngram", title: "ngram" },
      { id: "frequency", title: "frequency" },
    ],
  });

  csvWriter
    .writeRecords(data)
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
