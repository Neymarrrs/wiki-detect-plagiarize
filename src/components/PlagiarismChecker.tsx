
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import ResultsDisplay from './ResultsDisplay';
import { checkPlagiarism } from '@/lib/plagiarismService';

const PlagiarismChecker: React.FC = () => {
  const [text, setText] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!text.trim() || text.trim().length < 50) {
      toast({
        title: "Text too short",
        description: "Please enter at least 50 characters to check for plagiarism.",
        variant: "destructive",
      });
      return;
    }

    setIsChecking(true);
    setResults(null);
    
    try {
      const plagiarismResults = await checkPlagiarism(text);
      setResults(plagiarismResults);
    } catch (error) {
      console.error("Error checking plagiarism:", error);
      toast({
        title: "Error",
        description: "Failed to check plagiarism. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="shadow-lg">
        <CardHeader className="bg-[#0A2463] text-white">
          <CardTitle className="text-2xl md:text-3xl font-bold">Plagiarism Checker</CardTitle>
          <CardDescription className="text-gray-200">
            Check your text against Wikipedia articles and other sources
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <Textarea 
                placeholder="Paste your text here to check for plagiarism (minimum 50 characters)..." 
                className="min-h-[200px] border-gray-300"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={isChecking}
              />
              
              <div className="text-right text-sm text-gray-500">
                {text.length} characters
              </div>
              
              {isChecking && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Checking plagiarism...</span>
                    <span>Please wait</span>
                  </div>
                  <Progress value={45} className="h-2" />
                </div>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="mt-4 bg-[#0A2463] hover:bg-[#061845]" 
              disabled={isChecking || text.length < 50}
            >
              {isChecking ? "Checking..." : "Check Plagiarism"}
            </Button>
          </form>
        </CardContent>
        
        {results && (
          <>
            <Separator />
            <CardFooter className="pt-6 flex flex-col items-start">
              <ResultsDisplay results={results} originalText={text} />
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
};

export default PlagiarismChecker;
