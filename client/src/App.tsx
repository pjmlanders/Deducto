import { Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { Layout } from '@/components/layout/Layout';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { ExpenseList } from '@/components/expenses/ExpenseList';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { ExpenseDetail } from '@/components/expenses/ExpenseDetail';
import { ProjectList } from '@/components/projects/ProjectList';
import { ProjectDetail } from '@/components/projects/ProjectDetail';
import { ReceiptCapture } from '@/components/receipts/ReceiptCapture';
import { ReceiptList } from '@/components/receipts/ReceiptList';
import { ReceiptProcessing } from '@/components/receipts/ReceiptProcessing';
import { BatchAcceptReceipts } from '@/components/receipts/BatchAcceptReceipts';
import { DepositList } from '@/components/deposits/DepositList';
import { ReportsPage } from '@/components/reports/ReportsPage';
import { MileageLog } from '@/components/mileage/MileageLog';
import { SettingsPage } from '@/components/settings/SettingsPage';

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/expenses" element={<ExpenseList />} />
          <Route path="/expenses/new" element={<ExpenseForm />} />
          <Route path="/expenses/:id" element={<ExpenseDetail />} />
          <Route path="/expenses/:id/edit" element={<ExpenseForm />} />
          <Route path="/scan" element={<ReceiptCapture />} />
          <Route path="/upload" element={<ReceiptCapture />} />
          <Route path="/receipts" element={<ReceiptList />} />
          <Route path="/receipts/batch-accept" element={<BatchAcceptReceipts />} />
          <Route path="/receipts/:id/review" element={<ReceiptProcessing />} />
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/deposits" element={<DepositList />} />
          <Route path="/mileage" element={<MileageLog />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      <Analytics />
    </>
  );
}
