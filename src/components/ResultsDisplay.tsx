
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import PlagiarizedTextHighlighter from './PlagiarizedTextHighlighter';

interface ResultsDisplayProps {
  results: {
    overallSimilarity: number;
    matches: Array<{
      source: string;
      similarity: number;
      matchedText: string;
      sourceText: string;
      sourceUrl?: string;
    }>;
  };
  originalText: string;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results, originalText }) => {
  const getSimilarityColor = (similarity: number) => {
    if (similarity < 20) return "bg-green-100 text-green-800";
    if (similarity < 40) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getSeverityLevel = (similarity: number) => {
    if (similarity < 20) return "Low";
    if (similarity < 40) return "Moderate";
    return "High";
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-semibold">Plagiarism Detection Results</h3>
          <p className="text-sm text-gray-500">
            {results.matches.length} potential source{results.matches.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Overall Similarity:</span>
          <Badge className={`text-md px-3 py-1 ${getSimilarityColor(results.overallSimilarity)}`}>
            {results.overallSimilarity.toFixed(1)}%
          </Badge>
          <Badge variant="outline">
            {getSeverityLevel(results.overallSimilarity)} Risk
          </Badge>
        </div>
      </div>

      <Card className="overflow-hidden border border-gray-200">
        <CardHeader className="bg-gray-50 py-3">
          <CardTitle className="text-lg">Your Text with Highlighted Matches</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ScrollArea className="h-[200px]">
            <PlagiarizedTextHighlighter 
              originalText={originalText} 
              matches={results.matches}
            />
          </ScrollArea>
        </CardContent>
      </Card>

      <h3 className="text-lg font-semibold mt-6">Matched Sources</h3>
      
      <div className="space-y-4">
        {results.matches.map((match, index) => (
          <Card key={index} className="overflow-hidden border border-gray-200">
            <CardHeader className="bg-gray-50 py-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-md font-medium">Source: {match.source}</CardTitle>
              </div>
              <Badge className={`${getSimilarityColor(match.similarity)}`}>
                {match.similarity.toFixed(1)}% Match
              </Badge>
            </CardHeader>
            <CardContent className="p-4">
              <div className="text-sm">
                <p className="font-medium mb-2">Matched content:</p>
                <div className="bg-gray-50 p-3 rounded-md border border-gray-200 mb-4">
                  <p className="italic text-gray-700">"{match.matchedText}..."</p>
                </div>
                
                {match.sourceUrl && (
                  <>
                    <p className="font-medium mb-2">Source:</p>
                    <a href={match.sourceUrl} target="_blank" rel="noopener noreferrer" 
                       className="text-blue-600 hover:underline break-all">
                      {match.sourceUrl}
                    </a>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator className="my-4" />
      
      <div className="text-sm text-gray-500 italic">
        <p>Note: This plagiarism check compares your text against Wikipedia articles and other online sources.
           Results should be verified manually for academic submissions.</p>
      </div>
    </div>
  );
};

export default ResultsDisplay;
