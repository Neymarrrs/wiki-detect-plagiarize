
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
      .slice(0, 5); // Limit to 5 top results for efficiency
    
    console.log(`Found ${flatResults.length} potential Wikipedia articles`);
    
    // Step 3: Get full content of these articles
    const articleContents = await Promise.all(
      flatResults.map(result => getWikipediaContent(result.pageid, result.title))
    );

    // Step 4: Compare text with article contents to find similarities
    const matches: PlagiarismMatch[] = [];
    
    articleContents.forEach(article => {
      if (!article || !article.extract) return;
      
      const similarityResult = findSimilarities(text, article.extract);
      
      if (similarityResult.similarity > 10) { // Only include if at least 10% similar
        matches.push({
          source: article.title,
          similarity: similarityResult.similarity,
          matchedText: similarityResult.matchedText,
          sourceText: article.extract.substring(0, 200) + "...",
          sourceUrl: `https://en.wikipedia.org/wiki/${article.title.replace(/ /g, '_')}`
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
  // Get unique sentences and phrases
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 15 && s.split(' ').length > 5);
  
  // If we have a long text, extract smaller chunks to search
  if (sentences.length > 3) {
    // Choose a representative sample of sentences
    return [
      sentences[0], 
      sentences[Math.floor(sentences.length / 2)],
      sentences[sentences.length - 1]
    ];
  }
  
  return sentences.length > 0 ? sentences : [text.substring(0, 100)];
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
 * Find similarities between the original text and a potential source
 */
const findSimilarities = (originalText: string, sourceText: string): { similarity: number, matchedText: string } => {
  // Normalize texts for comparison
  const normalizeText = (text: string) => {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };
  
  const normalizedOriginal = normalizeText(originalText);
  const normalizedSource = normalizeText(sourceText);
  
  // Look for matching phrases (at least 5 words long)
  const originalWords = normalizedOriginal.split(' ');
  const sourceWords = normalizedSource.split(' ');
  
  let longestMatch = '';
  let matchPosition = -1;
  
  // Sliding window approach to find matching phrases
  for (let windowSize = 10; windowSize >= 5; windowSize--) {
    if (longestMatch.length > 0) break;
    
    for (let i = 0; i <= originalWords.length - windowSize; i++) {
      const phrase = originalWords.slice(i, i + windowSize).join(' ');
      if (normalizedSource.includes(phrase)) {
        longestMatch = phrase;
        matchPosition = i;
        break;
      }
    }
  }
  
  // If we found a significant match, extend it as far as possible
  let extendedMatch = longestMatch;
  
  if (matchPosition >= 0) {
    // Try to extend the match forward
    let forwardPos = matchPosition + extendedMatch.split(' ').length;
    let sourcePos = normalizedSource.indexOf(extendedMatch) + extendedMatch.length;
    
    while (forwardPos < originalWords.length && 
           sourcePos < normalizedSource.length && 
           originalWords[forwardPos].toLowerCase() === normalizedSource.substring(sourcePos, sourcePos + originalWords[forwardPos].length).toLowerCase()) {
      extendedMatch += ' ' + originalWords[forwardPos];
      forwardPos++;
      sourcePos += originalWords[forwardPos-1].length + 1;
    }
    
    // Try to extend the match backward
    let backwardPos = matchPosition - 1;
    let sourceStartPos = normalizedSource.indexOf(longestMatch) - 1;
    
    while (backwardPos >= 0 && 
           sourceStartPos >= 0 && 
           originalWords[backwardPos].toLowerCase() === normalizedSource.substring(sourceStartPos - originalWords[backwardPos].length, sourceStartPos).toLowerCase()) {
      extendedMatch = originalWords[backwardPos] + ' ' + extendedMatch;
      backwardPos--;
      sourceStartPos -= originalWords[backwardPos+1].length + 1;
    }
  }
  
  // Calculate similarity percentage
  const similarity = extendedMatch.length > 0 
    ? (extendedMatch.split(' ').length / originalWords.length) * 100
    : 0;
  
  // Get the actual matched text from the original (preserving case, etc.)
  let matchedText = "";
  if (matchPosition >= 0) {
    const startIndex = originalText.toLowerCase().indexOf(extendedMatch.toLowerCase());
    if (startIndex >= 0) {
      matchedText = originalText.substring(startIndex, startIndex + extendedMatch.length + 20);
    } else {
      matchedText = extendedMatch; // Fallback
    }
  }
  
  return {
    similarity: Math.min(similarity, 100), // Cap at 100%
    matchedText: matchedText || extendedMatch
  };
};

/**
 * Calculate overall similarity score based on matches
 */
const calculateOverallSimilarity = (matches: PlagiarismMatch[]): number => {
  if (matches.length === 0) return 0;
  
  // Weight by the strength of each match
  const totalSimilarity = matches.reduce((sum, match) => sum + match.similarity, 0);
  
  // Calculate weighted average, but cap to ensure we don't exceed 100%
  return Math.min(
    Math.sqrt(totalSimilarity * matches.length) * 0.8, 
    100
  );
};
