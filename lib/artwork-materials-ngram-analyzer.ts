import { createReadStream } from "fs";
import { parse } from "ndjson";
import { Artwork, Document, NGram, NgramFrequency, NgramTally } from "../types";
import { NGrams, PorterStemmer, WordTokenizer } from "natural";
import { exec } from "child_process";
import { toPairs, sortBy, reverse } from "lodash";
import * as chalk from "chalk";
import * as _ from "lodash";

interface Options {
  /** Path to a newline-delimited JSON file containing artwork documents */
  data: string;

  /** Optionally, limit artwork documents to a specific category (aka medium type) */
  category?: string;

  /** Should the token streams be Porter-stemmed before n-gram analysis is performed? */
  stem?: boolean;
}

/**
 * ArtworkMaterialsNgramAnalyzer can read a collection of artwork documents
 * and produce the most common phrases present in their material descriptions.
 *
 * It does so by performing n-gram analysis on the combined artwork materials corpus.
 *
 * Optionally it can:
 *
 * - apply Porter stemming when tokenizing the materials descriptions
 *
 * - restrict itself to a particular category in order to produce
 *   category-specific vocabularies
 *
 * Example usage:
 *
 * ```js
 * // Use the factory method to create an analyzer instance
 * const analyzer = await ArtworkMaterialsNgramAnalyzer.create({
 *   data: "data/artworks.json",
 *   category: "Sculpture"
 * });
 *
 * // Get the top bigrams (by default covering 80% of all occurences)
 * console.log(analyzer.getTopBigrams())
 *
 * // Get the top n-grams of any size, and covering any threshold, e.g. 25%
 * console.log(analyzer.getTopNgrams(3, 0.25))
 * ```
 */
class ArtworkMaterialsNgramAnalyzer {
  private pathToData: string;
  private category: string;
  private shouldStem: boolean;
  private tokenizer = new WordTokenizer();
  private tokenizedDocuments: string[][] = [];
  public numDocuments: number;

  /**
   * Static factory method to instantiate and return an analyzer that is ready to use
   */
  static create = (
    options: Options
  ): Promise<ArtworkMaterialsNgramAnalyzer> => {
    return new Promise(async (resolve, reject) => {
      try {
        const analyzer = new ArtworkMaterialsNgramAnalyzer(options);
        await analyzer.load();
        console.log(
          chalk.gray(
            `\nReturning ${options.category} analyzer with ${analyzer.tokenizedDocuments.length} documents`
          )
        );
        resolve(analyzer);
      } catch (error) {
        reject(error);
      }
    });
  };

  // accessed via factory method only
  private constructor(options: Options) {
    this.pathToData = options.data;
    this.category = options.category;
    this.shouldStem = options.stem ?? false;
  }

  // accessed via factory method only
  private load = () => {
    return new Promise(async (resolve, reject) => {
      try {
        const artworksCount = await this.getLineCount();
        const progressBar = this.getProgressBar({ total: artworksCount });
        console.log("Loading...");

        createReadStream(this.pathToData)
          // stream newline-delimited json to ndjson.parse()
          .pipe(parse())

          //  when a complete artwork object is received, process it
          .on("data", (artwork: Artwork) => {
            const isUseable =
              artwork.medium &&
              (!this.category || artwork.category === this.category);
            if (isUseable) {
              const tokens = this.getTokensFromArtwork(artwork);
              this.tokenizedDocuments.push(tokens);
            }
            progressBar.tick();
          })

          // when done reading data, resolve the promise
          .on("end", () => {
            this.numDocuments = this.tokenizedDocuments.length;
            resolve(this);
          });
      } catch (error) {
        reject(error);
      }
    });
  };

  /** Convenience method to get top 1-grams */
  getTopUnigrams = (minFrequency?: number): NgramFrequency[] => {
    return this.getTopNgrams(1, minFrequency ?? 0);
  };

  /** Convenience method to get top 2-grams */
  getTopBigrams = (minFrequency?: number): NgramFrequency[] => {
    return this.getTopNgrams(2, minFrequency ?? 0);
  };

