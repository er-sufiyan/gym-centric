import React, { useState, useEffect, useCallback } from 'react';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import GymDashboard from './pages/gym/GymDashboard';
import LoginPage from './pages/auth/LoginPage';
import { fetchBootstrap } from './services/api';
import {
  INITIAL_GYMS,
  INITIAL_PLANS_BY_GYM,
  INITIAL_MEMBERS_BY_GYM,
  INITIAL_MEMBER_PAYMENTS_BY_GYM,
  INITIAL_SAAS_PAYMENTS
} from './data/initialData';

export default function App() {
  const [activeRole, setActiveRole] = useState('superadmin'); // 'superadmin' or 'gym'
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [dbConnected, setDbConnected] = useState(false);

  const [gyms, setGyms] = useState(INITIAL_GYMS);
  const [activeGymId, setActiveGymId] = useState(INITIAL_GYMS[0].id);
  const [plansByGym, setPlansByGym] = useState(INITIAL_PLANS_BY_GYM);
  const [membersByGym, setMembersByGym] = useState(INITIAL_MEMBERS_BY_GYM);
  const [memberPaymentsByGym, setMemberPaymentsByGym] = useState(INITIAL_MEMBER_PAYMENTS_BY_GYM);
  const [gymLedgerByGym, setGymLedgerByGym] = useState(INITIAL_MEMBER_PAYMENTS_BY_GYM);
  const [saasPayments, setSaasPayments] = useState(INITIAL_SAAS_PAYMENTS);

  const syncFromDatabase = useCallback(async () => {
    try {
      const res = await fetchBootstrap();
      if (!res?.data) return;
      const {
        gyms: dbGyms,
        plansByGym: dbPlans,
        membersByGym: dbMembers,
        memberPaymentsByGym: dbPayments,
        gymLedgerByGym: dbLedger,
        saasPayments: dbSaas
      } = res.data;

      setDbConnected(true);
      if (dbGyms && dbGyms.length > 0) {
        setGyms(dbGyms);
        setActiveGymId((prevId) => (dbGyms.some((g) => g.id === prevId) ? prevId : dbGyms[0].id));
        setPlansByGym(dbPlans || {});
        setMembersByGym(dbMembers || {});
        setMemberPaymentsByGym(dbPayments || {});
        setGymLedgerByGym(dbLedger || dbPayments || {});
        setSaasPayments(dbSaas || []);
      }
    } catch {
      setDbConnected(false);
    }
  }, []);

  useEffect(() => {
    syncFromDatabase();
  }, [syncFromDatabase]);

  const activeGym = gyms.find((g) => g.id === activeGymId) || gyms[0];

  const setScopedMembers = (updater) => {
    setMembersByGym((prev) => {
      const current = prev[activeGym.id] || [];
      const next = typeof updater === 'function' ? updater(current) : updater;
      return { ...prev, [activeGym.id]: next };
    });
  };

  const setScopedPlans = (updater) => {
    setPlansByGym((prev) => {
      const current = prev[activeGym.id] || [];
      const next = typeof updater === 'function' ? updater(current) : updater;
      return { ...prev, [activeGym.id]: next };
    });
  };

  const setScopedPayments = (updater) => {
    setMemberPaymentsByGym((prev) => {
      const current = prev[activeGym.id] || [];
      const next = typeof updater === 'function' ? updater(current) : updater;
      return { ...prev, [activeGym.id]: next };
    });
  };

  const setScopedLedger = (updater) => {
    setGymLedgerByGym((prev) => {
      const current = prev[activeGym.id] || [];
      const next = typeof updater === 'function' ? updater(current) : updater;
      return { ...prev, [activeGym.id]: next };
    });
  };

  const handleAddGym = (newGym, initialPayment, initialPlans) => {
    setGyms((prev) => [newGym, ...prev]);
    setMembersByGym((prev) => ({ ...prev, [newGym.id]: [] }));
    setPlansByGym((prev) => ({
      ...prev,
      [newGym.id]:
        initialPlans && initialPlans.length > 0
          ? initialPlans
          : [
              { id: `${newGym.id}-plan-1`, name: '1 Month Standard', price: 1200, durationDays: 30 },
              { id: `${newGym.id}-plan-2`, name: '3 Months Value Pack', price: 3200, durationDays: 90 }
            ]
    }));
    setMemberPaymentsByGym((prev) => ({ ...prev, [newGym.id]: [] }));
    setGymLedgerByGym((prev) => ({ ...prev, [newGym.id]: [] }));
    if (initialPayment) {
      setSaasPayments((prev) => [initialPayment, ...prev]);
    }
  };

  const handleLoginSuccess = (gymData) => {
    const matched = gyms.find(
      (g) => g.phone.replace(/\s+/g, '') === (gymData.phone || '').replace(/\s+/g, '')
    );
    if (matched) {
      setActiveGymId(matched.id);
    }
    setActiveRole('gym');
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return activeRole === 'superadmin' ? (
    <SuperAdminDashboard
      activeRole={activeRole}
      setActiveRole={setActiveRole}
      gyms={gyms}
      setGyms={setGyms}
      activeGym={activeGym}
      onSelectGym={setActiveGymId}
      membersByGym={membersByGym}
      saasPayments={saasPayments}
      setSaasPayments={setSaasPayments}
      onAddGym={handleAddGym}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      dbConnected={dbConnected}
      onOpenLogin={() => setIsAuthenticated(false)}
    />
  ) : (
    <GymDashboard
      activeRole={activeRole}
      setActiveRole={setActiveRole}
      gyms={gyms}
      gymProfile={activeGym}
      onSelectGym={setActiveGymId}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      members={membersByGym[activeGym.id] || []}
      setMembers={setScopedMembers}
      gymPlans={plansByGym[activeGym.id] || []}
      setGymPlans={setScopedPlans}
      payments={memberPaymentsByGym[activeGym.id] || []}
      setPayments={setScopedPayments}
      ledgerEntries={gymLedgerByGym[activeGym.id] || []}
      setLedgerEntries={setScopedLedger}
      dbConnected={dbConnected}
      onOpenLogin={() => setIsAuthenticated(false)}
    />
  );
}
