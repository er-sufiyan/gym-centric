import React, { useState, useEffect, useCallback } from 'react';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import GymDashboard from './pages/gym/GymDashboard';
import LoginPage from './pages/auth/LoginPage';
import AdminLoginPage from './pages/auth/AdminLoginPage';
import {
  fetchBootstrap,
  apiVerifyAdminToken,
  ADMIN_SESSION_KEY,
  OWNER_SESSION_KEY
} from './services/api';
import {
  INITIAL_GYMS,
  INITIAL_PLANS_BY_GYM,
  INITIAL_MEMBERS_BY_GYM,
  INITIAL_MEMBER_PAYMENTS_BY_GYM,
  INITIAL_SAAS_PAYMENTS
} from './data/initialData';

const isAdminPath = () => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  return path === '/admin' || path.startsWith('/admin/');
};

const readStoredSession = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const PLATFORM_SETTINGS_KEY = 'gymcentric_platform_settings';

const readStoredPlatformSettings = () => {
  const stored = readStoredSession(PLATFORM_SETTINGS_KEY);
  return {
    supportWhatsApp: stored?.supportWhatsApp || import.meta.env.VITE_PLATFORM_WHATSAPP_NUMBER || ''
  };
};

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState(isAdminPath);
  const [adminRole, setAdminRole] = useState('superadmin'); // Used only inside /admin
  const [searchQuery, setSearchQuery] = useState('');
  const [dbConnected, setDbConnected] = useState(false);

  const [adminSession, setAdminSession] = useState(() => readStoredSession(ADMIN_SESSION_KEY));
  const [authenticatedOwner, setAuthenticatedOwner] = useState(() => readStoredSession(OWNER_SESSION_KEY));
  const [platformSettings, setPlatformSettings] = useState(readStoredPlatformSettings);

  const [gyms, setGyms] = useState(INITIAL_GYMS);
  const [activeGymId, setActiveGymId] = useState(INITIAL_GYMS[0].id);
  const [plansByGym, setPlansByGym] = useState(INITIAL_PLANS_BY_GYM);
  const [membersByGym, setMembersByGym] = useState(INITIAL_MEMBERS_BY_GYM);
  const [memberPaymentsByGym, setMemberPaymentsByGym] = useState(INITIAL_MEMBER_PAYMENTS_BY_GYM);
  const [gymLedgerByGym, setGymLedgerByGym] = useState(INITIAL_MEMBER_PAYMENTS_BY_GYM);
  const [saasPayments, setSaasPayments] = useState(INITIAL_SAAS_PAYMENTS);

  useEffect(() => {
    const onPopState = () => {
      setIsAdminRoute(isAdminPath());
      setSearchQuery('');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const syncFromDatabase = useCallback(async (tokenOverride) => {
    try {
      const res = await fetchBootstrap(tokenOverride);
      if (!res?.data) return;
      const {
        gyms: dbGyms,
        plansByGym: dbPlans,
        membersByGym: dbMembers,
        memberPaymentsByGym: dbPayments,
        gymLedgerByGym: dbLedger,
        saasPayments: dbSaas,
        platformSettings: dbPlatformSettings
      } = res.data;

      setDbConnected(true);
      if (dbPlatformSettings) {
        const nextSettings = {
          supportWhatsApp: dbPlatformSettings.supportWhatsApp || import.meta.env.VITE_PLATFORM_WHATSAPP_NUMBER || ''
        };
        setPlatformSettings(nextSettings);
        try {
          localStorage.setItem(PLATFORM_SETTINGS_KEY, JSON.stringify(nextSettings));
        } catch {
          // ignore storage errors
        }
      }
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

  // Sync database state on route/session change and verify persisted /admin JWT
  useEffect(() => {
    let active = true;

    const init = async () => {
      if (isAdminRoute) {
        if (adminSession?.token) {
          const valid = await apiVerifyAdminToken(adminSession.token);
          if (!active) return;
          if (!valid) {
            try {
              localStorage.removeItem(ADMIN_SESSION_KEY);
            } catch {
              // ignore
            }
            setAdminSession(null);
            return;
          }
          await syncFromDatabase(adminSession.token);
        }
      } else if (authenticatedOwner?.token) {
        await syncFromDatabase(authenticatedOwner.token);
      } else {
        await syncFromDatabase('');
      }
    };

    init();
    return () => {
      active = false;
    };
  }, [isAdminRoute, adminSession?.token, authenticatedOwner?.token, syncFromDatabase]);

  const normalizeDigits = (val = '') => String(val || '').replace(/\D/g, '').slice(-10);

  const loggedInGym = authenticatedOwner
    ? gyms.find((g) => g.id === authenticatedOwner.gymId) ||
      gyms.find((g) => normalizeDigits(g.phone) && normalizeDigits(g.phone) === normalizeDigits(authenticatedOwner.phone)) ||
      authenticatedOwner.gym ||
      null
    : null;

  const activeGym = isAdminRoute
    ? gyms.find((g) => g.id === activeGymId) || gyms[0]
    : loggedInGym || gyms[0];

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
    setGyms((prev) => (prev.some((g) => g.id === newGym.id) ? prev : [newGym, ...prev]));
    setMembersByGym((prev) => ({ ...prev, [newGym.id]: prev[newGym.id] || [] }));
    setPlansByGym((prev) => ({
      ...prev,
      [newGym.id]:
        prev[newGym.id] && prev[newGym.id].length > 0
          ? prev[newGym.id]
          : initialPlans && initialPlans.length > 0
          ? initialPlans
          : [
              { id: `${newGym.id}-plan-1`, name: '1 Month Standard', price: 1200, durationDays: 30 },
              { id: `${newGym.id}-plan-2`, name: '3 Months Value Pack', price: 3200, durationDays: 90 }
            ]
    }));
    setMemberPaymentsByGym((prev) => ({ ...prev, [newGym.id]: prev[newGym.id] || [] }));
    setGymLedgerByGym((prev) => ({ ...prev, [newGym.id]: prev[newGym.id] || [] }));
    if (initialPayment) {
      setSaasPayments((prev) => [initialPayment, ...prev]);
    }
  };

  const handleDeleteGym = (gymId) => {
    setGyms((prev) => {
      const remaining = prev.filter((g) => g.id !== gymId);
      setActiveGymId((currId) => (currId === gymId ? remaining[0]?.id || '' : currId));
      return remaining;
    });
    setMembersByGym((prev) => {
      const next = { ...prev };
      delete next[gymId];
      return next;
    });
    setPlansByGym((prev) => {
      const next = { ...prev };
      delete next[gymId];
      return next;
    });
    setMemberPaymentsByGym((prev) => {
      const next = { ...prev };
      delete next[gymId];
      return next;
    });
    setGymLedgerByGym((prev) => {
      const next = { ...prev };
      delete next[gymId];
      return next;
    });
    setSaasPayments((prev) => prev.filter((p) => p.gymId !== gymId));

    if (authenticatedOwner?.gymId === gymId) {
      try {
        localStorage.removeItem(OWNER_SESSION_KEY);
      } catch {
        // ignore
      }
      setAuthenticatedOwner(null);
    }
  };

  const handleLoginSuccess = async (gymData, token) => {
    const matched = gyms.find(
      (g) => g.id === gymData.id || (normalizeDigits(g.phone) && normalizeDigits(g.phone) === normalizeDigits(gymData.phone))
    );

    const resolvedGym = matched || {
      ...gymData,
      logoInitial:
        gymData.logoInitial ||
        (gymData.gymName || 'GY')
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((w) => w[0]?.toUpperCase() || '')
          .join(''),
      daysLeft: 30
    };

    if (!matched) {
      handleAddGym(resolvedGym);
    }

    const session = {
      gymId: resolvedGym.id,
      phone: resolvedGym.phone,
      token: token || '',
      gym: resolvedGym
    };
    try {
      localStorage.setItem(OWNER_SESSION_KEY, JSON.stringify(session));
    } catch {
      // ignore storage quota errors
    }

    setAuthenticatedOwner(session);
    setActiveGymId(resolvedGym.id);
    setSearchQuery('');

    await syncFromDatabase(session.token);
  };

  const handleOwnerLogout = () => {
    try {
      localStorage.removeItem(OWNER_SESSION_KEY);
    } catch {
      // ignore
    }
    setAuthenticatedOwner(null);
    setSearchQuery('');
  };

  const handleAdminLoginSuccess = async (token) => {
    const session = { token };
    try {
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    } catch {
      // ignore
    }
    setAdminSession(session);
    setAdminRole('superadmin');
    setSearchQuery('');
    await syncFromDatabase(token);
  };

  const handleAdminLogout = () => {
    try {
      localStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {
      // ignore
    }
    setAdminSession(null);
    setSearchQuery('');
  };

  const navigateToGymLogin = () => {
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    setIsAdminRoute(false);
    setSearchQuery('');
  };

  const handleUpdatePlatformSettings = (nextSettings) => {
    setPlatformSettings(nextSettings);
    try {
      localStorage.setItem(PLATFORM_SETTINGS_KEY, JSON.stringify(nextSettings));
    } catch {
      // ignore storage errors
    }
  };

  // ROUTE 1: /admin -> Password-Protected Super Admin Portal
  if (isAdminRoute) {
    if (!adminSession?.token) {
      return (
        <AdminLoginPage
          onAdminLoginSuccess={handleAdminLoginSuccess}
          onGoOwnerPortal={navigateToGymLogin}
        />
      );
    }

    return adminRole === 'superadmin' ? (
      <SuperAdminDashboard
        activeRole={adminRole}
        setActiveRole={setAdminRole}
        gyms={gyms}
        setGyms={setGyms}
        activeGym={activeGym}
        onSelectGym={setActiveGymId}
        membersByGym={membersByGym}
        saasPayments={saasPayments}
        setSaasPayments={setSaasPayments}
        onAddGym={handleAddGym}
        onDeleteGym={handleDeleteGym}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        dbConnected={dbConnected}
        platformSettings={platformSettings}
        onUpdatePlatformSettings={handleUpdatePlatformSettings}
        onOpenLogin={navigateToGymLogin}
        allowPortalSwitch={true}
        onLogout={handleAdminLogout}
      />
    ) : (
      <GymDashboard
        activeRole={adminRole}
        setActiveRole={setAdminRole}
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
        platformSettings={platformSettings}
        onOpenLogin={navigateToGymLogin}
        allowPortalSwitch={true}
        onLogout={handleAdminLogout}
      />
    );
  }

  // ROUTE 2: / -> Gym Owner Email/Mobile OTP Portal (Login or New Gym Registration)
  if (!authenticatedOwner || !loggedInGym) {
    return <LoginPage gyms={[]} onLoginSuccess={handleLoginSuccess} />;
  }

  // Scoped Gym Owner Dashboard (strictly for the OTP-verified Gym Owner)
  return (
    <GymDashboard
      activeRole="gym"
      setActiveRole={() => {}}
      gyms={[loggedInGym]}
      gymProfile={loggedInGym}
      onSelectGym={() => {}}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      members={membersByGym[loggedInGym.id] || []}
      setMembers={setScopedMembers}
      gymPlans={plansByGym[loggedInGym.id] || []}
      setGymPlans={setScopedPlans}
      payments={memberPaymentsByGym[loggedInGym.id] || []}
      setPayments={setScopedPayments}
      ledgerEntries={gymLedgerByGym[loggedInGym.id] || []}
      setLedgerEntries={setScopedLedger}
      dbConnected={dbConnected}
      platformSettings={platformSettings}
      allowPortalSwitch={false}
      onLogout={handleOwnerLogout}
    />
  );
}
