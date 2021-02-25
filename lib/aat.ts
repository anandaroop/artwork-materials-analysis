import { Client } from "@elastic/elasticsearch";
import { AatSubject, Hit, NgramFrequency, NgramWithAatMatch } from "../types";

const client = new Client({ node: "http://localhost:9200" });

interface matchOptions {
  size?: number;
}

const matchAatSubjects = async (term: string, options?: matchOptions) => {
  try {
    const result = await client.search({
      index: "aatsy_subjects",
      size: options?.size || 3,
      body: {
        query: {
          bool: {
            must: {
              multi_match: {
                query: term,
                fields: ["name^10", "scope_note^5", "terms^3"],
                type: "best_fields",
              },
            },
          },
        },
      },
    });
    if (result.statusCode !== 200) {
      console.error("matchAatSubjects non-200:", result);
    }
    return result.body;
  } catch (error) {
    console.error("matchAatSubjects error:", error);
  }
};

export const findTopHit = async (
  nf: NgramFrequency
): Promise<(Hit<AatSubject> & { matchQuality: string }) | undefined> => {
  const response = await matchAatSubjects(nf.ngram, { size: 5 });
  const hits: Hit<AatSubject>[] = response.hits.hits;

  for (let i = 0; i < hits.length; i++) {
    let hit = hits[i];

    if (getMatchQuality(nf.ngram, hit) === MatchQuality.exact) {
      // console.log(i, "🟢", nf.ngram, "==", hit?._source?.name, hit?._id, hit?._source?.facet_name, hit?._source?.record_type);
      return { ...hit, matchQuality: "exact" };
    } else if (getMatchQuality(nf.ngram, hit) === MatchQuality.synonym) {
      // console.log(i, "🔵", nf.ngram, "≈≈", hit?._source?.name, hit?._id, hit?._source?.facet_name, hit?._source?.record_type);
      return { ...hit, matchQuality: "synonym" };
    } else {
      // console.log(i, "🔴", nf.ngram, "!=", hit?._source?.name, hit?._id, hit?._source?.facet_name, hit?._source?.record_type);
    }
  }
};

export const matchNgramsToAatSubjects = async (
  ngrams: NgramFrequency[]
): Promise<NgramWithAatMatch[]> => {
  const topHitPromises = ngrams.map((ngram) => findTopHit(ngram));
  const topHits = await Promise.all(topHitPromises);

  return topHits.map((hit, i) => {
    const aatMatch = hit && {
      aatName: hit._source.name,
      aatId: hit._id,
      facetName: hit._source.facet_name,
      recordType: hit._source.record_type,
      matchQuality: hit.matchQuality,
    };
    // console.log(ngrams[i], aatMatch)
    return [ngrams[i], aatMatch];
  });
};

enum MatchQuality {
  exact,
  synonym,
  score,
  none,
}

const getMatchQuality = (
  term: string,
  aatHit: Hit<AatSubject>
): MatchQuality | undefined => {
  if (aatHit) {
    const t = normalize(term);
    const aatName = normalize(aatHit._source.name);
    const aatTerms = aatHit._source.terms.map(normalize);

    if (t === aatName) return MatchQuality.exact;
    if (aatTerms.includes(t)) return MatchQuality.synonym;
    return MatchQuality.none;
  }
};

const normalize = (txt: string) => txt.trim().toLowerCase();