  /** Convenience method to get top 3-grams */
  getTopTrigrams = (minFrequency?: number): NgramFrequency[] => {
    return this.getTopNgrams(3, minFrequency ?? 0);
  };

  /** Convenience method to get top 4-grams */
  getTopTetragrams = (minFrequency?: number): NgramFrequency[] => {
    return this.getTopNgrams(4, minFrequency ?? 0);
  };

  /**
   * Get the top n-grams that occur more often than some threshold
   *
   * Example: To find all bigrams that are present 100 or times in the corpus
   *
   * ```javascript
   * analyzer.getTopNgrams(2, 100)
   * ```
   *
   * @param {number} n How many words should each n-gram consist of?
   * @param {number} minFrequency How many times does this n-gram need to occur?
   */
  getTopNgrams = (n: number, minFrequency: number): NgramFrequency[] => {
    console.log(
      chalk.bold(
        [
          `\nSeeking n-grams`,
          `of ${highlight(`length ${n}`)}`,
          `in ${highlight(this.category || "all")} occurrences`,
          `occurring ${highlight(minFrequency)} or more times`,
        ].join(" ")
      )
    );

    const allNgrams: NGram[] = this.getAllNgrams(n);
    const totalNgramCount = allNgrams.length;
    console.log(
      chalk.gray(
        `Found ${totalNgramCount} total n-grams of length ${n} in ${this.tokenizedDocuments.length} documents`
      )
    );

    const tally: NgramTally = this.getTallyOfNgrams(allNgrams);
    const uniqueNgramCount = Object.keys(tally).length;
    console.log(chalk.gray(`Found ${uniqueNgramCount} unique n-grams`));

    const sortedNgramFrequencies = this.getSortedNgramFrequencies(tally);
    const topNgramFrequencies = sortedNgramFrequencies.filter(nf => nf.frequency >= minFrequency)
    const topNgramCount = topNgramFrequencies.length;
    console.log(chalk.gray(`Returning the ${topNgramCount} n-grams with a frequency >${minFrequency}`));

    return topNgramFrequencies;
  };

  private getAllNgrams = (n: number): NGram[] => {
    const allNgrams: NGram[] = [];
    this.tokenizedDocuments.forEach((document: Document) => {
      NGrams.ngrams(document, n).forEach((ngram: NGram) => {
        allNgrams.push(ngram);
      });
    });
    return allNgrams;
  };

  private getTallyOfNgrams = (ngrams: NGram[]): NgramTally => {
    let tally: NgramTally = {};
    ngrams.forEach((ngram) => {
      const ngramString: string = ngram.join(" ");
      tally[ngramString] = tally[ngramString] ? tally[ngramString] + 1 : 1;
    });
    return tally;
  };

  private getSortedNgramFrequencies = (tally: NgramTally): NgramFrequency[] => {
    const frequencies = toPairs(tally).map(([ngram, count]) => ({
      ngram: ngram,
      frequency: count,
    }));
    return reverse(sortBy(frequencies, "frequency"));
  };

  private getLineCount = (): Promise<number> => {
    return new Promise((resolve, reject) => {
      exec(`wc ${this.pathToData}`, function (error, results) {
        if (error) return reject(error);

        try {
          const [lines, _words, _characters] = results.trim().split(/\s+/);
          const lineCount = parseInt(lines);
          resolve(lineCount);
        } catch (error) {
          reject(error);
        }
      });
    });
  };

  private getProgressBar = (options): ProgressBar => {
    const ProgressBar = require("progress");
    const bar = new ProgressBar(":bar :current/:total artworks (:percent)", {
      ...options,
      width: 40,
    });
    return bar;
  };

  private getTokensFromArtwork = (artwork: Artwork): string[] => {
    const materialsDescription = artwork.medium.toLowerCase();
    let tokens = this.tokenizer.tokenize(materialsDescription);
    if (this.shouldStem) {
      tokens = tokens.map(PorterStemmer.stem);
    }
    return tokens;
  };
}

const highlight = chalk.bgHsl(60, 100, 80);

export default ArtworkMaterialsNgramAnalyzer;
