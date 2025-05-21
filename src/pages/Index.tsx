
import PlagiarismChecker from '@/components/PlagiarismChecker';

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="container mx-auto px-4">
        <header className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-[#0A2463] mb-2">
            Plagiarism Checker
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Check your content against Wikipedia and other online sources to detect potential plagiarism
          </p>
        </header>
        
        <PlagiarismChecker />
        
        <footer className="mt-16 text-center text-sm text-gray-500">
          <p>This tool helps detect similarities with Wikipedia articles and other online sources.</p>
          <p className="mt-1">For academic submissions, verify results with official plagiarism detection tools.</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
