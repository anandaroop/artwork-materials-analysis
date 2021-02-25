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

export interface AatSubject {
  name: string;
  terms: string[];
  facet_name: string;
  record_type: string;
}

export interface Hit<T = {}> {
  _index: string;
  _type: string;
  _id: string;
  _score: number;
  _source: T;
}

export type NgramWithAatMatch = [
  NgramFrequency,
  {
    /** ID of matching AAT Subject record */
    aatId: string;

    /** Preferred term of AAT Subject record */
    aatName: string;
  }
];
