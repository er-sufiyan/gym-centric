import React, { useState, useMemo } from 'react';
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
  Eye,
  MapPin,
  Phone,
  Clock,
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
import MonthlyResetBanner from '../../components/common/MonthlyResetBanner';
import BroadcastMessageModal from '../../components/common/BroadcastMessageModal';
import ConfirmDeleteModal from '../../components/common/ConfirmDeleteModal';
import { getOneYearHistory } from '../../utils/billingCycle';
import {
  apiCreateGym,
  apiToggleGymStatus,
  apiDeleteGym,
  apiUpdateGymPlan,
  apiRecordSaasPayment,
  apiDeleteSaasPayment
} from '../../services/api';

export default function SuperAdminDashboard({
  activeRole,
  setActiveRole,
  gyms,
  setGyms,
  activeGym,
  onSelectGym,
  membersByGym,
  saasPayments,
  setSaasPayments,
  onAddGym,
  onDeleteGym,
  searchQuery = '',
  setSearchQuery,
  dbConnected = false,
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

  // Active-only sets (ONLY active gym owners & ONLY active members)
  const activeGyms = useMemo(() => gyms.filter((g) => g.status === 'ACTIVE'), [gyms]);

  const totalActiveMembers = useMemo(() => {
    return activeGyms.reduce((sum, g) => {
      const activeInGym = (membersByGym[g.id] || []).filter((m) => m.status === 'ACTIVE').length;
      return sum + activeInGym;
    }, 0);
  }, [activeGyms, membersByGym]);

  const activeMembersList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const sourceGyms =
      selectedActiveGymId === 'ALL'
        ? activeGyms
        : activeGyms.filter((g) => g.id === selectedActiveGymId);

    const rows = [];
    sourceGyms.forEach((gym) => {
      const gymMembers = (membersByGym[gym.id] || []).filter((m) => m.status === 'ACTIVE');
      gymMembers.forEach((m) => {
        const matches =
          !q ||
          m.name.toLowerCase().includes(q) ||
          m.rollNo.toLowerCase().includes(q) ||
          m.phone.toLowerCase().includes(q) ||
          gym.gymName.toLowerCase().includes(q) ||
          gym.ownerName.toLowerCase().includes(q);
        if (matches) {
          rows.push({
            ...m,
            gymId: gym.id,
            gymName: gym.gymName,
            ownerName: gym.ownerName
          });
        }
      });
    });
    return rows;
  }, [activeGyms, membersByGym, selectedActiveGymId, searchQuery]);

  const filteredActiveGyms = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return activeGyms;
    return activeGyms.filter((g) => {
      const gymMatch =
        g.gymName.toLowerCase().includes(q) ||
        g.ownerName.toLowerCase().includes(q) ||
        g.phone.toLowerCase().includes(q) ||
        (g.city || '').toLowerCase().includes(q);
      const hasMatchingMember = (membersByGym[g.id] || []).some(
        (m) =>
          m.status === 'ACTIVE' &&
          (m.name.toLowerCase().includes(q) || m.rollNo.toLowerCase().includes(q))
      );
      return gymMatch || hasMatchingMember;
    });
  }, [activeGyms, membersByGym, searchQuery]);

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
        invoiceNo: newTx.invoiceNo,
        gymName: targetGym.gymName,
        recipientName: targetGym.ownerName,
        recipientPhone: targetGym.phone,
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
        invoiceNo,
        gymName: targetGym.gymName,
        recipientName: targetGym.ownerName,
        recipientPhone: targetGym.phone,
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

    const durationMap = { '1_MONTH': 30, '3_MONTHS': 90, '6_MONTHS': 180, '1_YEAR': 365 };
    const priceMap = {
      BASE: { '1_MONTH': 3000, '3_MONTHS': 8000, '6_MONTHS': 15000, '1_YEAR': 26000 },
      PRO: { '1_MONTH': 5000, '3_MONTHS': 12500, '6_MONTHS': 22000, '1_YEAR': 35000 }
    };

    const days = durationMap[newGymForm.duration] || 30;
    const amount = priceMap[newGymForm.saasPlan][newGymForm.duration];
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
    const gymMembers = membersByGym[gym.id] || [];
    const activeMembersCount =
      explicitActiveCount !== undefined
        ? explicitActiveCount
        : gymMembers.filter((m) => m.status === 'ACTIVE').length;

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
    { id: 'active-members', label: 'Active Members', icon: Users, count: totalActiveMembers },
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
            const activeMemCount = (membersByGym[gym.id] || []).filter((m) => m.status === 'ACTIVE').length;
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

  const renderActiveMembersTable = () => (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-cyan-400">Active Members Only</p>
          <h3 className="text-sm font-bold text-white mt-0.5 flex items-center gap-2">
            Members Directory
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300">
              {activeMembersList.length} ACTIVE
            </span>
          </h3>
        </div>

        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 bg-[#060b0e] px-3 py-1.5 rounded-lg border border-slate-800">
          <Eye className="w-3.5 h-3.5 text-cyan-400" /> Read-only • Managed by Gym Owner
        </span>
      </div>

      <div className="overflow-x-auto flex-1">
        {activeMembersList.length === 0 ? (
          <div className="text-center py-14 px-4 text-xs text-slate-500">
            No active members found for the current filter.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-[#060b0e]/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800/80">
              <tr>
                <th className="py-3 px-5">Active Member</th>
                <th className="py-3 px-4">Gym Owner / Brand</th>
                <th className="py-3 px-4">Shift</th>
                <th className="py-3 px-4">Plan &amp; Validity</th>
                <th className="py-3 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {activeMembersList.map((m) => (
                <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={m.photoUrl}
                        alt={m.name}
                        className="w-8 h-8 rounded-lg object-cover border border-slate-700"
                      />
                      <div>
                        <p className="font-bold text-white text-xs">
                          {m.name}
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded ml-1.5">
                            #{m.rollNo}
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-500">{m.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-200">{m.gymName}</p>
                    <p className="text-[10px] text-slate-500">{m.ownerName}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-300 bg-[#060b0e] px-2 py-1 rounded-md border border-slate-800">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      {m.shift}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-white">{m.planName}</p>
                    <p className="text-[10px] text-slate-500">
                      Until {m.expiryDate} ({m.daysLeft}d left)
                    </p>
                  </td>
                  <td className="py-3 px-5 text-right">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                      ACTIVE
                    </span>
                  </td>
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
      searchPlaceholder="Search active gym owners or active members..."
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
              onClick={() => setIsManualPayOpen(true)}
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
                subtext="Across active gyms only"
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
              <div className="lg:col-span-7">{renderActiveMembersTable()}</div>
            </div>
          </>
        )}

        {/* ACTIVE OWNERS TAB (ACTIVE ONLY) */}
        {activeTab === 'active-owners' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5">{renderActiveOwnersCards()}</div>
            <div className="lg:col-span-7">{renderActiveMembersTable()}</div>
          </div>
        )}

        {/* ACTIVE MEMBERS TAB (ACTIVE ONLY) */}
        {activeTab === 'active-members' && renderActiveMembersTable()}

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
                    <th className="py-3 px-6">Members (Active / Total)</th>
                    <th className="py-3 px-6">Validity</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTenants.map((gym) => {
                    const gymMembers = membersByGym[gym.id] || [];
                    const activeCount = gymMembers.filter((m) => m.status === 'ACTIVE').length;
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
                          <span className="font-bold text-cyan-300">{activeCount} Active</span>
                          <span className="text-slate-500 ml-1">/ {gymMembers.length} Total</span>
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

        {/* SAAS BILLING LEDGER (1-YEAR HISTORY) */}
        {activeTab === 'billing' && (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
              <div>
                <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-cyan-400">
                  Separate Platform Billing • 1-Year Retention
                </p>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  SaaS Payment Transactions (Last 1 Year)
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

            <MonthlyResetBanner variant="yearly" />

            {monthlySaasPayments.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500">
                No SaaS payment transactions in the last 1 year.
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
                          invoiceNo: p.invoiceNo,
                          gymName: p.gymName,
                          recipientName: p.ownerName,
                          recipientPhone: matchedGym?.phone || '',
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
        members={selectedDetailGym ? membersByGym[selectedDetailGym.id] || [] : []}
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
      />

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
        message={`Are you sure you want to permanently delete ${gymToDelete?.gymName} (${gymToDelete?.ownerName})? This will permanently erase the gym, all ${(membersByGym[gymToDelete?.id] || []).length} members, all membership plans, payments, ledger entries, and SaaS billing history from both this site and the database.`}
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
