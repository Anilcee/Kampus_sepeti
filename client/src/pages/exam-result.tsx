import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useRoute } from "wouter";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ExamSessionWithExam } from "@shared/schema";

export default function ExamResult() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [match, params] = useRoute("/sinav/sonuclar/:sessionId");

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