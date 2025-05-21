/**
 * Service for checking plagiarism against Wikipedia and other sources
 */

import { toast } from '@/components/ui/use-toast';

// Types
interface WikiSearchResult {
  title: string;
  snippet: string;
  pageid: number;
}

interface WikiExtractResult {
  extract: string;
  title: string;
  pageid: number;
}

interface PlagiarismMatch {
  source: string;
  similarity: number;
  matchedText: string;
  sourceText: string;
  sourceUrl?: string;
}

interface PlagiarismResult {
  overallSimilarity: number;
  matches: PlagiarismMatch[];
}

/**
 * Main function to check plagiarism against Wikipedia
 */
export const checkPlagiarism = async (text: string): Promise<PlagiarismResult> => {
  try {
    // Step 1: Extract key phrases and search Wikipedia
    const searchTerms = extractSearchTerms(text);
    console.log("Searching for terms:", searchTerms);

    // Step 2: Get Wikipedia search results for these terms
    const searchResults = await Promise.all(
      searchTerms.map(term => searchWikipedia(term))
    );
    
    // Flatten results and remove duplicates
    const flatResults = searchResults
      .flat()
      .filter((result, index, self) => 
        index === self.findIndex(r => r.pageid === result.pageid)
      )
      .slice(0, 8); // Increased from 5 to 8 for better coverage
    
    console.log(`Found ${flatResults.length} potential Wikipedia articles`);
    
    // Step 3: Get full content of these articles
    const articleContents = await Promise.all(
      flatResults.map(result => getWikipediaContent(result.pageid, result.title))
    );

    // Step 4: Compare text with article contents to find similarities
    const matches: PlagiarismMatch[] = [];
    
    articleContents.forEach(article => {
      if (!article || !article.extract) return;
      
      // Enhanced analysis by checking the full text against each article
      const similarityResults = findAllSimilarities(text, article.extract);
      
      if (similarityResults.overallSimilarity > 10) { // Only include if at least 10% similar
        similarityResults.matches.forEach(match => {
          matches.push({
            source: article.title,
            similarity: match.similarity,
            matchedText: match.matchedText,
            sourceText: article.extract.substring(
              Math.max(0, match.sourceIndex - 50),
              Math.min(article.extract.length, match.sourceIndex + match.matchedText.length + 50)
            ),
            sourceUrl: `https://en.wikipedia.org/wiki/${article.title.replace(/ /g, '_')}`
          });
        });
      }
    });

    // Sort matches by similarity (highest first)
    matches.sort((a, b) => b.similarity - a.similarity);
    
    // Calculate overall similarity score
    const overallSimilarity = calculateOverallSimilarity(matches);

    return {
      overallSimilarity,
      matches
    };
  } catch (error) {
    console.error("Error in plagiarism check:", error);
    toast({
      title: "Error checking plagiarism",
      description: "Something went wrong. Please try again.",
      variant: "destructive",
    });
    throw error;
  }
};

/**
 * Extract key search terms from the text
 */
const extractSearchTerms = (text: string): string[] => {
  // Get unique sentences and chunks of the text
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 15 && s.split(' ').length > 5);
  
  // For more thorough analysis, extract more chunks
  if (sentences.length > 5) {
    // Take samples throughout the text for better coverage
    const sampledSentences = [
      sentences[0], 
      sentences[Math.floor(sentences.length * 0.25)],
      sentences[Math.floor(sentences.length * 0.5)],
      sentences[Math.floor(sentences.length * 0.75)],
      sentences[sentences.length - 1]
    ];
    
    return sampledSentences.filter((s, i, arr) => 
      // Filter out duplicates
      arr.indexOf(s) === i
    );
  } else if (sentences.length > 0) {
    return sentences;
  }
  
  // If text doesn't have complete sentences, chunk it
  const textLength = text.length;
  if (textLength > 200) {
    return [
      text.substring(0, 100),
      text.substring(textLength / 2 - 50, textLength / 2 + 50),
      text.substring(textLength - 100)
    ];
  }
  
  return [text];
};

/**
 * Search Wikipedia for potential matches
 */
