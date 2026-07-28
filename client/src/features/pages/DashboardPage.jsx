import { useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import NurseDashboard from './dashboards/NurseDashboard';
import DoctorDashboard from './dashboards/DoctorDashboard';
import AdminDashboard from './dashboards/AdminDashboard';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const greetingName = useMemo(() => {
    if (!user) return 'User';
    if (user.role === 'ICU_SPECIALIST') return `Dr. ${user.last_name}`;
    return user.first_name;
  }, [user]);

  const currentFormattedDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const commonProps = {
    user,
    greetingName,
    currentFormattedDate
  };

  if (!user) return null;

  if (user.role === 'SYSTEM_ADMIN') {
    return <AdminDashboard {...commonProps} />;
  }

  if (user.role === 'ICU_SPECIALIST' || user.role === 'MEDICAL_RESIDENT') {
    return <DoctorDashboard {...commonProps} />;
  }

  // Default to Nurse dashboard for ICU_NURSE or unhandled roles
  return <NurseDashboard {...commonProps} />;
}

