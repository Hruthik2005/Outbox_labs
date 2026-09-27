import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingLayout } from '../layouts/LandingLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { AuthCallbackPage } from '../pages/AuthCallbackPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ScheduledEmailsPage } from '../pages/ScheduledEmailsPage';
import { SentEmailsPage } from '../pages/SentEmailsPage';
import { ComposeEmailPage } from '../pages/ComposeEmailPage';
import { SendersPage } from '../pages/SendersPage';
import { SettingsPage } from '../pages/SettingsPage';
import { QueueMonitorPage } from '../pages/QueueMonitorPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route element={<LandingLayout />}>
        <Route path="/" element={<LandingPage />} />
      </Route>

      {/* Authentication */}
      <Route path="/login" element={<LoginPage defaultMode="login" />} />
      <Route path="/signup" element={<LoginPage defaultMode="signup" />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      {/* Protected Dashboard Routes */}
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/compose" element={<ComposeEmailPage />} />
        <Route path="/campaign-builder" element={<ComposeEmailPage />} />
        <Route path="/scheduled" element={<ScheduledEmailsPage />} />
        <Route path="/sent" element={<SentEmailsPage />} />
        <Route path="/senders" element={<SendersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/integrations" element={<SettingsPage />} />
        <Route path="/queue-monitor" element={<QueueMonitorPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
