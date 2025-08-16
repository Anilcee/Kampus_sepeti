import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  // Removed currentQuestion state as we show all questions at once
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: session, isLoading } = useQuery<ExamSessionWithExam>({
    queryKey: ["/api/exam-sessions", params?.sessionId],
    enabled: !!params?.sessionId && isAuthenticated,
    refetchInterval: false,
  });

  // Initialize answers and timer
  useEffect(() => {
    if (session && session.status === "started") {
      const existingAnswers = (session.studentAnswers as Record<string, string>) || {};
      setAnswers(existingAnswers);
      
      // Calculate remaining time more safely
      const startTime = new Date(session.startedAt!).getTime();
      const now = new Date().getTime();
      const elapsed = Math.floor((now - startTime) / 1000);
      const totalTime = session.exam.durationMinutes * 60;
      const remaining = Math.max(0, totalTime - elapsed);
      
      setTimeLeft(remaining);
      
      // Only start interval if there's time left
      if (remaining > 0) {
        intervalRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              // Clear interval first to prevent multiple calls
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
              // Use setTimeout to avoid calling during render
              setTimeout(() => {
                handleTimeUp();
              }, 0);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else if (remaining <= 0) {
        // Time already up, submit immediately but safely
        setTimeout(() => {
          handleTimeUp();
        }, 100);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [session]);

  const saveAnswersMutation = useMutation({
    mutationFn: async (answers: Record<string, string>) => {
      const response = await apiRequest("PUT", `/api/exam-sessions/${params?.sessionId}/answers`, {
        answers,
      });
      return await response.json();
    },
  });

  const submitExamMutation = useMutation({
    mutationFn: async (answers: Record<string, string>) => {
      const response = await apiRequest("POST", `/api/exam-sessions/${params?.sessionId}/submit`, {
        studentAnswers: answers,
      });
      return await response.json();
    },
    onSuccess: async (result) => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      toast({
        title: "Başarılı",
        description: "Sınavınız başarıyla teslim edildi. Sonuçlarınız yükleniyor...",
      });
      
      // Invalidate cache to ensure fresh data
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/exam-sessions", params?.sessionId] 
      });
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/my-exam-sessions"] 
      });
      
      // Wait a bit to ensure database transaction is committed
      setTimeout(() => {
        navigate(`/sinav/sonuclar/${params?.sessionId}`);
      }, 1000);
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

  if (!isLoading && !session) {
    navigate('/sinav');
    return null;
  }
  
  if (session && session.status === "completed") {
    navigate(`/sinav/sonuclar/${params?.sessionId}`);
    return null;
  }

  // Removed problematic time check that caused infinite loop

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Sınav yükleniyor...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Timer */}
      <header className="bg-white shadow-md border-b-2 border-green-600 sticky top-0 z-50">
        <div className="bg-green-600 text-white py-3">
          <div className="container mx-auto px-4 text-center">
            <div className="flex justify-between items-center">
              <span className="font-medium text-lg">{session.exam.name}</span>
              <div className="text-white font-bold text-xl">
                <i className="fas fa-clock mr-2"></i>
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
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

      <main className="min-h-screen bg-gray-100 flex justify-center py-6">
        <div className="w-full max-w-4xl">
          {/* Optik Cevap Kağıdı */}
          <div className="bg-white shadow-lg border border-gray-300 rounded-lg overflow-hidden">
            {/* Form Header */}
            <div className="bg-gray-50 border-b border-gray-300 p-4">
              <div className="flex justify-between items-center mb-2">
                <h1 className="text-lg font-bold text-gray-800">
                  {session.exam.name.toUpperCase()}
                </h1>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => saveAnswersMutation.mutate(answers)}
                    disabled={saveAnswersMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
                    data-testid="button-save"
                  >
                    <i className="fas fa-save mr-2"></i>
                    Kaydet
                  </Button>
                  <Button
                    onClick={() => setShowSubmitDialog(true)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2"
                    disabled={submitExamMutation.isPending}
                    data-testid="button-finish"
                  >
                    <i className="fas fa-flag-checkered mr-2"></i>
                    Bitir
                  </Button>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Ders:</span> {session.exam.subject} | 
                <span className="font-medium">Kitapçık:</span> {session.bookletType} | 
                <span className="font-medium">Soru Sayısı:</span> {session.exam.totalQuestions}
              </div>
            </div>

            {/* Optik Form Content */}
            <div className="p-6 bg-white">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                  {session.exam.subject.toUpperCase()}
                </h2>
                <p className="text-sm text-gray-600">
                  Aşağıdaki sorular için doğru şıkkı tamamen karartınız
                </p>
              </div>

              {/* Test Based Question Sections */}
              {(() => {
                // Group questions by test
                const questionsByTest: Record<string, number[]> = {};
                const testOrder: string[] = [];
                const questionTests = (session.exam as any).questionTests || {};
                
                // Group questions by their test, preserving order
                for (let i = 1; i <= session.exam.totalQuestions; i++) {
                  const test = questionTests[i.toString()] || 'Genel';
                  if (!questionsByTest[test]) {
                    questionsByTest[test] = [];
                    testOrder.push(test); // Preserve order of appearance
                  }
                  questionsByTest[test].push(i);
                }

                return testOrder.map(testName => {
                  const questionNumbers = questionsByTest[testName];
                  return (
                    <div key={testName} className="mb-8">
                      {/* Test Header */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <h3 className="text-lg font-bold text-blue-800 mb-2">{testName}</h3>
                        <div className="flex items-center space-x-4 text-sm text-blue-600">
                          <span>Soru Sayısı: {questionNumbers.length}</span>
                          <span>
                            Cevaplanmış: {questionNumbers.filter(q => answers[q.toString()]).length}
                          </span>
                        </div>
                      </div>

                      {/* Questions Grid for this test */}
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {questionNumbers.map((questionNum, index) => {
                          const questionStr = questionNum.toString();
                          const selectedAnswer = answers[questionStr] || "";
                          const displayNum = index + 1; // Her testte 1'den başla
                          
                          return (
                            <div key={questionNum} className="border border-gray-200 rounded p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                              <div className="text-center mb-3">
                                <span className="font-bold text-gray-800 text-lg">{displayNum}.</span>
                              </div>
                              <div className="flex justify-center space-x-1">
                                {["A", "B", "C", "D", "E"].map((option) => {
                                  const isSelected = selectedAnswer === option;
                                  return (
                                    <div key={option} className="flex flex-col items-center">
                                      <span className="text-xs font-medium text-gray-600 mb-1">{option}</span>
                                      <button
                                        onClick={() => handleAnswerChange(questionStr, option)}
                                        className={`w-5 h-5 rounded-full border-2 transition-all ${
                                          isSelected 
                                            ? "bg-gray-800 border-gray-800" 
                                            : "bg-white border-gray-400 hover:border-gray-600"
                                        }`}
                                        data-testid={`bubble-${questionStr}-${option}`}
                                      >
                                        {isSelected && <div className="w-full h-full rounded-full bg-gray-800"></div>}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}

              {/* Form Footer */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                  <div className="text-center">
                    <div className="font-medium text-green-600 text-lg">{answeredCount}</div>
                    <div>Cevaplanmış</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-red-600 text-lg">{unansweredCount}</div>
                    <div>Cevaplanmamış</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-blue-600 text-lg">{session.exam.totalQuestions}</div>
                    <div>Toplam Soru</div>
                  </div>
                  <div className="text-center">
                    <div className={`font-medium text-lg ${getTimeColor()}`}>{formatTime(timeLeft)}</div>
                    <div>Kalan Süre</div>
                  </div>
                </div>
              </div>
            </div>
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