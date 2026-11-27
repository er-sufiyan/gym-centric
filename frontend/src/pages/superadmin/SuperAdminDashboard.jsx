import React, { useState, useMemo, useCallback } from 'react';
import {
  LayoutGrid,
  Building2,
  Users,
  AlertCircle,
  IndianRupee,
  Power,
  PlusCircle,
  UserPlus,
  CheckCircle2,
  ShieldCheck,
  Receipt,
  MapPin,
  Phone,
  MessageCircle,
  Send,
  Trash2,
  X
} from 'lucide-react';
import SidebarLayout from '../../components/common/SidebarLayout';
import StatCard from '../../components/common/StatCard';
import TrendChart from '../../components/common/TrendChart';
import PlanModal from '../../components/common/PlanModal';
import WhatsAppReceiptModal from '../../components/common/WhatsAppReceiptModal';
import GymOwnerDetailModal from '../../components/common/GymOwnerDetailModal';
import BroadcastMessageModal from '../../components/common/BroadcastMessageModal';
import ConfirmDeleteModal from '../../components/common/ConfirmDeleteModal';
import { getOneYearHistory } from '../../utils/billingCycle';
import { buildWhatsAppUrl } from '../../utils/whatsapp';
import {
  apiCreateGym,
  apiToggleGymStatus,
  apiDeleteGym,
  apiUpdateGymPlan,
  apiRecordSaasPayment,
  apiDeleteSaasPayment,
  apiUpdatePlatformSettings
} from '../../services/api';

