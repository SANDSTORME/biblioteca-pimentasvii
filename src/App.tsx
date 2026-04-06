import React, { Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LibraryProvider } from '@/contexts/LibraryContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import AppLayout from '@/components/layout/AppLayout';

const LandingPage = lazy(() => import('@/pages/public/LandingPage'));
const PasswordResetPage = lazy(() => import('@/pages/public/PasswordResetPage'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const StudentDashboard = lazy(() => import('@/pages/student/StudentDashboard'));
const CatalogPage = lazy(() => import('@/pages/shared/CatalogPage'));
const DocumentsPage = lazy(() => import('@/pages/shared/DocumentsPage'));
const BookDetailPage = lazy(() => import('@/pages/student/BookDetailPage'));
const StudentLoansPage = lazy(() => import('@/pages/student/StudentLoansPage'));
const StudentFavoritesPage = lazy(() => import('@/pages/student/StudentFavoritesPage'));
const StudentHistoryPage = lazy(() => import('@/pages/student/StudentHistoryPage'));
const RecommendationsPage = lazy(() => import('@/pages/student/RecommendationsPage'));
const SupportPage = lazy(() => import('@/pages/shared/SupportPage'));
const PresentationModePage = lazy(() => import('@/pages/shared/PresentationModePage'));
const TeacherDashboard = lazy(() => import('@/pages/teacher/TeacherDashboard'));
const TeacherSuggestionsPage = lazy(() => import('@/pages/teacher/TeacherSuggestionsPage'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminBooksPage = lazy(() => import('@/pages/admin/AdminBooksPage'));
const AdminLoansPage = lazy(() => import('@/pages/admin/AdminLoansPage'));
const AdminPermissionsPage = lazy(() => import('@/pages/admin/AdminPermissionsPage'));
const AdminTokensPage = lazy(() => import('@/pages/admin/AdminTokensPage'));
const AdminNoticesPage = lazy(() => import('@/pages/admin/AdminNoticesPage'));
const AdminSupportPage = lazy(() => import('@/pages/admin/AdminSupportPage'));
const AdminReportsPage = lazy(() => import('@/pages/admin/AdminReportsPage'));
const AdminAuditPage = lazy(() => import('@/pages/admin/AdminAuditPage'));
const AdminDocumentsPage = lazy(() => import('@/pages/admin/AdminDocumentsPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

const RouteFallback: React.FC = () => (
  <div className="flex min-h-[40vh] items-center justify-center rounded-[1.5rem] border border-border/60 bg-card/50 px-6 text-center text-sm text-muted-foreground">
    Carregando ambiente...
  </div>
);

const withSuspense = (element: React.ReactNode) => <Suspense fallback={<RouteFallback />}>{element}</Suspense>;

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({ children, roles }) => {
  const { user, isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center text-sm text-muted-foreground">
        Carregando sua sessão...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <AppLayout>{withSuspense(children)}</AppLayout>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={withSuspense(<LandingPage />)} />
    <Route path="/apresentacao" element={withSuspense(<PresentationModePage />)} />
    <Route path="/documentos" element={withSuspense(<DocumentsPage publicView />)} />
    <Route path="/redefinir-senha" element={withSuspense(<PasswordResetPage />)} />

    <Route
      path="/aluno"
      element={
        <ProtectedRoute roles={['aluno']}>
          <StudentDashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/aluno/catalogo"
      element={
        <ProtectedRoute roles={['aluno']}>
          <CatalogPage basePath="/aluno/catalogo" />
        </ProtectedRoute>
      }
    />
    <Route
      path="/aluno/catalogo/:id"
      element={
        <ProtectedRoute roles={['aluno']}>
          <BookDetailPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/aluno/documentos"
      element={
        <ProtectedRoute roles={['aluno']}>
          <DocumentsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/aluno/emprestimos"
      element={
        <ProtectedRoute roles={['aluno']}>
          <StudentLoansPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/aluno/favoritos"
      element={
        <ProtectedRoute roles={['aluno']}>
          <StudentFavoritesPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/aluno/historico"
      element={
        <ProtectedRoute roles={['aluno']}>
          <StudentHistoryPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/aluno/recomendacoes"
      element={
        <ProtectedRoute roles={['aluno']}>
          <RecommendationsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/aluno/suporte"
      element={
        <ProtectedRoute roles={['aluno']}>
          <SupportPage />
        </ProtectedRoute>
      }
    />

    <Route
      path="/professor"
      element={
        <ProtectedRoute roles={['professor']}>
          <TeacherDashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/professor/catalogo"
      element={
        <ProtectedRoute roles={['professor']}>
          <CatalogPage basePath="/professor/catalogo" />
        </ProtectedRoute>
      }
    />
    <Route
      path="/professor/catalogo/:id"
      element={
        <ProtectedRoute roles={['professor']}>
          <BookDetailPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/professor/documentos"
      element={
        <ProtectedRoute roles={['professor']}>
          <DocumentsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/professor/sugestoes"
      element={
        <ProtectedRoute roles={['professor']}>
          <TeacherSuggestionsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/professor/suporte"
      element={
        <ProtectedRoute roles={['professor']}>
          <SupportPage />
        </ProtectedRoute>
      }
    />

    <Route
      path="/admin"
      element={
        <ProtectedRoute roles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/usuarios"
      element={
        <ProtectedRoute roles={['admin']}>
          <AdminUsersPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/livros"
      element={
        <ProtectedRoute roles={['admin']}>
          <AdminBooksPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/documentos"
      element={
        <ProtectedRoute roles={['admin']}>
          <AdminDocumentsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/emprestimos"
      element={
        <ProtectedRoute roles={['admin']}>
          <AdminLoansPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/relatorios"
      element={
        <ProtectedRoute roles={['admin']}>
          <AdminReportsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/auditoria"
      element={
        <ProtectedRoute roles={['admin']}>
          <AdminAuditPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/permissoes"
      element={
        <ProtectedRoute roles={['admin']}>
          <AdminPermissionsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/tokens"
      element={
        <ProtectedRoute roles={['admin']}>
          <AdminTokensPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/avisos"
      element={
        <ProtectedRoute roles={['admin']}>
          <AdminNoticesPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/suporte"
      element={
        <ProtectedRoute roles={['admin']}>
          <AdminSupportPage />
        </ProtectedRoute>
      }
    />

    <Route path="*" element={withSuspense(<NotFound />)} />
  </Routes>
);

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LibraryProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AppRoutes />
            </BrowserRouter>
          </AuthProvider>
        </LibraryProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