const searchWikipedia = async (searchTerm: string): Promise<WikiSearchResult[]> => {
  try {
    const query = encodeURIComponent(searchTerm);
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${query}&format=json&origin=*&srlimit=5`
    );
    
    if (!response.ok) throw new Error('Wikipedia API search failed');
    
    const data = await response.json();
    return data.query.search.map((result: any) => ({
      title: result.title,
      snippet: result.snippet,
      pageid: result.pageid
    }));
  } catch (error) {
    console.error("Error searching Wikipedia:", error);
    return [];
  }
};

/**
 * Get full content of a Wikipedia article
 */
const getWikipediaContent = async (pageId: number, title: string): Promise<WikiExtractResult | null> => {
  try {
    const encodedTitle = encodeURIComponent(title);
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodedTitle}&format=json&origin=*`
    );
    
    if (!response.ok) throw new Error('Wikipedia API content fetch failed');
    
    const data = await response.json();
    const pages = data.query.pages;
    const pageData = pages[pageId];
    
    if (!pageData || !pageData.extract) return null;
    
    return {
      title: pageData.title,
      extract: pageData.extract,
      pageid: pageId
    };
  } catch (error) {
    console.error("Error getting Wikipedia content:", error);
    return null;
  }
};

/**
 * Find all similarities between the original text and a potential source
 * Returns multiple matches with their locations
 */
const findAllSimilarities = (originalText: string, sourceText: string): { 
  overallSimilarity: number, 
  matches: Array<{similarity: number, matchedText: string, originalIndex: number, sourceIndex: number}>
} => {
  // Normalize texts for comparison
  const normalizeText = (text: string) => {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };
  
  const normalizedOriginal = normalizeText(originalText);
  const normalizedSource = normalizeText(sourceText);
  
  const originalWords = normalizedOriginal.split(' ');
  const sourceWords = normalizedSource.split(' ');
  
  const matches = [];
  const coveredRanges = [];
  
  // Find significant matches with length >= 4 words
  for (let windowSize = Math.min(15, originalWords.length); windowSize >= 4; windowSize--) {
    for (let i = 0; i <= originalWords.length - windowSize; i++) {
      // Skip if this range is already covered by a previous match
      if (coveredRanges.some(range => i >= range.start && i <= range.end)) continue;
      
      const phrase = originalWords.slice(i, i + windowSize).join(' ');
      const sourceIndex = normalizedSource.indexOf(phrase);
      
      if (sourceIndex >= 0) {
        // Found a match, try to extend it
        let extendedMatch = phrase;
        let originalEnd = i + windowSize;
        let sourceEnd = sourceIndex + phrase.length;
        
        // Extend forward
        while (originalEnd < originalWords.length &&
               sourceEnd < normalizedSource.length &&
               originalWords[originalEnd] === sourceWords[sourceEnd]) {
          extendedMatch += ' ' + originalWords[originalEnd];
          originalEnd++;
          sourceEnd++;
        }
        
        // Calculate match details
        const matchLength = extendedMatch.split(' ').length;
        const similarityScore = (matchLength / originalWords.length) * 100;
        
        // Find the actual text in the original (preserving case)
        const originalPhraseIndex = originalText.toLowerCase().indexOf(extendedMatch.toLowerCase());
        let actualMatchedText = '';
        if (originalPhraseIndex >= 0) {
          actualMatchedText = originalText.substring(
            originalPhraseIndex,
            originalPhraseIndex + extendedMatch.length + 20
          );
        } else {
          actualMatchedText = extendedMatch;
        }
        
        // Add to matches if significant enough (adjust threshold as needed)
        if (similarityScore > 5) {
          matches.push({
            similarity: similarityScore,
            matchedText: actualMatchedText,
            originalIndex: originalPhraseIndex,
            sourceIndex
          });
          
          // Mark this range as covered
          coveredRanges.push({
            start: i,
            end: originalEnd - 1
          });
        }
      }
    }
  }
  
  // Calculate combined similarity
  const totalCoverage = coveredRanges.reduce((total, range) => {
    return total + (range.end - range.start + 1);
  }, 0);
  
  const overallSimilarity = Math.min(
    (totalCoverage / originalWords.length) * 100,
    100
  );
  
  return {
    overallSimilarity,
    matches: matches.sort((a, b) => b.similarity - a.similarity)
  };
};

/**
 * Legacy function - keep for backwards compatibility
 */
const findSimilarities = (originalText: string, sourceText: string): { similarity: number, matchedText: string } => {
  const results = findAllSimilarities(originalText, sourceText);
  return {
    similarity: results.overallSimilarity,
    matchedText: results.matches.length > 0 ? results.matches[0].matchedText : ""
  };
};

/**
 * Calculate overall similarity score based on matches
 */
const calculateOverallSimilarity = (matches: PlagiarismMatch[]): number => {
  if (matches.length === 0) return 0;
  
  // Weight by the strength of each match and consider the number of matches
  const totalSimilarity = matches.reduce((sum, match) => sum + match.similarity, 0);
  
  // Calculate weighted average with diminishing returns for many small matches
  return Math.min(
    Math.sqrt(totalSimilarity * Math.min(matches.length, 5)) * 0.8, 
    100
  );
};
