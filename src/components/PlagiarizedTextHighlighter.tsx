
import React from 'react';

interface Match {
  matchedText: string;
  similarity: number;
  source: string;
}

interface PlagiarizedTextHighlighterProps {
  originalText: string;
  matches: Match[];
}

const PlagiarizedTextHighlighter: React.FC<PlagiarizedTextHighlighterProps> = ({ originalText, matches }) => {
  // Function to safely escape regex special characters
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Create an array of text spans with highlighting
  const renderHighlightedText = () => {
    if (!matches || matches.length === 0) return originalText;

    let result = originalText;
    let highlightedParts: JSX.Element[] = [];
    
    // Sort matches by length (descending) to prioritize longer matches
    const sortedMatches = [...matches].sort((a, b) => 
      b.matchedText.length - a.matchedText.length
    );
    
    // Create an array to track which parts of text are already highlighted
    const highlightedRanges: Array<{start: number, end: number}> = [];
    
    // For each match, find positions in original text and mark for highlighting
    sortedMatches.forEach(match => {
      const matchText = escapeRegExp(match.matchedText);
      const regex = new RegExp(matchText, 'gi');
      let execResult;
      
      while ((execResult = regex.exec(result)) !== null) {
        const start = execResult.index;
        const end = start + match.matchedText.length;
        
        // Check if this range overlaps with any existing highlights
        const overlapping = highlightedRanges.some(range => 
          (start >= range.start && start < range.end) || 
          (end > range.start && end <= range.end) ||
          (start <= range.start && end >= range.end)
        );
        
        if (!overlapping) {
          highlightedRanges.push({ start, end });
        }
      }
    });
    
    // Sort ranges by start position
    highlightedRanges.sort((a, b) => a.start - b.start);
    
    // Build the resulting JSX with highlighted spans
    let lastPos = 0;
    highlightedRanges.forEach((range, i) => {
      // Add non-highlighted text before this range
      if (range.start > lastPos) {
        highlightedParts.push(
          <span key={`text-${i}`}>{result.substring(lastPos, range.start)}</span>
        );
      }
      
      // Add highlighted text
      highlightedParts.push(
        <span 
          key={`highlight-${i}`}
          className="bg-yellow-200 text-gray-900 px-1 rounded"
          title="Potential plagiarism detected"
        >
          {result.substring(range.start, range.end)}
        </span>
      );
      
      lastPos = range.end;
    });
    
    // Add any remaining text
    if (lastPos < result.length) {
      highlightedParts.push(
        <span key="text-end">{result.substring(lastPos)}</span>
      );
    }
    
    return <div>{highlightedParts}</div>;
  };

  return (
    <div className="text-gray-800 whitespace-pre-wrap break-words">
      {renderHighlightedText()}
    </div>
  );
};

export default PlagiarizedTextHighlighter;
