import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Admin from "@/pages/admin";
import Product from "@/pages/product";
import Profile from "@/pages/profile";
import Checkout from "@/pages/checkout";
import NotFound from "@/pages/not-found";

// Exam System Pages
import ExamList from "@/pages/exam-list";
import ExamDetail from "@/pages/exam-detail";
import ExamSession from "@/pages/exam-session";
import ExamResult from "@/pages/exam-result";
import ExamHistory from "@/pages/exam-history";
import ExamAdmin from "@/pages/exam-admin";

function Router() {
  // Check if we're on the exam subdomain
  const isExamSubdomain = window.location.hostname.startsWith('sinav.') || 
                         window.location.pathname.startsWith('/sinav');

  if (isExamSubdomain || window.location.pathname.startsWith('/sinav')) {
    // Exam System Routes
    return (
      <Switch>
        <Route path="/" component={ExamList} />
        <Route path="/sinav" component={ExamList} />
        <Route path="/sinav/admin" component={ExamAdmin} />
        <Route path="/sinav/gecmis" component={ExamHistory} />
        <Route path="/sinav/sonuclar/:sessionId" component={ExamResult} />
        <Route path="/sinav/:examId/oturum/:sessionId" component={ExamSession} />
        <Route path="/sinav/:id" component={ExamDetail} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Main E-commerce Site Routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/admin" component={Admin} />
      <Route path="/product/:slug" component={Product} />
      <Route path="/profile" component={Profile} />
      <Route path="/checkout" component={Checkout} />
      {/* Exam system routes for main domain */}
      <Route path="/sinav" component={ExamList} />
      <Route path="/sinav/admin" component={ExamAdmin} />
      <Route path="/sinav/gecmis" component={ExamHistory} />
      <Route path="/sinav/sonuclar/:sessionId" component={ExamResult} />
      <Route path="/sinav/:examId/oturum/:sessionId" component={ExamSession} />
      <Route path="/sinav/:id" component={ExamDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
