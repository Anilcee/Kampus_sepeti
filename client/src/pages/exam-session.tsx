import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { ExamSessionWithExam } from "@shared/schema";

export default function ExamSession() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/sinav/:examId/oturum/:sessionId");
  
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: session, isLoading } = useQuery<ExamSessionWithExam>({
    queryKey: ["/api/exam-sessions", params?.sessionId],
    enabled: !!params?.sessionId && isAuthenticated,
    refetchInterval: false,
  });

  // Initialize answers and timer
  useEffect(() => {
    if (session) {
      const existingAnswers = (session.studentAnswers as Record<string, string>) || {};
      setAnswers(existingAnswers);
      
      // Calculate remaining time
      const startTime = new Date(session.startedAt!).getTime();
      const now = new Date().getTime();
      const elapsed = Math.floor((now - startTime) / 1000);
      const totalTime = session.exam.durationMinutes * 60;
      const remaining = Math.max(0, totalTime - elapsed);
      
      setTimeLeft(remaining);
      
      if (remaining > 0 && session.status === "started") {
        intervalRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              handleTimeUp();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [session]);

  const saveAnswersMutation = useMutation({
    mutationFn: async (answers: Record<string, string>) => {
      return await apiRequest("PUT", `/api/exam-sessions/${params?.sessionId}/answers`, {
        answers,
      });
    },
  });

  const submitExamMutation = useMutation({
    mutationFn: async (answers: Record<string, string>) => {
      return await apiRequest("POST", `/api/exam-sessions/${params?.sessionId}/submit`, {
        studentAnswers: answers,
      });
    },
    onSuccess: (result) => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      navigate(`/sinav/sonuclar/${params?.sessionId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error?.message || "Sınav teslim edilirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  const handleAnswerChange = (questionNum: string, answer: string) => {
    const newAnswers = { ...answers, [questionNum]: answer };
    setAnswers(newAnswers);
    
    // Auto-save answers every few seconds
    saveAnswersMutation.mutate(newAnswers);
  };

  const handleTimeUp = () => {
    toast({
      title: "Süre Doldu",
      description: "Sınav süresi sona erdi. Cevaplarınız otomatik olarak kaydediliyor.",
      variant: "destructive",
    });
    submitExamMutation.mutate(answers);
  };

  const handleSubmitExam = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    submitExamMutation.mutate(answers);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeLeft > 300) return "text-green-600"; // > 5 minutes
    if (timeLeft > 60) return "text-yellow-600";  // > 1 minute
    return "text-red-600"; // < 1 minute
  };

  const answeredCount = Object.values(answers).filter(a => a && a.trim() !== "").length;
  const unansweredCount = session ? session.exam.totalQuestions - answeredCount : 0;

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Sınav yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!session || session.status === "completed") {
    navigate(`/sinav/sonuclar/${params?.sessionId}`);
    return null;
  }

  if (timeLeft <= 0 && session.status === "started") {
    handleTimeUp();
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Timer */}
      <header className="bg-white shadow-md border-b-2 border-green-600 sticky top-0 z-50">
        <div className="bg-green-600 text-white py-2">
          <div className="container mx-auto px-4 flex justify-between items-center text-sm">
            <span className="font-medium">{session.exam.name} - Kitapçık {session.bookletType}</span>
            <div className={`font-bold text-lg ${getTimeColor()}`}>
              <i className="fas fa-clock mr-2"></i>
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
        
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Badge variant="outline">Soru {currentQuestion} / {session.exam.totalQuestions}</Badge>
              <Badge className="bg-green-100 text-green-800">Cevaplanmış: {answeredCount}</Badge>
              <Badge className="bg-red-100 text-red-800">Cevaplanmamış: {unansweredCount}</Badge>
            </div>
            
            <Button
              onClick={() => setShowSubmitDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={submitExamMutation.isPending}
              data-testid="button-submit-exam"
            >
              {submitExamMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Teslim Ediliyor...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane mr-2"></i>
                  Sınavı Teslim Et
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigation */}
          <div className="lg:col-span-1">
            <Card className="sticky top-32">
              <CardHeader>
                <CardTitle className="text-lg">Soru Navigasyonu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {Array.from({ length: session.exam.totalQuestions }, (_, i) => {
                    const questionNum = i + 1;
                    const isAnswered = answers[questionNum.toString()] && answers[questionNum.toString()].trim() !== "";
                    const isCurrent = currentQuestion === questionNum;
                    
                    return (
                      <Button
                        key={questionNum}
                        size="sm"
                        variant={isCurrent ? "default" : "outline"}
                        className={`aspect-square text-xs ${
                          isAnswered 
                            ? isCurrent 
                              ? "bg-green-600 text-white" 
                              : "bg-green-100 text-green-800 border-green-300"
                            : isCurrent
                              ? "bg-blue-600 text-white"
                              : "bg-white text-gray-600"
                        }`}
                        onClick={() => setCurrentQuestion(questionNum)}
                        data-testid={`button-question-${questionNum}`}
                      >
                        {questionNum}
                      </Button>
                    );
                  })}
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                    <span>Cevaplanmış</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-600 rounded"></div>
                    <span>Geçerli Soru</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
                    <span>Cevaplanmamış</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Current Question */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">
                    Soru {currentQuestion}
                  </CardTitle>
                  <Badge className="bg-blue-100 text-blue-800">
                    {session.exam.subject}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-800 text-lg leading-relaxed">
                    {currentQuestion}. Bu soru metni demo amaçlı gösterilmektedir. Gerçek sınav sisteminde buraya soru metni gelecek.
                  </p>
                </div>

                {/* Answer Options */}
                <RadioGroup
                  value={answers[currentQuestion.toString()] || ""}
                  onValueChange={(value) => handleAnswerChange(currentQuestion.toString(), value)}
                  className="space-y-3"
                >
                  {["A", "B", "C", "D"].map((option) => (
                    <div key={option} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-200">
                      <RadioGroupItem value={option} id={`${currentQuestion}-${option}`} className="text-green-600" />
                      <Label
                        htmlFor={`${currentQuestion}-${option}`}
                        className="cursor-pointer flex-1 text-base"
                        data-testid={`option-${currentQuestion}-${option}`}
                      >
                        <strong>{option})</strong> Bu seçenek metni demo amaçlı gösterilmektedir.
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestion(Math.max(1, currentQuestion - 1))}
                    disabled={currentQuestion === 1}
                    data-testid="button-prev-question"
                  >
                    <i className="fas fa-chevron-left mr-2"></i>
                    Önceki Soru
                  </Button>
                  
                  <Button
                    onClick={() => setCurrentQuestion(Math.min(session.exam.totalQuestions, currentQuestion + 1))}
                    disabled={currentQuestion === session.exam.totalQuestions}
                    data-testid="button-next-question"
                  >
                    Sonraki Soru
                    <i className="fas fa-chevron-right ml-2"></i>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sınavı Teslim Etmek İstiyor musunuz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Sınav teslim edildiğinde sonuçlarınızı görebileceksiniz.
              <br /><br />
              <strong>Durum:</strong>
              <br />• Cevaplanmış sorular: {answeredCount}
              <br />• Cevaplanmamış sorular: {unansweredCount}
              <br />• Kalan süre: {formatTime(timeLeft)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-submit">Devam Et</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSubmitExam}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-confirm-submit"
            >
              Evet, Teslim Et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}