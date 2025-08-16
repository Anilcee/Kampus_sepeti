import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useRoute } from "wouter";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import type { ExamSessionWithExam } from "@shared/schema";

export default function ExamResult() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [match, params] = useRoute("/sinav/sonuclar/:sessionId");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionName: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const { data: session, isLoading } = useQuery<ExamSessionWithExam>({
    queryKey: ["/api/exam-sessions", params?.sessionId],
    enabled: !!params?.sessionId && isAuthenticated,
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Sonuçlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Giriş Gerekli</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">Bu sonuçlara erişmek için giriş yapmanız gerekiyor.</p>
            <Link href="/login">
              <Button data-testid="button-login">Giriş Yap</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session || session.status !== "completed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Sonuçlar Bulunamadı</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">Bu sınava ait sonuç bulunamadı veya sınav henüz tamamlanmamış.</p>
            <Link href="/sinav">
              <Button data-testid="button-back-to-exams">Sınavlara Dön</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const percentage = parseFloat(session.percentage || "0");
  const totalQuestions = session.exam.totalQuestions;
  const correctAnswers = session.score || 0;
  const studentAnswers = (session.studentAnswers as Record<string, string>) || {};
  const answeredQuestions = Object.values(studentAnswers).filter(a => a && a.trim() !== "").length;
  const incorrectAnswers = answeredQuestions - correctAnswers;
  const emptyAnswers = totalQuestions - answeredQuestions;

  const getGrade = (percentage: number) => {
    if (percentage >= 85) return { grade: "AA", color: "text-green-600", bg: "bg-green-100" };
    if (percentage >= 75) return { grade: "BA", color: "text-blue-600", bg: "bg-blue-100" };
    if (percentage >= 65) return { grade: "BB", color: "text-indigo-600", bg: "bg-indigo-100" };
    if (percentage >= 55) return { grade: "CB", color: "text-yellow-600", bg: "bg-yellow-100" };
    if (percentage >= 45) return { grade: "CC", color: "text-orange-600", bg: "bg-orange-100" };
    if (percentage >= 35) return { grade: "DC", color: "text-red-600", bg: "bg-red-100" };
    return { grade: "FF", color: "text-red-700", bg: "bg-red-200" };
  };

  const gradeInfo = getGrade(percentage);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("tr-TR");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b-2 border-green-600">
        <div className="bg-green-600 text-white py-2">
          <div className="container mx-auto px-4 text-center text-sm">
            <span className="font-medium">🎯 Sınav Sonucunuz - Deneme Kapsülü</span>
          </div>
        </div>
        
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/sinav">
                <Button variant="outline" data-testid="button-back-to-exams">
                  <i className="fas fa-arrow-left mr-2"></i>
                  Sınavlara Dön
                </Button>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Hoş geldin, {(user as any)?.firstName || (user as any)?.email}</span>
              <Link href="/sinav/gecmis">
                <Button variant="outline" data-testid="button-exam-history">
                  <i className="fas fa-history mr-2"></i>
                  Tüm Sonuçlarım
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Başlık */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              <i className="fas fa-trophy text-yellow-500 mr-3"></i>
              Sınav Sonucunuz
            </h1>
            <p className="text-gray-600">{session.exam.name} sonuçlarınız</p>
          </div>

          {/* Ana Sonuç Kartı */}
          <Card className="mb-8 bg-gradient-to-r from-green-50 to-blue-50">
            <CardHeader>
              <CardTitle className="text-2xl text-center">{session.exam.name}</CardTitle>
              <div className="text-center">
                <Badge className="bg-green-100 text-green-800">{session.exam.subject}</Badge>
                <Badge variant="outline" className="ml-2">Kitapçık {session.bookletType}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-blue-500 text-white text-4xl font-bold">
                  {percentage.toFixed(1)}%
                </div>
                
                <div className="text-center">
                  <Badge 
                    className={`text-2xl px-6 py-2 ${gradeInfo.bg} ${gradeInfo.color}`}
                    data-testid="text-grade"
                  >
                    {gradeInfo.grade}
                  </Badge>
                </div>

                <Progress value={percentage} className="h-4 bg-gray-200">
                  <div 
                    className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </Progress>
              </div>
            </CardContent>
          </Card>

          {/* Detaylı İstatistikler */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg text-green-600">Doğru Cevap</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-3xl font-bold text-green-600" data-testid="text-correct-answers">
                  {correctAnswers}
                </div>
                <div className="text-sm text-gray-600">/ {totalQuestions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg text-red-600">Yanlış Cevap</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-3xl font-bold text-red-600" data-testid="text-incorrect-answers">
                  {incorrectAnswers}
                </div>
                <div className="text-sm text-gray-600">/ {totalQuestions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg text-gray-600">Boş Bırakılan</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-3xl font-bold text-gray-600" data-testid="text-empty-answers">
                  {emptyAnswers}
                </div>
                <div className="text-sm text-gray-600">/ {totalQuestions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg text-blue-600">Net Puan</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-3xl font-bold text-blue-600" data-testid="text-net-score">
                  {(correctAnswers - (incorrectAnswers * 0.25)).toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Net</div>
              </CardContent>
            </Card>
          </div>

          {/* Test Bazlı Analiz */}
          {(() => {
            const questionTests = (session.exam as any).questionTests || {};
            const questionSubjects = (session.exam as any).questionSubjects || {};
            const acquisitions = (session.exam as any).acquisitions || {};
            const acquisitionCodes = (session.exam as any).acquisitionCodes || {};
            const answerKey = session.exam.answerKey || {};
            
            // Test bazlı sonuçları grupla
            const testResults: Record<string, {
              total: number;
              correct: number;
              incorrect: number;
              empty: number;
              questions: number[];
            }> = {};
            const testOrder: string[] = [];

            for (let i = 1; i <= totalQuestions; i++) {
              const questionStr = i.toString();
              const test = questionTests[questionStr] || 'Genel';
              const studentAnswer = studentAnswers[questionStr] || '';
              const correctAnswer = answerKey[questionStr] || '';
              
              if (!testResults[test]) {
                testResults[test] = { total: 0, correct: 0, incorrect: 0, empty: 0, questions: [] };
                testOrder.push(test); // Preserve order of appearance
              }
              
              testResults[test].total++;
              testResults[test].questions.push(i);
              
              if (!studentAnswer || studentAnswer.trim() === '') {
                testResults[test].empty++;
              } else if (studentAnswer === correctAnswer) {
                testResults[test].correct++;
              } else {
                testResults[test].incorrect++;
              }
            }

            return (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="text-xl">Test Bazlı Sonuçlar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {testOrder.map(testName => {
                      const results = testResults[testName];
                      const testPercentage = results.total > 0 ? (results.correct / results.total) * 100 : 0;
                      const testNet = results.correct - (results.incorrect * 0.25);
                      
                      return (
                        <div key={testName} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold text-lg text-blue-800">{testName}</h4>
                            <Badge className={`${testPercentage >= 60 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              %{testPercentage.toFixed(1)}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                            <div className="text-center">
                              <div className="font-bold text-gray-700">{results.total}</div>
                              <div className="text-gray-600">Toplam</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-green-600">{results.correct}</div>
                              <div className="text-gray-600">Doğru</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-red-600">{results.incorrect}</div>
                              <div className="text-gray-600">Yanlış</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-gray-600">{results.empty}</div>
                              <div className="text-gray-600">Boş</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-blue-600">{testNet.toFixed(1)}</div>
                              <div className="text-gray-600">Net</div>
                            </div>
                          </div>
                          
                          <div className="mt-3">
                            <Progress value={testPercentage} className="h-2" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Kazanım Bazlı Analiz */}
          {(() => {
            const acquisitions = (session.exam as any).acquisitions || {};
            const acquisitionCodes = (session.exam as any).acquisitionCodes || {};
            const questionSubjects = (session.exam as any).questionSubjects || {};
            const answerKey = session.exam.answerKey || {};
            
            // Kazanım bazlı sonuçları ders ders grupla
            const acquisitionsBySubject: Record<string, Record<string, {
              name: string;
              code: string;
              total: number;
              correct: number;
              questions: number[];
            }>> = {};

            for (let i = 1; i <= totalQuestions; i++) {
              const questionStr = i.toString();
              const acquisitionName = acquisitions[questionStr];
              const acquisitionCode = acquisitionCodes[questionStr];
              const subject = questionSubjects[questionStr] || 'Genel';
              const studentAnswer = studentAnswers[questionStr] || '';
              const correctAnswer = answerKey[questionStr] || '';
              
              if (acquisitionName && acquisitionCode) {
                if (!acquisitionsBySubject[subject]) {
                  acquisitionsBySubject[subject] = {};
                }
                
                const key = `${acquisitionCode}-${acquisitionName}`;
                
                if (!acquisitionsBySubject[subject][key]) {
                  acquisitionsBySubject[subject][key] = {
                    name: acquisitionName,
                    code: acquisitionCode,
                    total: 0,
                    correct: 0,
                    questions: []
                  };
                }
                
                acquisitionsBySubject[subject][key].total++;
                acquisitionsBySubject[subject][key].questions.push(i);
                
                if (studentAnswer === correctAnswer) {
                  acquisitionsBySubject[subject][key].correct++;
                }
              }
            }

            if (Object.keys(acquisitionsBySubject).length > 0) {
              return (
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle className="text-xl">Kazanım Bazlı Analiz (Ders Ders)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(acquisitionsBySubject).map(([subjectName, subjectAcquisitions]) => {
                        const totalAcquisitions = Object.keys(subjectAcquisitions).length;
                        const isOpen = openSections[subjectName];
                        
                        return (
                          <Collapsible key={subjectName} open={isOpen} onOpenChange={() => toggleSection(subjectName)}>
                            <CollapsibleTrigger className="w-full">
                              <div className="flex items-center justify-between w-full p-4 border border-gray-200 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                                <div className="flex items-center space-x-3">
                                  <div className="w-1 h-8 bg-blue-500 rounded"></div>
                                  <div>
                                    <h4 className="font-semibold text-lg text-blue-800 text-left">{subjectName}</h4>
                                    <p className="text-sm text-blue-600 text-left">
                                      {totalAcquisitions} kazanım
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline" className="bg-white">
                                    {totalAcquisitions} kazanım
                                  </Badge>
                                  <svg
                                    className={`w-5 h-5 text-blue-600 transform transition-transform ${
                                      isOpen ? 'rotate-180' : ''
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            
                            <CollapsibleContent className="mt-2">
                              <div className="space-y-3 pl-4 border-l-2 border-blue-200">
                                {Object.entries(subjectAcquisitions).map(([key, result]) => {
                                  const percentage = result.total > 0 ? (result.correct / result.total) * 100 : 0;
                                  
                                  return (
                                    <div key={key} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                      <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                          <div className="font-medium text-sm text-gray-800">
                                            {result.code}
                                          </div>
                                          <div className="text-sm text-gray-600 mt-1">
                                            {result.name}
                                          </div>
                                        </div>
                                        <div className="text-right ml-4">
                                          <Badge className={`${percentage >= 60 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {result.correct}/{result.total}
                                          </Badge>
                                          <div className="text-xs text-gray-600 mt-1">
                                            %{percentage.toFixed(0)}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="text-xs text-gray-500">
                                        Sorular: {result.questions.join(', ')}
                                      </div>
                                      
                                      <div className="mt-2">
                                        <Progress value={percentage} className="h-1" />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            }
            return null;
          })()}

          {/* Sınav Detayları */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl">Sınav Detayları</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sınav Adı:</span>
                  <span className="font-medium">{session.exam.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ders:</span>
                  <span className="font-medium">{session.exam.subject}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Kitapçık Türü:</span>
                  <span className="font-medium">Kitapçık {session.bookletType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Toplam Soru:</span>
                  <span className="font-medium">{totalQuestions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sınav Süresi:</span>
                  <span className="font-medium">{session.exam.durationMinutes} dakika</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tamamlanma Tarihi:</span>
                  <span className="font-medium">{formatDate(session.completedAt!)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Eylem Butonları */}
          <div className="flex justify-center space-x-4">
            <Link href="/sinav">
              <Button className="bg-green-600 hover:bg-green-700" data-testid="button-new-exam">
                <i className="fas fa-plus mr-2"></i>
                Yeni Sınav
              </Button>
            </Link>
            <Link href="/sinav/gecmis">
              <Button variant="outline" data-testid="button-all-results">
                <i className="fas fa-list mr-2"></i>
                Tüm Sonuçlarım
              </Button>
            </Link>
            <Button
              onClick={() => window.print()}
              variant="outline"
              data-testid="button-print"
            >
              <i className="fas fa-print mr-2"></i>
              Yazdır
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}