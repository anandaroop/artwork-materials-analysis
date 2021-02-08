# Artwork Materials Analysis

This contains a Javascript implementation of an n-gram analyzer for artwork material descriptions

The purpose is to detect the most frequent words and phrases pertaining to materials, based on the entire corpus of material descriptions, and without any domain-specific foreknowledge.

In other words, how can we come to know that in the description *“Oil and gold composite on canvas”* the important terms are `oil`, `gold` and `canvas`?

N-gram analysis allows us to pluck out the most frequent words, two-word phrases, three-word phrases, and so on, in the hopes that this tells us something about the most imporant terms.

Once we have these lists, we can apply our judgement to determine which ones are worth recognizing as important terms in the materials vocabulary.

Here is a sample run, restricted to the category of **Photography**:

![run2](https://user-images.githubusercontent.com/140521/107275295-8dc59a00-6a1f-11eb-91f1-c1600f676ec4.gif)

From this we can make an educated guess that some important photography-related materials terms are:

- c print
- chromogenic print
- inkjet print
- archival pigment print
- gelatin silver print
- silver gelatin print
