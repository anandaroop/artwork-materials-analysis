#! /usr/bin/env ruby

require 'csv'
require 'ostruct'
require 'json'

rows = CSV.parse(File.open("./combined.csv"), headers: true)

found = []

# byebug

puts [*rows.headers, "category_freqs", "max_freq", "score"].to_csv
rows.each do |nf|
  if nf['aat_id']
    next if found.include? nf['aat_id']

    # group and count
    sames = rows.select{ |n| n['aat_id'] == nf['aat_id']}
    category_freqs = Hash[sames.map{ |n| [n['category'], n['frequency'].to_i]}]
    nf['category_freqs'] = category_freqs.to_json
    max_freq = category_freqs[nil] || category_freqs.values.max
    nf['max_freq'] = max_freq

    # score
    matchType = nf.values_at("facet_name", "record_type", "match_quality").join(" ")
    nf['score'] = if matchType == "Materials Concept exact"
      2
    else
      1
    end

    found.push(nf['aat_id'])
  end
  nf['category_freqs'] ||= "{}"
  nf['max_freq'] ||= nf['frequency']
  nf['score'] ||= 0

  puts nf.to_csv
end
