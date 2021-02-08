export interface Artwork {
  /** aka materials */
  medium: string;

  /** aka medium type */
  category: string;
}

export type Document = string[];

export type NGram = string[];

export interface NgramTally {
  [ngram: string]: number;
}

export interface NgramFrequency {
  ngram: string;
  frequency: number;
}