export default function SuperAdminDashboard({
  activeRole,
  setActiveRole,
  gyms,
  setGyms,
  activeGym,
  onSelectGym,
  membersByGym = {},
  memberStatsByGym = {},
  saasPayments,
  setSaasPayments,
  onAddGym,
  onDeleteGym,
  searchQuery = '',
  setSearchQuery,
  dbConnected = false,
  platformSettings = {},
  onUpdatePlatformSettings,
  onOpenLogin,
  allowPortalSwitch = true,
  onLogout
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'active-owners' | 'active-members' | 'tenants' | 'billing'
  const [selectedActiveGymId, setSelectedActiveGymId] = useState('ALL');
  const [tenantFilter, setTenantFilter] = useState('ALL');

  const [selectedGymForPlan, setSelectedGymForPlan] = useState(null);
  const [selectedDetailGym, setSelectedDetailGym] = useState(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isManualPayOpen, setIsManualPayOpen] = useState(false);
  const [isAddGymOpen, setIsAddGymOpen] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [isSupportWaModalOpen, setIsSupportWaModalOpen] = useState(false);
  const [supportWaInput, setSupportWaInput] = useState(platformSettings?.supportWhatsApp || '');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [gymToDelete, setGymToDelete] = useState(null);
  const [receiptToSend, setReceiptToSend] = useState(null);
  const [sendWaOnManual, setSendWaOnManual] = useState(true);
  const [sendWaOnOnboard, setSendWaOnOnboard] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const [manualEntry, setManualEntry] = useState({
    gymId: gyms[0]?.id || '',
    amount: '',
    mode: 'UPI',
    notes: 'Platform Subscription Fee'
  });

  const [newGymForm, setNewGymForm] = useState({
    gymName: '',
    ownerName: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    saasPlan: 'PRO',
    duration: '1_MONTH',
    paymentMode: 'UPI'
  });

  // Active-only sets & privacy-safe member counts (no individual member PII in Super Admin)
  const activeGyms = useMemo(() => gyms.filter((g) => g.status === 'ACTIVE'), [gyms]);

  const getGymMemberStats = useCallback(
    (gymId) => {
      const serverStats = memberStatsByGym?.[gymId];
      if (serverStats) {
        return {
          active: Number(serverStats.active || 0),
          expiring: Number(serverStats.expiring || 0),
          blocked: Number(serverStats.blocked || 0),
          total: Number(serverStats.total || 0)
        };
      }
      const list = membersByGym?.[gymId] || [];
      return list.reduce(
        (acc, m) => {
          const daysLeft = Number(m.daysLeft ?? 0);
          const isBlockedOrExpired = m.status === 'EXPIRED' || daysLeft <= 0;
          acc.total += 1;
          if (isBlockedOrExpired) {
            acc.blocked += 1;
          } else {
            acc.active += 1;
            if (daysLeft <= 7) acc.expiring += 1;
          }
          return acc;
        },
        { active: 0, expiring: 0, blocked: 0, total: 0 }
      );
    },
    [memberStatsByGym, membersByGym]
  );

  const memberReportRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const sourceGyms =
      selectedActiveGymId === 'ALL'
        ? gyms
        : gyms.filter((g) => g.id === selectedActiveGymId);

    return sourceGyms
      .filter((gym) => {
        if (!q) return true;
        return (
          gym.gymName.toLowerCase().includes(q) ||
          gym.ownerName.toLowerCase().includes(q) ||
          (gym.city || '').toLowerCase().includes(q)
        );
      })
      .map((gym) => ({
        gym,
        stats: getGymMemberStats(gym.id)
      }));
  }, [gyms, selectedActiveGymId, searchQuery, getGymMemberStats]);

  const memberReportTotals = useMemo(() => {
    return memberReportRows.reduce(
      (acc, row) => {
        acc.active += row.stats.active;
        acc.expiring += row.stats.expiring;
        acc.blocked += row.stats.blocked;
        acc.total += row.stats.total;
        return acc;
      },
      { active: 0, expiring: 0, blocked: 0, total: 0 }
    );
  }, [memberReportRows]);

  const totalActiveMembers = useMemo(() => {
    return activeGyms.reduce((sum, g) => sum + getGymMemberStats(g.id).active, 0);
  }, [activeGyms, getGymMemberStats]);

  const filteredActiveGyms = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return activeGyms;
    return activeGyms.filter(
      (g) =>
        g.gymName.toLowerCase().includes(q) ||
        g.ownerName.toLowerCase().includes(q) ||
        g.phone.toLowerCase().includes(q) ||
        (g.city || '').toLowerCase().includes(q)
    );
  }, [activeGyms, searchQuery]);

  const yearlySaas = useMemo(() => getOneYearHistory(saasPayments), [saasPayments]);
  const monthlySaasPayments = yearlySaas.items;

  const expiringGymsCount = gyms.filter((g) => g.daysLeft <= 7 && g.daysLeft > 0).length;
  const totalRevenue = yearlySaas.totalAmount;
  const totalUpi = yearlySaas.upiTotal;
  const totalCash = yearlySaas.cashTotal;

  const filteredTenants = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return gyms.filter((g) => {
      const matchesSearch =
        !q ||
        g.gymName.toLowerCase().includes(q) ||
        g.ownerName.toLowerCase().includes(q) ||
        g.phone.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (tenantFilter === 'ACTIVE') return g.status === 'ACTIVE';
      if (tenantFilter === 'BLOCKED') return g.status === 'BLOCKED';
      if (tenantFilter === 'EXPIRING') return g.daysLeft <= 7 && g.daysLeft > 0;
      return true;
    });
  }, [gyms, tenantFilter, searchQuery]);

  const trafficData = useMemo(
    () => [
      { label: 'Nov 18', value: Math.max(2, totalActiveMembers - 3) },
      { label: 'Nov 19', value: Math.max(2, totalActiveMembers - 2) },
      { label: 'Nov 20', value: Math.max(3, totalActiveMembers - 2) },
      { label: 'Nov 21', value: Math.max(3, totalActiveMembers - 1) },
      { label: 'Nov 22', value: Math.max(4, totalActiveMembers - 1) },
      { label: 'Nov 23', value: totalActiveMembers },
      { label: 'Nov 24', value: totalActiveMembers },
      { label: 'Nov 25', value: totalActiveMembers }
    ],
    [totalActiveMembers]
  );

  const toggleGymStatus = async (gymId) => {
    if (dbConnected) {
      try {
        const res = await apiToggleGymStatus(gymId);
        setGyms((prev) => prev.map((g) => (g.id === gymId ? res.gym : g)));
        if (selectedActiveGymId === gymId && res.gym.status === 'BLOCKED') {
          setSelectedActiveGymId('ALL');
        }
        showToast(`${res.gym.gymName} is now ${res.gym.status} (saved to DB).`);
        return;
      } catch (err) {
        showToast(err.message);
        return;
      }
    }

    let updatedName = '';
    let updatedStatus = '';
    setGyms((prev) =>
      prev.map((g) => {
        if (g.id === gymId) {
          const nextStatus = g.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
          updatedName = g.gymName;
          updatedStatus = nextStatus;
          return { ...g, status: nextStatus };
        }
        return g;
      })
    );
    if (selectedActiveGymId === gymId && updatedStatus === 'BLOCKED') {
      setSelectedActiveGymId('ALL');
    }
    showToast(`${updatedName} is now ${updatedStatus}.`);
  };

  const handleSaveManualPayment = async (e) => {
    e.preventDefault();
    if (!manualEntry.amount || Number(manualEntry.amount) <= 0) return;
    const targetGym = gyms.find((g) => g.id === manualEntry.gymId) || gyms[0];
    if (!targetGym) return;

    let savedTx = null;
    if (dbConnected) {
      try {
        const res = await apiRecordSaasPayment({
          gymId: targetGym.id,
          amount: Number(manualEntry.amount),
          mode: manualEntry.mode,
          notes: manualEntry.notes || 'Platform Subscription Fee'
        });
        savedTx = res.payment;
      } catch (err) {
        showToast(err.message);
        return;
      }
    }

    const newTx = savedTx || {
      id: 'tx-' + Date.now(),
      gymId: targetGym.id,
      gymName: targetGym.gymName,
      ownerName: targetGym.ownerName,
      amount: Number(manualEntry.amount),
      mode: manualEntry.mode,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      invoiceNo: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      notes: manualEntry.notes || 'Platform Subscription Fee'
    };

    setSaasPayments((prev) => [newTx, ...prev]);
    setIsManualPayOpen(false);
    setManualEntry({ gymId: gyms[0]?.id || '', amount: '', mode: 'UPI', notes: 'Platform Subscription Fee' });
    showToast(`SaaS payment ₹${newTx.amount.toLocaleString()} recorded for ${targetGym.gymName}.`);
    if (sendWaOnManual) {
      setReceiptToSend({
        type: 'SAAS',
        gymId: targetGym.id,
        invoiceNo: newTx.invoiceNo,
        gymName: targetGym.gymName,
        recipientName: targetGym.ownerName,
        recipientPhone: targetGym.phone,
        recipientEmail: targetGym.email || '',
        planName: newTx.notes,
        amount: newTx.amount,
        mode: newTx.mode,
        date: newTx.date,
        validUntil: targetGym.validUntil
      });
    }
  };

  const handleUpdateSubscription = async ({ gymId, saasPlan, duration, amount, paymentMode, sendWhatsAppReceipt }) => {
    const targetGym = gyms.find((g) => g.id === gymId);
    if (dbConnected) {
      try {
        const res = await apiUpdateGymPlan(gymId, { saasPlan, duration, amount, paymentMode });
        setSaasPayments((prev) => [res.payment, ...prev]);
        setGyms((prev) => prev.map((g) => (g.id === gymId ? res.gym : g)));
        showToast(`Receipt #${res.payment.invoiceNo} saved to DB • ${res.gym.gymName} renewed.`);
        if (sendWhatsAppReceipt) {
          setReceiptToSend({
            type: 'SAAS',
            gymId: res.gym.id,
            invoiceNo: res.payment.invoiceNo,
            gymName: res.gym.gymName,
            recipientName: res.gym.ownerName,
            recipientPhone: res.gym.phone,
            recipientEmail: res.gym.email || '',
            planName: res.payment.notes,
            amount: res.payment.amount,
            mode: res.payment.mode,
            date: res.payment.date,
            validUntil: res.gym.validUntil
          });
        }
        return;
      } catch (err) {
        showToast(err.message);
        return;
      }
    }

    const today = new Date();
    let daysToAdd = 30;
    if (duration === '3_MONTHS') daysToAdd = 90;
    if (duration === '6_MONTHS') daysToAdd = 180;
    if (duration === '1_YEAR') daysToAdd = 365;

    const newExpiry = new Date(today.setDate(today.getDate() + daysToAdd));
    const formattedExpiry = newExpiry.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const invoiceNo = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
    const txDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const planLabel = `${saasPlan} Plan (${duration.replace('_', ' ')})`;

    setSaasPayments((prev) => [
      {
        id: 'tx-' + Date.now(),
        gymId,
        gymName: targetGym?.gymName || 'Gym',
        ownerName: targetGym?.ownerName || 'Owner',
        amount: Number(amount),
        mode: paymentMode,
        date: txDate,
        invoiceNo,
        notes: planLabel
      },
      ...prev
    ]);

    setGyms((prev) =>
      prev.map((g) =>
        g.id === gymId
          ? { ...g, saasPlan, status: 'ACTIVE', validUntil: formattedExpiry, daysLeft: daysToAdd }
          : g
      )
    );

    showToast(`Receipt #${invoiceNo} generated • ${targetGym?.gymName} renewed (${saasPlan}).`);
    if (sendWhatsAppReceipt && targetGym) {
      setReceiptToSend({
        type: 'SAAS',
        gymId: targetGym.id,
        invoiceNo,
        gymName: targetGym.gymName,
        recipientName: targetGym.ownerName,
        recipientPhone: targetGym.phone,
        recipientEmail: targetGym.email || '',
        planName: planLabel,
        amount: Number(amount),
        mode: paymentMode,
        date: txDate,
        validUntil: formattedExpiry
      });
    }
  };

  const handleOnboardGym = async (e) => {
    e.preventDefault();
    if (!newGymForm.gymName.trim() || !newGymForm.ownerName.trim() || !newGymForm.phone.trim()) return;

    if (dbConnected) {
      try {
        const res = await apiCreateGym(newGymForm);
        onAddGym(res.gym, res.initialPayment, res.plans);
        setIsAddGymOpen(false);
        setNewGymForm({
          gymName: '',
          ownerName: '',
          phone: '',
          email: '',
          city: '',
          address: '',
          saasPlan: 'PRO',
          duration: '1_MONTH',
          paymentMode: 'UPI'
        });
        showToast(`${res.gym.gymName} saved to MongoDB!`);
        if (sendWaOnOnboard) {
          setReceiptToSend({
            type: 'SAAS_WELCOME',
            gymId: res.gym.id,
            invoiceNo: res.initialPayment.invoiceNo,
            gymName: res.gym.gymName,
            recipientName: res.gym.ownerName,
            recipientPhone: res.gym.phone,
            recipientEmail: res.gym.email || '',
            address: res.gym.address,
            planName: res.initialPayment.notes,
            amount: res.initialPayment.amount,
            mode: res.initialPayment.mode,
            date: res.initialPayment.date,
            validUntil: res.gym.validUntil
          });
        }
        return;
      } catch (err) {
        showToast(err.message);
        return;
      }
    }

    const durationMap = { '10_DAYS': 10, '1_MONTH': 30, '3_MONTHS': 90, '6_MONTHS': 180, '1_YEAR': 365 };
    const priceMap = {
      BASE: { '10_DAYS': 0, '1_MONTH': 2000, '3_MONTHS': 5000, '6_MONTHS': 10000, '1_YEAR': 18000 },
      PRO: { '10_DAYS': 0, '1_MONTH': 3000, '3_MONTHS': 8000, '6_MONTHS': 15000, '1_YEAR': 26000 }
    };

    const days = durationMap[newGymForm.duration] || 30;
    const amount = priceMap[newGymForm.saasPlan]?.[newGymForm.duration] ?? 2000;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);

    const initials = newGymForm.gymName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('');

    const gymId = 'g-' + Date.now();
    const joinedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    const createdGym = {
      id: gymId,
      gymName: newGymForm.gymName.trim(),
      ownerName: newGymForm.ownerName.trim(),
      phone: newGymForm.phone.trim(),
      email: newGymForm.email.trim(),
      city: newGymForm.city.trim() || 'India',
      address: newGymForm.address.trim() || newGymForm.city.trim() || 'India',
      joinedDate,
      logoInitial: initials || 'GY',
      saasPlan: newGymForm.saasPlan,
      validUntil: expiry.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
      daysLeft: days,
      status: 'ACTIVE'
    };

    const initialPayment = {
      id: 'tx-' + Date.now(),
      gymId,
      gymName: createdGym.gymName,
      ownerName: createdGym.ownerName,
      amount,
      mode: newGymForm.paymentMode,
      date: joinedDate,
      invoiceNo: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      notes: `New ${newGymForm.saasPlan} Onboarding (${newGymForm.duration.replace('_', ' ')})`
    };

    onAddGym(createdGym, initialPayment);
    setIsAddGymOpen(false);
    setNewGymForm({
      gymName: '',
      ownerName: '',
      phone: '',
      email: '',
      city: '',
      address: '',
      saasPlan: 'PRO',
      duration: '1_MONTH',
      paymentMode: 'UPI'
    });
    showToast(`${createdGym.gymName} onboarded with isolated workspace!`);
    if (sendWaOnOnboard) {
      setReceiptToSend({
        type: 'SAAS_WELCOME',
        gymId: createdGym.id,
        invoiceNo: initialPayment.invoiceNo,
        gymName: createdGym.gymName,
        recipientName: createdGym.ownerName,
        recipientPhone: createdGym.phone,
        recipientEmail: createdGym.email || '',
        address: createdGym.address,
        planName: initialPayment.notes,
        amount: initialPayment.amount,
        mode: initialPayment.mode,
        date: initialPayment.date,
        validUntil: createdGym.validUntil
      });
    }
  };

  const openSendActivePlan = (gym, explicitActiveCount) => {
    const activeMembersCount =
      explicitActiveCount !== undefined
        ? explicitActiveCount
        : getGymMemberStats(gym.id).active;

    setReceiptToSend({
      type: 'SAAS_ACTIVE_PLAN',
      gymId: gym.id,
      gymName: gym.gymName,
      recipientName: gym.ownerName,
      recipientPhone: gym.phone,
      address: gym.address || gym.city,
      planName: `${gym.saasPlan} PLAN`,
      status: gym.status,
      validUntil: gym.validUntil,
      daysLeft: gym.daysLeft,
      activeMembersCount
    });
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'active-owners', label: 'Active Owners', icon: Building2, count: activeGyms.length },
    { id: 'active-members', label: 'Members Report', icon: Users, count: memberReportTotals.total },
    { id: 'tenants', label: 'Tenant Registry', icon: ShieldCheck, count: gyms.length },
    { id: 'billing', label: 'SaaS Billing', icon: Receipt, count: monthlySaasPayments.length }
  ];

  const renderActiveOwnersCards = () => (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-cyan-400">Active Tenants</p>
          <h3 className="text-sm font-bold text-white mt-0.5">Active Gym Owners</h3>
        </div>
        <button
          type="button"
          onClick={() => setSelectedActiveGymId('ALL')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
            selectedActiveGymId === 'ALL'
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
              : 'bg-[#060b0e] text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          All Active ({activeGyms.length})
        </button>
      </div>

      <div className="p-3 space-y-2.5 max-h-[460px] overflow-y-auto">
        {filteredActiveGyms.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500">No active gym owners match your search.</div>
        ) : (
          filteredActiveGyms.map((gym) => {
            const gymStats = getGymMemberStats(gym.id);
            const activeMemCount = gymStats.active;
            const isSelected = selectedActiveGymId === gym.id;

            return (
              <button
                key={gym.id}
                type="button"
                onClick={() => setSelectedActiveGymId(isSelected ? 'ALL' : gym.id)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-500/40'
                    : 'bg-[#060b0e]/70 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-extrabold text-xs text-cyan-300 flex-shrink-0">
                      {gym.logoInitial}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{gym.gymName}</p>
                      <p className="text-xs text-slate-300">{gym.ownerName}</p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {gym.phone}
                        </span>
                        {gym.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {gym.city}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        gym.saasPlan === 'PRO'
                          ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {gym.saasPlan}
                    </span>
                    <p className="text-xs font-extrabold text-white mt-2">{activeMemCount} Active</p>
                    <p className="text-[10px] text-slate-500">members</p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const renderMembersReportTable = () => (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-cyan-400">
            Privacy-Protected Counts Only
          </p>
          <h3 className="text-sm font-bold text-white mt-0.5 flex items-center gap-2">
            Members Report
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300">
              {memberReportTotals.total} TOTAL
            </span>
          </h3>
        </div>

        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 bg-[#060b0e] px-3 py-1.5 rounded-lg border border-slate-800">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Member details private to each gym owner
        </span>
      </div>

      {/* Aggregate Counts Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b border-slate-800/70 bg-[#060b0e]/50">
        <div className="p-3 rounded-xl bg-[#0b1418] border border-cyan-500/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Members</p>
          <p className="text-xl font-extrabold text-cyan-300 mt-1">{memberReportTotals.active}</p>
        </div>
        <div className="p-3 rounded-xl bg-[#0b1418] border border-amber-500/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expiring (≤7d)</p>
          <p className="text-xl font-extrabold text-amber-300 mt-1">{memberReportTotals.expiring}</p>
        </div>
        <div className="p-3 rounded-xl bg-[#0b1418] border border-rose-500/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Blocked / Expired</p>
          <p className="text-xl font-extrabold text-rose-400 mt-1">{memberReportTotals.blocked}</p>
        </div>
        <div className="p-3 rounded-xl bg-[#0b1418] border border-slate-700/80">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Members</p>
          <p className="text-xl font-extrabold text-white mt-1">{memberReportTotals.total}</p>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        {memberReportRows.length === 0 ? (
          <div className="text-center py-14 px-4 text-xs text-slate-500">
            No gyms match your filter.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-[#060b0e]/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800/80">
              <tr>
                <th className="py-3 px-5">Gym &amp; Owner</th>
                <th className="py-3 px-4 text-right">Active</th>
                <th className="py-3 px-4 text-right">Expiring</th>
                <th className="py-3 px-4 text-right">Blocked / Expired</th>
                <th className="py-3 px-5 text-right">Total Members</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {memberReportRows.map(({ gym, stats }) => (
                <tr key={gym.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-center font-bold text-[11px] text-cyan-300 flex-shrink-0">
                        {gym.logoInitial}
                      </div>
                      <div>
                        <p className="font-bold text-white text-xs">{gym.gymName}</p>
                        <p className="text-[10px] text-slate-500">
                          {gym.ownerName} • {gym.status}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-cyan-300">{stats.active}</td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-amber-300">{stats.expiring}</td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-rose-400">{stats.blocked}</td>
                  <td className="py-3.5 px-5 text-right font-extrabold text-white">{stats.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  return (
    <SidebarLayout
      brandInitial="GC"
      brandName="GymCentric"
      brandSubtitle="SUPER ADMIN"
      navItems={navItems}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      activeRole={activeRole}
      setActiveRole={setActiveRole}
      gyms={gyms}
      activeGym={activeGym}
      onSelectGym={onSelectGym}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      searchPlaceholder="Search gym owners, brands, or phone..."
      userProfile={{ initial: 'SA', name: 'Platform Super Admin', role: 'Administrator' }}
      dbConnected={dbConnected}
      onOpenLogin={onOpenLogin}
      allowPortalSwitch={allowPortalSwitch}
      onLogout={onLogout}
    >
      <div className="space-y-6">
        {toastMessage && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage('')} className="text-cyan-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Hero Welcome Header (Matching Reference Layout) */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-cyan-400">
              Your Platform Overview
            </p>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight mt-1">
              Welcome back, Super Admin
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Active gym owners and active members are shown together; SaaS plans, lockouts, and billing stay separate.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setSupportWaInput(platformSettings?.supportWhatsApp || '');
                setSettingsError('');
                setIsSupportWaModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0b1418] hover:bg-slate-900 border border-slate-700/80 text-slate-200 font-semibold rounded-xl text-xs transition-colors"
              title="Set your WhatsApp number for suspended gym owners to contact you"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              {platformSettings?.supportWhatsApp ? 'Support WhatsApp' : 'Set Support WhatsApp'}
            </button>

            <button
              onClick={() => setIsBroadcastOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0b1418] hover:bg-slate-900 border border-slate-700/80 text-slate-200 font-semibold rounded-xl text-xs transition-colors"
            >
              <Send className="w-4 h-4 text-emerald-400" /> Broadcast
            </button>

            <button
              onClick={() => setIsAddGymOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0b1418] hover:bg-slate-900 border border-slate-700/80 text-slate-200 font-semibold rounded-xl text-xs transition-colors"
            >
              <UserPlus className="w-4 h-4 text-cyan-400" /> Onboard Owner
            </button>

            <button
              onClick={() => {
                setManualEntry((prev) => ({
                  ...prev,
                  gymId: gyms.some((g) => g.id === prev.gymId) ? prev.gymId : gyms[0]?.id || ''
                }));
                setIsManualPayOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-400 hover:bg-cyan-300 text-[#060b0e] font-extrabold rounded-xl text-xs transition-colors shadow-lg shadow-cyan-500/15"
            >
              <PlusCircle className="w-4 h-4" /> Record SaaS Payment
            </button>
          </div>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Active Gym Owners"
                value={activeGyms.length}
                subtext={`Of ${gyms.length} registered tenants`}
                icon={Building2}
                color="cyan"
              />
              <StatCard
                title="Active Members"
                value={totalActiveMembers}
                subtext={`${memberReportTotals.expiring} expiring • ${memberReportTotals.blocked} blocked • ${memberReportTotals.total} total`}
                icon={Users}
                color="emerald"
              />
              <StatCard
                title="Expiring Soon"
                value={expiringGymsCount}
                subtext="Within 7 days"
                icon={AlertCircle}
                color="amber"
              />
              <StatCard
                title="SaaS Revenue (1 Year)"
                value={`₹${totalRevenue.toLocaleString()}`}
                subtext={`UPI: ₹${totalUpi.toLocaleString()} • Cash: ₹${totalCash.toLocaleString()}`}
                icon={IndianRupee}
                color="cyan"
              />
            </div>

            <TrendChart
              eyebrow="Platform Traffic"
              title="Active Member Growth (Active Tenants)"
              subtitle="Live count"
              data={trafficData}
              valueSuffix=" Active Members"
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5">{renderActiveOwnersCards()}</div>
              <div className="lg:col-span-7">{renderMembersReportTable()}</div>
            </div>
          </>
        )}

        {/* ACTIVE OWNERS TAB (ACTIVE ONLY) */}
        {activeTab === 'active-owners' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5">{renderActiveOwnersCards()}</div>
            <div className="lg:col-span-7">{renderMembersReportTable()}</div>
          </div>
        )}

        {/* MEMBERS REPORT TAB (COUNTS ONLY) */}
        {activeTab === 'active-members' && renderMembersReportTable()}

        {/* TENANT REGISTRY & LOCKOUTS (SEPARATE SUPER ADMIN CONTROL) */}
        {activeTab === 'tenants' && (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-cyan-400">
                  Separate Platform Control
                </p>
                <h3 className="text-sm font-bold text-white mt-0.5">Gym Tenant Registry &amp; Lockouts</h3>
              </div>

              <div className="flex items-center bg-[#060b0e] p-1 rounded-xl border border-slate-800 text-xs">
                {['ALL', 'ACTIVE', 'EXPIRING', 'BLOCKED'].map((filterKey) => (
                  <button
                    key={filterKey}
                    onClick={() => setTenantFilter(filterKey)}
                    className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                      tenantFilter === filterKey
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-white border border-transparent'
                    }`}
                  >
                    {filterKey}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#060b0e]/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800/80">
                  <tr>
                    <th className="py-3 px-6">Gym &amp; Owner</th>
                    <th className="py-3 px-6">SaaS Plan</th>
                    <th className="py-3 px-6">Members Report (Counts)</th>
                    <th className="py-3 px-6">Validity</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTenants.map((gym) => {
                    const gymStats = getGymMemberStats(gym.id);
                    const activeCount = gymStats.active;
                    return (
                      <tr
                        key={gym.id}
                        onClick={() => setSelectedDetailGym(gym)}
                        className="hover:bg-cyan-500/[0.04] transition-colors cursor-pointer"
                        title="Tap to view full gym details, address & send active plan"
                      >
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center font-bold text-xs text-white flex-shrink-0">
                              {gym.logoInitial}
                            </div>
                            <div>
                              <p className="font-bold text-white text-xs">{gym.gymName}</p>
                              <p className="text-[11px] text-slate-400">
                                {gym.ownerName} • {gym.phone}
                              </p>
                              {gym.address && (
                                <p className="text-[10px] text-slate-500 truncate max-w-[260px]">
                                  {gym.address}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-6">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              gym.saasPlan === 'PRO'
                                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {gym.saasPlan} PLAN
                          </span>
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="space-y-0.5">
                            <p className="font-bold text-white">
                              <span className="text-cyan-300">{gymStats.active} Active</span>
                              <span className="text-slate-500"> / {gymStats.total} Total</span>
                            </p>
                            <p className="text-[10px] text-slate-400">
                              <span className="text-amber-300">{gymStats.expiring} Expiring</span> •{' '}
                              <span className="text-rose-400">{gymStats.blocked} Blocked</span>
                            </p>
                          </div>
                        </td>
                        <td className="py-3.5 px-6">
                          <p className="font-semibold text-white">{gym.validUntil}</p>
                          <p
                            className={`text-[10px] font-medium ${
                              gym.daysLeft <= 0
                                ? 'text-rose-400 font-bold'
                                : gym.daysLeft <= 7
                                ? 'text-amber-400 font-bold'
                                : 'text-slate-400'
                            }`}
                          >
                            {gym.daysLeft > 0 ? `${gym.daysLeft} days remaining` : 'Expired'}
                          </p>
                        </td>
                        <td className="py-3.5 px-6">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              gym.status === 'ACTIVE'
                                ? 'bg-cyan-500/15 text-cyan-300'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                gym.status === 'ACTIVE' ? 'bg-cyan-400' : 'bg-rose-400'
                              }`}
                            ></span>
                            {gym.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openSendActivePlan(gym, activeCount);
                              }}
                              className="px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1"
                              title="Send Active Plan Details via WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" /> Send Plan
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedGymForPlan(gym);
                                setIsPlanModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold transition-colors"
                            >
                              Renew Plan
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleGymStatus(gym.id);
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-colors flex items-center gap-1 ${
                                gym.status === 'ACTIVE'
                                  ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                                  : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
                              }`}
                            >
                              <Power className="w-3 h-3" />
                              {gym.status === 'ACTIVE' ? 'Block' : 'Allow'}
                            </button>

                            {gym.status === 'BLOCKED' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setGymToDelete(gym);
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-[11px] font-black bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white transition-colors flex items-center gap-1"
                                title="Permanently delete blocked gym and all its members/data"
                              >
                                <Trash2 className="w-3 h-3" /> Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SAAS BILLING LEDGER */}
        {activeTab === 'billing' && (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
              <div>
                <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-cyan-400">
                  Platform Billing
                </p>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  SaaS Billing
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="px-3 py-1 rounded-lg bg-[#060b0e] border border-slate-800 text-slate-300">
                  UPI: ₹{totalUpi.toLocaleString()}
                </span>
                <span className="px-3 py-1 rounded-lg bg-[#060b0e] border border-slate-800 text-slate-300">
                  Cash: ₹{totalCash.toLocaleString()}
                </span>
              </div>
            </div>

            {monthlySaasPayments.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500">
                No SaaS billing transactions yet.
              </div>
            ) : (
              <div className="space-y-2">
                {monthlySaasPayments.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-[#060b0e] border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
                      #{p.invoiceNo || 'INV'}
                    </span>
                    <div>
                      <span className="font-bold text-white">{p.gymName}</span>
                      <span className="text-slate-400 text-[11px] ml-2">({p.notes})</span>
                      <p className="text-[10px] text-slate-500">Owner: {p.ownerName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className="text-slate-400 text-[11px]">{p.date}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                      {p.mode}
                    </span>
                    <span className="font-extrabold text-cyan-300">+₹{p.amount.toLocaleString()}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const matchedGym = gyms.find((g) => g.id === p.gymId || g.gymName === p.gymName);
                        setReceiptToSend({
                          type: 'SAAS',
                          gymId: matchedGym?.id || p.gymId,
                          invoiceNo: p.invoiceNo,
                          gymName: p.gymName,
                          recipientName: p.ownerName,
                          recipientPhone: matchedGym?.phone || '',
                          recipientEmail: matchedGym?.email || '',
                          planName: p.notes,
                          amount: p.amount,
                          mode: p.mode,
                          date: p.date,
                          validUntil: matchedGym?.validUntil
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[11px] font-bold flex items-center gap-1 transition-colors"
                      title="Send Receipt via WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Receipt
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentToDelete(p)}
                      className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-bold flex items-center gap-1 transition-colors"
                      title="Delete Transaction from Site & Database"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <PlanModal
        key={selectedGymForPlan?.id || 'plan-modal'}
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        gym={selectedGymForPlan}
        onSave={handleUpdateSubscription}
      />

      {isManualPayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0b1418] border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Record SaaS Payment</h3>
              <button onClick={() => setIsManualPayOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveManualPayment} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Select Gym Owner
                </label>
                <select
                  value={manualEntry.gymId}
                  onChange={(e) => setManualEntry({ ...manualEntry, gymId: e.target.value })}
                  className="w-full bg-[#060b0e] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {gyms.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.gymName} ({g.ownerName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Amount Received (₹)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 35000"
                  value={manualEntry.amount}
                  onChange={(e) => setManualEntry({ ...manualEntry, amount: e.target.value })}
                  className="w-full bg-[#060b0e] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={manualEntry.mode}
                    onChange={(e) => setManualEntry({ ...manualEntry, mode: e.target.value })}
                    className="w-full bg-[#060b0e] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="UPI">Direct UPI Transfer</option>
                    <option value="CASH">Cash Payment</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={manualEntry.notes}
                    onChange={(e) => setManualEntry({ ...manualEntry, notes: e.target.value })}
                    className="w-full bg-[#060b0e] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <label className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#060b0e] border border-emerald-500/30 cursor-pointer">
                <span className="flex items-center gap-2 text-xs text-slate-200 font-semibold">
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  Send WhatsApp Receipt to Gym Owner
                </span>
                <input
                  type="checkbox"
                  checked={sendWaOnManual}
                  onChange={(e) => setSendWaOnManual(e.target.checked)}
                  className="accent-emerald-400 w-4 h-4 rounded cursor-pointer"
                />
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualPayOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-cyan-400 text-[#060b0e] font-extrabold rounded-xl text-xs hover:bg-cyan-300"
                >
                  Save SaaS Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddGymOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0b1418] border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Onboard New Gym Owner</h3>
              <button onClick={() => setIsAddGymOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleOnboardGym} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Gym Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Barbell Club"
                  value={newGymForm.gymName}
                  onChange={(e) => setNewGymForm({ ...newGymForm, gymName: e.target.value })}
                  className="w-full bg-[#060b0e] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Owner Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suresh Raina"
                    value={newGymForm.ownerName}
                    onChange={(e) => setNewGymForm({ ...newGymForm, ownerName: e.target.value })}
                    className="w-full bg-[#060b0e] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Jaipur"
                    value={newGymForm.city}
                    onChange={(e) => setNewGymForm({ ...newGymForm, city: e.target.value })}
                    className="w-full bg-[#060b0e] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98765 00000"
                    value={newGymForm.phone}
                    onChange={(e) => setNewGymForm({ ...newGymForm, phone: e.target.value })}
                    className="w-full bg-[#060b0e] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="owner@gym.in"
                    value={newGymForm.email}
                    onChange={(e) => setNewGymForm({ ...newGymForm, email: e.target.value })}
                    className="w-full bg-[#060b0e] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Full Gym Address
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 24 Main Road, Sector 5, Jaipur"
                  value={newGymForm.address}
                  onChange={(e) => setNewGymForm({ ...newGymForm, address: e.target.value })}
                  className="w-full bg-[#060b0e] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Plan
                  </label>
                  <select
                    value={newGymForm.saasPlan}
                    onChange={(e) => setNewGymForm({ ...newGymForm, saasPlan: e.target.value })}
                    className="w-full bg-[#060b0e] border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="BASE">BASE</option>
                    <option value="PRO">PRO</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Validity
                  </label>
                  <select
                    value={newGymForm.duration}
                    onChange={(e) => setNewGymForm({ ...newGymForm, duration: e.target.value })}
                    className="w-full bg-[#060b0e] border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="10_DAYS">10 Days Trial (Free)</option>
                    <option value="1_MONTH">1 Month</option>
                    <option value="3_MONTHS">3 Months</option>
                    <option value="6_MONTHS">6 Months</option>
                    <option value="1_YEAR">1 Year</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Mode
                  </label>
                  <select
                    value={newGymForm.paymentMode}
                    onChange={(e) => setNewGymForm({ ...newGymForm, paymentMode: e.target.value })}
                    className="w-full bg-[#060b0e] border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#060b0e] border border-emerald-500/30 cursor-pointer">
                <span className="flex items-center gap-2 text-xs text-slate-200 font-semibold">
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  Send Welcome Greeting &amp; Plan via WhatsApp
                </span>
                <input
                  type="checkbox"
                  checked={sendWaOnOnboard}
                  onChange={(e) => setSendWaOnOnboard(e.target.checked)}
                  className="accent-emerald-400 w-4 h-4 rounded cursor-pointer"
                />
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddGymOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-cyan-400 text-[#060b0e] font-extrabold rounded-xl text-xs hover:bg-cyan-300"
                >
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <GymOwnerDetailModal
        isOpen={!!selectedDetailGym}
        onClose={() => setSelectedDetailGym(null)}
        gym={selectedDetailGym}
        memberStats={selectedDetailGym ? getGymMemberStats(selectedDetailGym.id) : undefined}
        saasPayments={saasPayments}
        onSendActivePlan={openSendActivePlan}
        onSendInvoiceReceipt={(p, gym) => {
          setSelectedDetailGym(null);
          setReceiptToSend({
            type: 'SAAS',
            gymId: gym.id,
            invoiceNo: p.invoiceNo,
            gymName: p.gymName,
            recipientName: p.ownerName,
            recipientPhone: gym.phone,
            recipientEmail: gym.email || '',
            planName: p.notes,
            amount: p.amount,
            mode: p.mode,
            date: p.date,
            validUntil: gym.validUntil
          });
        }}
        onRenewPlan={(gym) => {
          setSelectedGymForPlan(gym);
          setIsPlanModalOpen(true);
        }}
        onToggleStatus={toggleGymStatus}
        onDeleteGym={(gym) => setGymToDelete(gym)}
      />

      <WhatsAppReceiptModal
        isOpen={!!receiptToSend}
        onClose={() => setReceiptToSend(null)}
        receipt={receiptToSend}
        onSent={(msg) => showToast(msg)}
        gymId={receiptToSend?.gymId || gyms[0]?.id}
      />

      {isSupportWaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0b1418] border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#081014]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-emerald-400">
                    Platform Support
                  </p>
                  <h3 className="text-sm font-bold text-white">Platform Owner WhatsApp</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSupportWaModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const trimmed = supportWaInput.trim();
                const digits = trimmed.replace(/\D/g, '');
                if (trimmed && digits.length < 10) {
                  setSettingsError('Enter a valid 10-digit mobile number or full number with country code.');
                  return;
                }
                setSettingsError('');
                setIsSavingSettings(true);
                try {
                  if (dbConnected) {
                    const res = await apiUpdatePlatformSettings({ supportWhatsApp: trimmed });
                    onUpdatePlatformSettings?.(res.platformSettings);
                  } else {
                    onUpdatePlatformSettings?.({ supportWhatsApp: trimmed });
                  }
                  setIsSupportWaModalOpen(false);
                  showToast(
                    trimmed
                      ? `Platform Owner WhatsApp updated to ${trimmed}`
                      : 'Platform Owner WhatsApp number cleared.'
                  );
                } catch (err) {
                  setSettingsError(err.message || 'Failed to save settings');
                } finally {
                  setIsSavingSettings(false);
                }
              }}
              className="p-6 space-y-4"
            >
              <p className="text-xs text-slate-400 leading-relaxed">
                When a gym account is paused/blocked, tapping <strong className="text-slate-200">Contact Platform Owner on WhatsApp</strong> will open a WhatsApp chat directly to this number.
              </p>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Your WhatsApp Number
                </label>
                <input
                  type="text"
                  value={supportWaInput}
                  onChange={(e) => setSupportWaInput(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 bg-[#060b0e] border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  10-digit numbers automatically use +91 (India). For other countries, include the country code (e.g. +1...).
                </p>
              </div>

              {buildWhatsAppUrl(supportWaInput, 'Test message from GymCentric') && (
                <div className="bg-[#060b0e] border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400 truncate">
                    Link: <span className="text-emerald-400">{buildWhatsAppUrl(supportWaInput)}</span>
                  </span>
                  <a
                    href={buildWhatsAppUrl(supportWaInput, 'Test message from GymCentric')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 font-bold flex-shrink-0"
                  >
                    Test Chat
                  </a>
                </div>
              )}

              {settingsError && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2">
                  {settingsError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSupportWaModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800/60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-[#060b0e] text-xs font-extrabold transition-colors"
                >
                  {isSavingSettings ? 'Saving...' : 'Save WhatsApp Number'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BroadcastMessageModal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
        title="Send Message to Gym Owners"
        subtitle="Choose whether to send to All, Active, Expired/Blocked, or Remaining (expiring soon) gym owners."
        groups={[
          {
            id: 'ALL',
            label: 'All',
            hint: 'All owners',
            recipients: gyms.map((g) => ({
              id: g.id,
              name: `${g.ownerName} (${g.gymName})`,
              phone: g.phone,
              meta: g.status
            })),
            defaultMessage: 'Hello from GymCentric Smart Gym OS! Here is an important platform update for your gym.'
          },
          {
            id: 'ACTIVE',
            label: 'Active',
            hint: 'Active tenants',
            recipients: activeGyms.map((g) => ({
              id: g.id,
              name: `${g.ownerName} (${g.gymName})`,
              phone: g.phone,
              meta: `${g.saasPlan} • ${g.daysLeft}d left`
            })),
            defaultMessage: 'Hello! Thank you for being an active GymCentric partner. New PRO features are now live in your dashboard.'
          },
          {
            id: 'EXPIRED',
            label: 'Expired',
            hint: 'Blocked / Expired',
            recipients: gyms
              .filter((g) => g.status === 'BLOCKED' || g.daysLeft <= 0)
              .map((g) => ({
                id: g.id,
                name: `${g.ownerName} (${g.gymName})`,
                phone: g.phone,
                meta: g.status
              })),
            defaultMessage: 'Notice from GymCentric: Your gym SaaS subscription has expired/paused. Please renew your plan to restore member access.'
          },
          {
            id: 'REMAINING',
            label: 'Remaining',
            hint: 'Expiring ≤ 7d',
            recipients: gyms
              .filter((g) => g.status === 'ACTIVE' && g.daysLeft > 0 && g.daysLeft <= 7)
              .map((g) => ({
                id: g.id,
                name: `${g.ownerName} (${g.gymName})`,
                phone: g.phone,
                meta: `${g.daysLeft}d left`
              })),
            defaultMessage: 'Reminder from GymCentric: Your gym SaaS plan has only a few days remaining. Renew before expiry to avoid interruption.'
          }
        ]}
        onDispatch={(grp) => {
          showToast(`Message queued via WhatsApp for ${grp.recipients.length} ${grp.label} gym owners!`);
        }}
      />

      <ConfirmDeleteModal
        isOpen={!!paymentToDelete}
        onClose={() => setPaymentToDelete(null)}
        title="Delete SaaS Payment Transaction"
        message={`Are you sure you want to delete invoice #${paymentToDelete?.invoiceNo || ''} (${paymentToDelete?.gymName} • ₹${Number(paymentToDelete?.amount || 0).toLocaleString()})? It will be permanently deleted from both this site and the database.`}
        confirmLabel="Delete Transaction"
        onConfirm={async () => {
          if (!paymentToDelete) return;
          const targetId = paymentToDelete.id;
          if (dbConnected) {
            try {
              await apiDeleteSaasPayment(targetId);
            } catch (err) {
              showToast(err.message);
              setPaymentToDelete(null);
              return;
            }
          }
          setSaasPayments((prev) => prev.filter((item) => item.id !== targetId));
          setPaymentToDelete(null);
          showToast('SaaS transaction deleted from site and database.');
        }}
      />

      <ConfirmDeleteModal
        isOpen={!!gymToDelete}
        onClose={() => setGymToDelete(null)}
        title={`Delete ${gymToDelete?.gymName || 'Blocked Gym'}`}
        message={`Are you sure you want to permanently delete ${gymToDelete?.gymName} (${gymToDelete?.ownerName})? This will permanently erase the gym, all ${getGymMemberStats(gymToDelete?.id).total} members, all membership plans, payments, ledger entries, and SaaS billing history from both this site and the database.`}
        confirmLabel="Delete Gym & All Data"
        onConfirm={async () => {
          if (!gymToDelete) return;
          const targetId = gymToDelete.id;
          const targetName = gymToDelete.gymName;
          if (dbConnected) {
            try {
              await apiDeleteGym(targetId);
            } catch (err) {
              showToast(err.message);
              setGymToDelete(null);
              return;
            }
          }
          if (onDeleteGym) {
            onDeleteGym(targetId);
          } else {
            setGyms((prev) => prev.filter((g) => g.id !== targetId));
            setSaasPayments((prev) => prev.filter((p) => p.gymId !== targetId));
          }
          setGymToDelete(null);
          showToast(`${targetName} and all related gym & member data permanently deleted.`);
        }}
      />
    </SidebarLayout>
  );
}
