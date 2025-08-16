import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useRoute, useLocation } from "wouter";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { ExamWithBooklets, ExamSession } from "@shared/schema";

export default function ExamDetail() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/sinav/:id");
  const [selectedBooklet, setSelectedBooklet] = useState<string>("");

  const { data: exam, isLoading } = useQuery<ExamWithBooklets>({
    queryKey: ["/api/exams", params?.id],
    enabled: !!params?.id && isAuthenticated,
  });

  const startExamMutation = useMutation({
    mutationFn: async ({ examId, bookletType }: { examId: string; bookletType: string }) => {
      const response = await apiRequest("POST", "/api/exam-sessions/start", {
        examId,
        bookletType,
      });
      return await response.json();
    },
    onSuccess: (session: ExamSession) => {
      toast({
        title: "Sınav Başladı",
        description: "Sınav oturumunuz başlatıldı. İyi şanslar!",
      });
      navigate(`/sinav/${params?.id}/oturum/${session.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error?.message || "Sınav başlatılırken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
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
            <p className="text-gray-600 mb-4">Bu sınava erişmek için giriş yapmanız gerekiyor.</p>
            <Link href="/login">
              <Button data-testid="button-login">Giriş Yap</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Sınav yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Sınav Bulunamadı</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">Aradığınız sınav bulunamadı.</p>
            <Link href="/sinav">
              <Button data-testid="button-back-to-exams">Sınavlara Dön</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleStartExam = () => {
    if (!selectedBooklet) {
      toast({
        title: "Kitapçık Seçimi",
        description: "Lütfen bir kitapçık türü seçiniz",
        variant: "destructive",
      });
      return;
    }

    startExamMutation.mutate({
      examId: exam.id,
      bookletType: selectedBooklet,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b-2 border-green-600">
        <div className="bg-green-600 text-white py-2">
          <div className="container mx-auto px-4 text-center text-sm">
            <span className="font-medium">🎯 Online Sınav Sistemi - Deneme Kapsülü</span>
          </div>
        </div>
        
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/sinav">
              <Button variant="outline" data-testid="button-back">
                <i className="fas fa-arrow-left mr-2"></i>
                Sınavlara Dön
              </Button>
            </Link>
            
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Hoş geldin, {(user as any)?.firstName || (user as any)?.email}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl text-gray-800 mb-2">{exam.name}</CardTitle>
                  <Badge className="bg-green-100 text-green-800">{exam.subject}</Badge>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {exam.durationMinutes} <span className="text-sm font-normal">dakika</span>
                  </div>
                  <div className="text-sm text-gray-600">Sınav Süresi</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-700">{exam.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{exam.totalQuestions}</div>
                    <div className="text-sm text-gray-600">Toplam Soru</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{exam.durationMinutes}</div>
                    <div className="text-sm text-gray-600">Dakika</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">{exam.booklets.length}</div>
                    <div className="text-sm text-gray-600">Kitapçık Türü</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Sınava Başlamadan Önce</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Kitapçık Seçimi */}
              <div>
                <Label className="text-base font-medium mb-3 block">Kitapçık Türünü Seçiniz:</Label>
                <RadioGroup value={selectedBooklet} onValueChange={setSelectedBooklet}>
                  <div className="grid grid-cols-4 gap-4">
                    {exam.booklets.map((booklet) => (
                      <div key={booklet.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={booklet.bookletCode} id={booklet.bookletCode} />
                        <Label 
                          htmlFor={booklet.bookletCode} 
                          className="cursor-pointer bg-gray-100 px-4 py-2 rounded-md text-center font-medium hover:bg-gray-200 transition-colors w-full"
                        >
                          Kitapçık {booklet.bookletCode}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              {/* Uyarılar */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-medium text-amber-800 mb-2">⚠️ Önemli Uyarılar:</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Sınav başladıktan sonra sayfayı yenilemeyin veya kapatmayın</li>
                  <li>• Sınav süreniz {exam.durationMinutes} dakikadır</li>
                  <li>• Cevaplarınız otomatik olarak kaydedilir</li>
                  <li>• Sınav bittiğinde sonuçlarınızı hemen görebileceksiniz</li>
                </ul>
              </div>

              {/* Başlat Butonu */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-lg py-3" 
                    disabled={!selectedBooklet || startExamMutation.isPending}
                    data-testid="button-start-exam"
                  >
                    {startExamMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Sınav Başlatılıyor...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-play mr-2"></i>
                        Sınava Başla
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sınava Başlamak İstiyor musunuz?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bu işlem geri alınamaz. Sınav başladıktan sonra {exam.durationMinutes} dakika süreniz olacak.
                      Seçtiğiniz kitapçık türü: <strong>Kitapçık {selectedBooklet}</strong>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-start">İptal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleStartExam} data-testid="button-confirm-start">
                      Evet, Başlat
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}