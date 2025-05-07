import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Question {
  id: string;
  text: string;
  difficulty: string;
  visited: boolean;
}

interface Category {
  id: string;
  name: string;
  questions: Question[];
}

interface Game {
  _id: string;
  name: string;
  categories: Category[];
  createdAt: string;
}

// Utility functions for localStorage persistence
const getPersistedGame = (gameId: string) => {
  const data = localStorage.getItem(`visitedState_${gameId}`);
  return data ? JSON.parse(data) : null;
};
const setPersistedGame = (gameId: string, gameData: Game) => {
  localStorage.setItem(`visitedState_${gameId}`, JSON.stringify(gameData));
};
const clearPersistedGame = (gameId: string) => {
  localStorage.removeItem(`visitedState_${gameId}`);
};

export default function PlayGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [game, setGame] = useState<Game | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [showQuestion, setShowQuestion] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!location.state?.game) {
      toast({
        title: "Error",
        description: "No game selected",
        variant: "destructive"
      });
      navigate('/admin');
      return;
    }
    // Try to load persisted visited state
    const persisted = getPersistedGame(location.state.game._id);
    if (persisted) {
      setGame(persisted);
    } else {
      setGame(location.state.game);
    }
  }, [location.state, navigate, toast]);

  const handleSelectCategoryDifficulty = (categoryId: string, difficulty: string) => {
    const category = game?.categories.find(c => c.id === categoryId);
    if (category) {
      setSelectedCategory(category);
      setSelectedDifficulty(difficulty);
    }
  };

  const handleSelectQuestion = (question: Question) => {
    if (question.visited) return;
    const updatedGame = {
      ...game!,
      categories: game!.categories.map(category => ({
        ...category,
        questions: category.questions.map(q => 
          q.id === question.id ? { ...q, visited: true } : q
        )
      }))
    };
    setGame(updatedGame);
    setPersistedGame(game!._id, updatedGame);
    setSelectedQuestion({ ...question, visited: true });
    setShowQuestion(true);
  };

  const handleBack = () => {
    setShowQuestion(false);
    setSelectedQuestion(null);
    setSelectedDifficulty(null);
    setSelectedCategory(null);
  };

  const handleRestartGame = () => {
    if (!game) return;
    const updatedGame = {
      ...game,
      categories: game.categories.map(category => ({
        ...category,
        questions: category.questions.map(question => ({
          ...question,
          visited: false
        }))
      }))
    };
    setGame(updatedGame);
    clearPersistedGame(game._id);
    setSelectedCategory(null);
    setSelectedDifficulty(null);
    setSelectedQuestion(null);
    setShowQuestion(false);
    toast({
      title: "Game Restarted",
      description: "All questions have been reset",
    });
  };

  const handleDeleteGame = async () => {
    if (!game) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      const response = await fetch(`http://localhost:3000/api/games/${game._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        toast({
          title: "Success",
          description: "Game deleted successfully",
        });
        clearPersistedGame(game._id);
        navigate('/admin/dashboard');
      } else {
        throw new Error(data.message || 'Failed to delete game');
      }
    } catch (error) {
      console.error('Error deleting game:', error);
      toast({
        title: "Error",
        description: "Failed to delete game",
        variant: "destructive"
      });
    }
  };

  const renderGameBoard = () => {
    if (!game) return null;

    return (
      <div className="w-full overflow-x-auto">
        <div className="min-w-max">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Category Headers */}
            {game.categories.slice(0, 5).map(category => (
              <div 
                key={category.id} 
                className="bg-jeopardy-blue border-2 border-jeopardy-gold p-4 text-center relative group"
              >
                <h3 className="text-jeopardy-gold font-jeopardy text-lg md:text-xl uppercase">
                  {category.name}
                </h3>
              </div>
            ))}
            
            {/* Easy Row */}
            {game.categories.slice(0, 5).map(category => (
              <div 
                key={`${category.id}_easy`}
                onClick={() => handleSelectCategoryDifficulty(category.id, 'easy')}
                className="jeopardy-card h-24"
              >
                <span className="font-jeopardy text-xl md:text-2xl">EASY</span>
              </div>
            ))}
            
            {/* Medium Row */}
            {game.categories.slice(0, 5).map(category => (
              <div 
                key={`${category.id}_medium`}
                onClick={() => handleSelectCategoryDifficulty(category.id, 'medium')}
                className="jeopardy-card h-24"
              >
                <span className="font-jeopardy text-xl md:text-2xl">MEDIUM</span>
              </div>
            ))}
            
            {/* Hard Row */}
            {game.categories.slice(0, 5).map(category => (
              <div 
                key={`${category.id}_hard`}
                onClick={() => handleSelectCategoryDifficulty(category.id, 'hard')}
                className="jeopardy-card h-24"
              >
                <span className="font-jeopardy text-xl md:text-2xl">HARD</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderCategoryQuestions = () => {
    if (!game || !selectedCategory || !selectedDifficulty) return null;
    
    const filteredQuestions = selectedCategory.questions.filter(q => q.difficulty === selectedDifficulty);
    
    return (
      <div className="w-full">
        <h2 className="text-3xl font-jeopardy text-jeopardy-gold text-center mb-6">
          {selectedCategory.name} - <span className="capitalize">{selectedDifficulty}</span>
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {filteredQuestions.map((question, index) => (
            <div 
              key={question.id}
              onClick={() => handleSelectQuestion(question)}
              className={`jeopardy-card h-32 ${question.visited ? 'jeopardy-card-visited' : ''}`}
            >
              <span className="font-jeopardy text-3xl">{index + 1}</span>
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <Button 
            onClick={handleBack} 
            className="jeopardy-btn"
          >
            Back to Board
          </Button>
        </div>
      </div>
    );
  };

  const renderQuestionView = () => {
    if (!selectedQuestion) return null;
    
    return (
      <div 
        className="w-full h-full fixed inset-0 bg-black/80 flex items-center justify-center p-4"
        onClick={() => setShowQuestion(false)}
      >
        <Card className="bg-jeopardy-blue border-4 border-jeopardy-gold w-full max-w-2xl">
          <CardContent className="p-8">
            <h3 className="text-2xl text-jeopardy-gold font-jeopardy mb-6 text-center">
              QUESTION
            </h3>
            <p className="text-white text-xl md:text-2xl text-center mb-8">
              {selectedQuestion.text}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderGameTracker = () => {
    if (!game) return null;
    
    return (
      <div className="mt-8 bg-jeopardy-blue/80 border-2 border-jeopardy-gold p-4 rounded-lg">
        <h3 className="text-xl text-jeopardy-gold font-jeopardy mb-4 text-center">
          GAME TRACKER
        </h3>
        
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-max border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-left text-white">Category</th>
                <th className="p-2 text-center text-white">Easy</th>
                <th className="p-2 text-center text-white">Medium</th>
                <th className="p-2 text-center text-white">Hard</th>
              </tr>
            </thead>
            <tbody>
              {game.categories.map(category => {
                const easyVisited = category.questions.filter(q => q.difficulty === 'easy' && q.visited).length;
                const mediumVisited = category.questions.filter(q => q.difficulty === 'medium' && q.visited).length; 
                const hardVisited = category.questions.filter(q => q.difficulty === 'hard' && q.visited).length;
                
                const easyTotal = category.questions.filter(q => q.difficulty === 'easy').length;
                const mediumTotal = category.questions.filter(q => q.difficulty === 'medium').length;
                const hardTotal = category.questions.filter(q => q.difficulty === 'hard').length;
                
                return (
                  <tr key={category.id} className="border-t border-white/20">
                    <td className="p-2 text-left text-jeopardy-gold font-semibold">{category.name}</td>
                    <td className="p-2 text-center text-white">{easyVisited}/{easyTotal}</td>
                    <td className="p-2 text-center text-white">{mediumVisited}/{mediumTotal}</td>
                    <td className="p-2 text-center text-white">{hardVisited}/{hardTotal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-jeopardy-navy to-jeopardy-dark">
        <p className="text-white text-xl">Loading game...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-jeopardy-navy to-jeopardy-dark p-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-jeopardy text-jeopardy-gold">
              {game.name}
            </h1>
            <p className="text-white/60 text-sm">
              Created on {new Date(game.createdAt).toLocaleDateString()}
            </p>
          </div>
          
          <div className="flex gap-4">
            <Button 
              onClick={handleRestartGame}
              className="bg-jeopardy-gold hover:bg-jeopardy-gold/90 text-jeopardy-navy font-bold"
            >
              Restart Game
            </Button>
            <Button 
              onClick={() => setIsDeleteDialogOpen(true)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Game
            </Button>
            <Button 
              onClick={() => navigate('/admin/dashboard')}
              className="bg-transparent border-2 border-white text-white hover:bg-white/10"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>

        <div className="animate-fade-in">
          {!selectedCategory && !selectedDifficulty && renderGameBoard()}
          {selectedCategory && selectedDifficulty && !showQuestion && renderCategoryQuestions()}
          {showQuestion && renderQuestionView()}
          {!selectedCategory && !selectedDifficulty && renderGameTracker()}
        </div>

        {/* Delete Game Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="bg-jeopardy-blue text-white border-2 border-jeopardy-gold">
            <DialogHeader>
              <DialogTitle className="text-jeopardy-gold font-jeopardy text-2xl">Delete Game</DialogTitle>
              <DialogDescription className="text-white/80">
                Are you sure you want to delete this game? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <DialogFooter className="flex justify-between">
              <Button 
                className="bg-transparent border-2 border-white text-white hover:bg-white/10"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteGame}
              >
                Delete Game
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
