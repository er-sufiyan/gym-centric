import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutGrid,
  Users,
  AlertTriangle,
  XCircle,
  IndianRupee,
  Plus,
  Camera,
  Send,
  QrCode,
  Clock,
  Trophy,
  CreditCard,
  Settings2,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  Receipt,
  MessageCircle,
  BellRing,
  Upload,
  X
} from 'lucide-react';
import SidebarLayout from '../../components/common/SidebarLayout';
import StatCard from '../../components/common/StatCard';
import TrendChart from '../../components/common/TrendChart';
import QrPassModal from '../../components/common/QrPassModal';
import InAppQrScanner from '../../components/common/InAppQrScanner';
import MemberDetailModal from '../../components/common/MemberDetailModal';
import WhatsAppReceiptModal from '../../components/common/WhatsAppReceiptModal';
import MonthlyResetBanner from '../../components/common/MonthlyResetBanner';
import BroadcastMessageModal from '../../components/common/BroadcastMessageModal';
import ConfirmDeleteModal from '../../components/common/ConfirmDeleteModal';
import ExpiryRemindersModal from '../../components/common/ExpiryRemindersModal';
import { getCurrentMonthSection } from '../../utils/billingCycle';
import { buildWhatsAppUrl, getMemberExpiryReminder } from '../../utils/whatsapp';
import { compressMemberPhoto, formatBytes } from '../../utils/imageCompress';
import {
  apiCreateMember,
  apiToggleMemberStatus,
  apiDeleteMember,
  apiCreateGymPlan,
  apiDeleteGymPlan,
  apiRecordMemberPayment,
  apiMarkMemberReminderSent,
  uploadMemberPhoto
} from '../../services/api';

export default function GymDashboard({
  activeRole,
  setActiveRole,
  gyms,
  gymProfile,
  onSelectGym,
  searchQuery = '',
  setSearchQuery,
  members = [],
  setMembers,
  gymPlans = [],
  setGymPlans,
  payments = [],
  setPayments,
  ledgerEntries = payments,
  setLedgerEntries = setPayments,
  dbConnected = false,
  platformSettings = {},
  onOpenLogin,
  allowPortalSwitch = true,
  onLogout
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'members' | 'plans' | 'payments'
  const [memberStatusFilter, setMemberStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'EXPIRED' | 'LEAST_INTERACT'
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [selectedPassMember, setSelectedPassMember] = useState(null);
  const [selectedDetailMember, setSelectedDetailMember] = useState(null);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [receiptToSend, setReceiptToSend] = useState(null);
  const [sendWaReceiptOnPay, setSendWaReceiptOnPay] = useState(true);
  const [sendWaReceiptOnAdd, setSendWaReceiptOnAdd] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isRemindersModalOpen, setIsRemindersModalOpen] = useState(false);
  const [compressedPhoto, setCompressedPhoto] = useState(null);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [addMemberError, setAddMemberError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const isProPlan = (gymProfile?.saasPlan || 'PRO') === 'PRO';
  const memberLimit = isProPlan ? 500 : 200;
  const isMemberLimitReached = members.length >= memberLimit;
  const isNearMemberLimit = !isMemberLimitReached && members.length >= Math.floor(memberLimit * 0.9);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const [newPlanInput, setNewPlanInput] = useState({
    name: '',
    price: '',
    durationDays: '30'
  });

  const [payForm, setPayForm] = useState({
    memberId: members[0]?.id || '',
    selectedPlanId: gymPlans[0]?.id || '',
    amount: String(gymPlans[0]?.price || 1200),
    mode: 'CASH',
    extendDays: gymPlans[0]?.durationDays || 30,
    notes: gymPlans[0]?.name || 'Standard Renewal'
  });

  const [newMember, setNewMember] = useState({
    name: '',
    rollNo: '',
    phone: '',
    shift: 'MORNING',
    selectedPlanId: gymPlans[0]?.id || '',
    planName: gymPlans[0]?.name || '1 Month Standard',
    planDurationDays: gymPlans[0]?.durationDays || 30,
    planPrice: gymPlans[0]?.price || 1200,
    photoUrl: ''
  });

  useEffect(() => {
    const defaultPlan = gymPlans[0] || { id: '', name: 'Standard', price: 1200, durationDays: 30 };
    setPayForm({
      memberId: members[0]?.id || '',
      selectedPlanId: defaultPlan.id,
      amount: String(defaultPlan.price),
      mode: 'CASH',
      extendDays: defaultPlan.durationDays,
      notes: defaultPlan.name
    });
    setNewMember({
      name: '',
      rollNo: '',
      phone: '',
      shift: 'MORNING',
      selectedPlanId: defaultPlan.id,
      planName: defaultPlan.name,
      planDurationDays: defaultPlan.durationDays,
      planPrice: defaultPlan.price,
      photoUrl: ''
    });
    setShiftFilter('ALL');
  }, [gymProfile?.id]);

  useEffect(() => {
    if (!gymPlans || gymPlans.length === 0) return;
    setNewMember((prev) => {
      if (prev.selectedPlanId && gymPlans.some((p) => p.id === prev.selectedPlanId)) {
        return prev;
      }
      const first = gymPlans[0];
      return {
        ...prev,
        selectedPlanId: first.id,
        planName: first.name,
        planDurationDays: first.durationDays,
        planPrice: first.price
      };
    });
  }, [gymPlans]);

  const isLeastInteractMember = (m) =>
    m.status === 'EXPIRED' &&
    Boolean(m.isLeastInteract || m.daysLeft <= -3 || (m.daysSinceInteraction || 0) >= 25 || (m.totalCheckIns || 0) <= 5);

  const activeMembers = useMemo(() => members.filter((m) => m.status === 'ACTIVE'), [members]);
  const expiredMembers = useMemo(() => members.filter((m) => m.status === 'EXPIRED'), [members]);
  const leastInteractMembers = useMemo(() => members.filter(isLeastInteractMember), [members]);
  const expiringCount = useMemo(
    () => activeMembers.filter((m) => m.daysLeft <= 3 && m.daysLeft >= 0).length,
    [activeMembers]
  );

  const dueReminders = useMemo(() => {
    const order = { '1D': 1, '2D': 2, '3D': 3, EXPIRED: 4 };
    return members
      .map((member) => {
        const info = getMemberExpiryReminder(member, gymProfile?.gymName || 'GymCentric');
        if (!info) return null;
        return { member, ...info };
      })
      .filter(Boolean)
      .sort((a, b) => (order[a.milestone] || 9) - (order[b.milestone] || 9));
  }, [members, gymProfile?.gymName]);

  const unsentRemindersCount = useMemo(
    () => dueReminders.filter((r) => !r.alreadySent).length,
    [dueReminders]
  );

  const monthSection = useMemo(() => getCurrentMonthSection(ledgerEntries), [ledgerEntries]);
  const monthlyPayments = monthSection.items;

  const totalIncome = monthSection.totalAmount;
  const cashIncome = monthSection.cashTotal;
  const upiIncome = monthSection.upiTotal;

  const filterByQueryAndShift = (list) => {
    const q = searchQuery.toLowerCase().trim();
    return list.filter((m) => {
      const matchesQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.rollNo.toLowerCase().includes(q) ||
        m.phone.toLowerCase().includes(q);
      const matchesShift = shiftFilter === 'ALL' || m.shift === shiftFilter;
      return matchesQuery && matchesShift;
    });
  };

  const visibleActiveMembers = filterByQueryAndShift(activeMembers);
  const visibleDirectoryMembers = filterByQueryAndShift(
    memberStatusFilter === 'ACTIVE'
      ? activeMembers
      : memberStatusFilter === 'EXPIRED'
      ? expiredMembers
      : memberStatusFilter === 'LEAST_INTERACT'
      ? leastInteractMembers
      : members
  );
  const topActiveConsistent = activeMembers.filter((m) => m.rank);

  const gymTrafficData = useMemo(() => {
    const base = Math.max(1, activeMembers.length);
    return [
      { label: 'Nov 18', value: Math.max(1, base - 2) },
      { label: 'Nov 19', value: Math.max(1, base - 1) },
      { label: 'Nov 20', value: Math.max(1, base - 1) },
      { label: 'Nov 21', value: base },
      { label: 'Nov 22', value: base },
      { label: 'Nov 23', value: base + 1 },
      { label: 'Nov 24', value: base },
      { label: 'Nov 25', value: base }
    ];
  }, [activeMembers.length]);

  const ownerInitials = (gymProfile?.ownerName || 'GO')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'members', label: 'Members', icon: Users, count: members.length },
    { id: 'plans', label: 'Gym Plans', icon: Settings2, count: gymPlans.length },
    { id: 'payments', label: 'Fee Ledger', icon: Receipt, count: monthlyPayments.length }
  ];

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!newPlanInput.name.trim() || !newPlanInput.price) return;

    if (dbConnected) {
      try {
        const res = await apiCreateGymPlan(gymProfile.id, {
          name: newPlanInput.name.trim(),
          price: Number(newPlanInput.price),
          durationDays: Number(newPlanInput.durationDays)
        });
        setGymPlans((prev) => [...prev, res.plan]);
        setNewPlanInput({ name: '', price: '', durationDays: '30' });
        showToast(`Plan "${res.plan.name}" saved to DB.`);
        return;
      } catch (err) {
        showToast(err.message);
        return;
      }
    }

    const created = {
      id: `${gymProfile.id}-plan-${Date.now()}`,
      name: newPlanInput.name.trim(),
      price: Number(newPlanInput.price),
      durationDays: Number(newPlanInput.durationDays)
    };
    setGymPlans((prev) => [...prev, created]);
    setNewPlanInput({ name: '', price: '', durationDays: '30' });
    showToast(`Plan "${created.name}" added to ${gymProfile.gymName}.`);
  };

  const handleDeletePlan = async (planId) => {
    if (gymPlans.length <= 1) {
      showToast('At least one membership plan must remain active.');
      return;
    }
    if (dbConnected) {
      try {
        await apiDeleteGymPlan(gymProfile.id, planId);
      } catch (err) {
        showToast(err.message);
        return;
      }
    }
    setGymPlans((prev) => prev.filter((p) => p.id !== planId));
    showToast('Membership plan removed.');
  };

  const handlePhotoFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setPhotoError('');
    setIsCompressingPhoto(true);
    try {
      const result = await compressMemberPhoto(file, { size: 192, targetMaxBytes: 12288 });
      setCompressedPhoto(result);
      setNewMember((prev) => ({ ...prev, photoUrl: result.dataUrl }));
    } catch (err) {
      setPhotoError(err.message || 'Could not process image');
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (isMemberLimitReached) {
      const limitMsg = `Member limit reached (${members.length}/${memberLimit} on ${gymProfile?.saasPlan || 'BASE'} Plan). Delete members who are expired and have not renewed for a long time to free up space.`;
      setAddMemberError(limitMsg);
      showToast(limitMsg);
      return;
    }

    if (!newMember.name.trim() || !newMember.rollNo.trim() || !newMember.phone.trim()) {
      setAddMemberError('Please fill in Full Name, Roll No., and Phone Number.');
      return;
    }

    setAddMemberError('');
    const fallbackPlan = gymPlans[0] || { id: '', name: '1 Month Standard', durationDays: 30, price: 1200 };
    const resolvedPlanName = String(newMember.planName || fallbackPlan.name || '1 Month Standard').trim();
    const resolvedPlanPrice = Number(newMember.planPrice) > 0 ? Number(newMember.planPrice) : Number(fallbackPlan.price || 1200);
    const resolvedDurationDays =
      Number(newMember.planDurationDays) > 0 ? Number(newMember.planDurationDays) : Number(fallbackPlan.durationDays || 30);

    if (dbConnected) {
      setIsSavingMember(true);
      try {
        let finalPhotoUrl = newMember.photoUrl;
        let finalPhotoFileId = '';

        if (compressedPhoto) {
          const uploaded = await uploadMemberPhoto(gymProfile.id, compressedPhoto);
          finalPhotoUrl = uploaded.photoUrl;
          finalPhotoFileId = uploaded.photoFileId || '';
        }

        const res = await apiCreateMember(gymProfile.id, {
          name: newMember.name.trim(),
          rollNo: newMember.rollNo.trim(),
          phone: newMember.phone.trim(),
          shift: newMember.shift,
          planName: resolvedPlanName,
          planPrice: resolvedPlanPrice,
          planDurationDays: resolvedDurationDays,
          photoUrl: finalPhotoUrl,
          photoFileId: finalPhotoFileId
        });
        setMembers((prev) => [res.member, ...prev]);
        setPayments((prev) => [res.payment, ...prev]);
        setLedgerEntries((prev) => [res.ledgerEntry || res.payment, ...prev]);
        setIsAddModalOpen(false);
        setCompressedPhoto(null);
        setPhotoError('');
        setAddMemberError('');
        setNewMember({
          name: '',
          rollNo: '',
          phone: '',
          shift: 'MORNING',
          selectedPlanId: fallbackPlan.id,
          planName: fallbackPlan.name,
          planDurationDays: fallbackPlan.durationDays,
          planPrice: fallbackPlan.price,
          photoUrl: ''
        });
        showToast(`Member "${res.member.name}" (#${res.member.rollNo}) saved successfully!`);
        if (sendWaReceiptOnAdd) {
          setReceiptToSend({
            type: isProPlan ? 'MEMBER_WELCOME' : 'MEMBER',
            receiptNo: res.payment.receiptNo,
            gymName: gymProfile?.gymName || 'GymCentric Gym',
            recipientName: res.member.name,
            recipientPhone: res.member.phone,
            rollNo: res.member.rollNo,
            shift: res.member.shift,
            shiftTime: res.member.shiftTime,
            planName: res.member.planName,
            amount: res.payment.amount,
            mode: res.payment.mode,
            date: res.payment.date,
            validUntil: res.member.expiryDate
          });
        }
        return;
      } catch (err) {
        const msg = err?.message || 'Failed to save member. Please try again.';
        setAddMemberError(msg);
        showToast(msg);
        return;
      } finally {
        setIsSavingMember(false);
      }
    }

    const nowDate = new Date();
    const admittedDate = nowDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).replace(/ /g, '-');

    const today = new Date();
    today.setDate(today.getDate() + Number(newMember.planDurationDays));
    const formattedExpiry = today.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).replace(/ /g, '-');

    const created = {
      id: `${gymProfile.id}-m-${Date.now()}`,
      ...newMember,
      name: newMember.name.trim(),
      rollNo: newMember.rollNo.trim(),
      phone: newMember.phone.trim(),
      admittedDate,
      shiftTime: '',
      expiryDate: formattedExpiry,
      daysLeft: Number(newMember.planDurationDays),
      status: 'ACTIVE',
      rank: null,
      photoUrl:
        newMember.photoUrl ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=faces'
    };

    setMembers((prev) => [created, ...prev]);

    const receiptNo = `RCP-${Math.floor(1000 + Math.random() * 9000)}`;
    const initialFee = {
      id: `${gymProfile.id}-p-${Date.now()}`,
      receiptNo,
      memberId: created.id,
      memberName: created.name,
      rollNo: created.rollNo,
      amount: Number(newMember.planPrice),
      mode: 'CASH',
      planName: created.planName,
      date: admittedDate
    };
    setPayments((prev) => [initialFee, ...prev]);
    setLedgerEntries((prev) => [initialFee, ...prev]);

    setIsAddModalOpen(false);
    const defaultPlan = gymPlans[0] || { id: '', name: '1 Month Standard', durationDays: 30, price: 1200 };
    setNewMember({
      name: '',
      rollNo: '',
      phone: '',
      shift: 'MORNING',
      selectedPlanId: defaultPlan.id,
      planName: defaultPlan.name,
      planDurationDays: defaultPlan.durationDays,
      planPrice: defaultPlan.price,
      photoUrl: ''
    });
    showToast(`${created.name} (#${created.rollNo}) registered as ACTIVE member!`);
    if (sendWaReceiptOnAdd) {
      setReceiptToSend({
        type: isProPlan ? 'MEMBER_WELCOME' : 'MEMBER',
        receiptNo,
        gymName: gymProfile?.gymName || 'GymCentric Gym',
        recipientName: created.name,
        recipientPhone: created.phone,
        rollNo: created.rollNo,
        shift: created.shift,
        shiftTime: created.shiftTime,
        planName: created.planName,
        amount: initialFee.amount,
        mode: initialFee.mode,
        date: initialFee.date,
        validUntil: created.expiryDate
      });
    }
  };

  const openPayForMember = (member) => {
    const matchedPlan = gymPlans.find((p) => p.name === member.planName) || gymPlans[0];
    setPayForm({
      memberId: member.id,
      selectedPlanId: matchedPlan?.id || '',
      amount: String(matchedPlan?.price || member.planPrice || 1200),
      mode: 'CASH',
      extendDays: matchedPlan?.durationDays || 30,
      notes: matchedPlan?.name || member.planName
    });
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!payForm.amount || Number(payForm.amount) <= 0) return;

    const targetMember = members.find((m) => m.id === payForm.memberId);
    if (!targetMember) return;

    if (dbConnected) {
      try {
        const res = await apiRecordMemberPayment(gymProfile.id, {
          memberId: targetMember.id,
          amount: Number(payForm.amount),
          mode: payForm.mode,
          extendDays: Number(payForm.extendDays),
          notes: payForm.notes
        });
        setPayments((prev) => [res.payment, ...prev]);
        setLedgerEntries((prev) => [res.ledgerEntry || res.payment, ...prev]);
        setMembers((prev) => prev.map((m) => (m.id === targetMember.id ? res.member : m)));
        setIsPaymentModalOpen(false);
        showToast(`₹${res.payment.amount.toLocaleString()} (${res.payment.mode}) saved to DB!`);
        if (sendWaReceiptOnPay) {
          setReceiptToSend({
            type: 'MEMBER',
            receiptNo: res.payment.receiptNo,
            gymName: gymProfile?.gymName || 'GymCentric Gym',
            recipientName: res.member.name,
            recipientPhone: res.member.phone,
            rollNo: res.member.rollNo,
            shift: res.member.shift,
            shiftTime: res.member.shiftTime,
            planName: res.payment.planName,
            amount: res.payment.amount,
            mode: res.payment.mode,
            date: res.payment.date,
            validUntil: res.member.expiryDate
          });
        }
        return;
      } catch (err) {
        showToast(err.message);
        return;
      }
    }

    const receiptNo = `RCP-${Math.floor(1000 + Math.random() * 9000)}`;
    const payDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    const newPayment = {
      id: `${gymProfile.id}-p-${Date.now()}`,
      receiptNo,
      memberId: targetMember.id,
      memberName: targetMember.name,
      rollNo: targetMember.rollNo,
      amount: Number(payForm.amount),
      mode: payForm.mode,
      planName: payForm.notes,
      date: payDate
    };
    setPayments((prev) => [newPayment, ...prev]);
    setLedgerEntries((prev) => [newPayment, ...prev]);

    const today = new Date();
    today.setDate(today.getDate() + Number(payForm.extendDays));
    const nextExpiry = today.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).replace(/ /g, '-');

    setMembers((prev) =>
      prev.map((m) =>
        m.id === targetMember.id
          ? {
              ...m,
              status: 'ACTIVE',
              planName: payForm.notes,
              planPrice: Number(payForm.amount),
              daysLeft: Number(payForm.extendDays),
              expiryDate: nextExpiry
            }
          : m
      )
    );

    setIsPaymentModalOpen(false);
    showToast(`₹${Number(payForm.amount).toLocaleString()} (${payForm.mode}) saved — ${targetMember.name} is ACTIVE.`);
    if (sendWaReceiptOnPay) {
      setReceiptToSend({
        type: 'MEMBER',
        receiptNo,
        gymName: gymProfile?.gymName || 'GymCentric Gym',
        recipientName: targetMember.name,
        recipientPhone: targetMember.phone,
        rollNo: targetMember.rollNo,
        shift: targetMember.shift,
        shiftTime: targetMember.shiftTime,
        planName: payForm.notes,
        amount: Number(payForm.amount),
        mode: payForm.mode,
        date: payDate,
        validUntil: nextExpiry
      });
    }
  };

  const openMemberReceipt = (payment, explicitMember) => {
    const matchedMember =
      explicitMember ||
      members.find(
        (m) =>
          (payment.memberId && m.id === payment.memberId) ||
          (m.rollNo === payment.rollNo && m.name === payment.memberName)
      );

    setReceiptToSend({
      type: 'MEMBER',
      receiptNo: payment.receiptNo || `RCP-${String(payment.id).slice(-4).toUpperCase()}`,
      gymName: gymProfile?.gymName || 'GymCentric Gym',
      recipientName: payment.memberName,
      recipientPhone: matchedMember?.phone || '',
      rollNo: payment.rollNo,
      shift: matchedMember?.shift,
      shiftTime: matchedMember?.shiftTime,
      planName: payment.planName || 'Membership Fee',
      amount: payment.amount,
      mode: payment.mode,
      date: payment.date,
      validUntil: matchedMember?.expiryDate
    });
  };

  const handleMarkReminderSent = async (member, milestone) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === member.id ? { ...m, lastReminderMilestone: milestone } : m
      )
    );
    showToast(`WhatsApp reminder opened for ${member.name} (${milestone}).`);
    if (dbConnected && gymProfile?.id) {
      try {
        const res = await apiMarkMemberReminderSent(gymProfile.id, member.id, milestone);
        if (res?.member) {
          setMembers((prev) => prev.map((m) => (m.id === member.id ? res.member : m)));
        }
      } catch {
        // local state already updated; ignore transient DB error on external link click
      }
    }
  };

  const toggleMemberStatus = async (memberId) => {
    if (dbConnected) {
      try {
        const res = await apiToggleMemberStatus(gymProfile.id, memberId);
        setMembers((prev) => prev.map((m) => (m.id === memberId ? res.member : m)));
        showToast(`${res.member.name} marked as ${res.member.status} (saved to DB).`);
        return;
      } catch (err) {
        showToast(err.message);
        return;
      }
    }

    let targetName = '';
    let nextStatus = '';
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === memberId) {
          nextStatus = m.status === 'ACTIVE' ? 'EXPIRED' : 'ACTIVE';
          targetName = m.name;
          return {
            ...m,
            status: nextStatus,
            daysLeft: nextStatus === 'ACTIVE' ? Math.max(m.daysLeft, 30) : 0
          };
        }
        return m;
      })
    );
    showToast(`${targetName} marked as ${nextStatus}.`);
  };

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    const target = memberToRemove;
    if (dbConnected) {
      try {
        await apiDeleteMember(gymProfile.id, target.id);
      } catch (err) {
        showToast(err.message);
        setMemberToRemove(null);
        return;
      }
    }

    setMembers((prev) => prev.filter((m) => m.id !== target.id));
    setPayments((prev) =>
      prev.filter((p) => p.memberId !== target.id && !(p.rollNo === target.rollNo && p.memberName === target.name))
    );
    setLedgerEntries((prev) =>
      prev.filter((p) => p.memberId !== target.id && !(p.rollNo === target.rollNo && p.memberName === target.name))
    );
    setMemberToRemove(null);
    showToast(`All data of ${target.name} (#${target.rollNo}) permanently deleted from site & database.`);
  };

  const renderMemberRows = (list) => (
    <div className="overflow-x-auto">
      {list.length === 0 ? (
        <div className="text-center py-12 px-4 text-xs text-slate-500">
          No members match your current filter.
        </div>
      ) : (
        <table className="w-full text-left text-xs">
          <thead className="bg-[#060b0e]/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800/80">
            <tr>
              <th className="py-3 px-6">Member Details</th>
              <th className="py-3 px-6">Shift Slot</th>
              <th className="py-3 px-6">Plan &amp; Expiry</th>
              <th className="py-3 px-6">Status</th>
              <th className="py-3 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {list.map((member) => (
              <tr
                key={member.id}
                onClick={() => setSelectedDetailMember(member)}
                className="hover:bg-cyan-500/[0.04] transition-colors cursor-pointer"
                title="Tap to view admission date, shift, and 1-year payment history"
              >
                <td className="py-3.5 px-6">
                  <div className="flex items-center gap-3">
                    <img
                      src={member.photoUrl}
                      alt={member.name}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-700 shadow"
                    />
                    <div>
                      <p className="font-bold text-white text-xs flex items-center gap-2">
                        {member.name}
                        <span className="text-[10px] font-bold bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                          #{member.rollNo}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500">{member.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-6">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 bg-[#060b0e] px-2.5 py-1 rounded-lg border border-slate-800">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    {member.shift}
                  </span>
                </td>
                <td className="py-3.5 px-6">
                  <p className="font-semibold text-white">{member.planName}</p>
                  <p
                    className={`text-[10px] font-medium ${
                      member.daysLeft <= 0
                        ? 'text-rose-400 font-bold'
                        : member.daysLeft <= 3
                        ? 'text-amber-400 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    Expires: {member.expiryDate} ({member.daysLeft > 0 ? `${member.daysLeft}d left` : 'Expired'})
                  </p>
                </td>
                <td className="py-3.5 px-6">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        member.status === 'ACTIVE'
                          ? 'bg-cyan-500/15 text-cyan-300'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          member.status === 'ACTIVE' ? 'bg-cyan-400' : 'bg-rose-400'
                        }`}
                      ></span>
                      {member.status}
                    </span>

                    {isLeastInteractMember(member) && (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        title="Expired with lowest interaction — safe candidate to remove"
                      >
                        Least Interact
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3.5 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {isProPlan &&
                      (() => {
                        const reminder = getMemberExpiryReminder(member, gymProfile?.gymName || 'GymCentric');
                        if (!reminder?.waUrl) return null;
                        return (
                          <a
                            href={reminder.waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkReminderSent(member, reminder.milestone);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors inline-flex items-center gap-1 ${
                              reminder.alreadySent
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20'
                                : 'bg-emerald-500 hover:bg-emerald-400 text-[#060b0e] font-extrabold'
                            }`}
                            title={reminder.message}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            {reminder.alreadySent ? `Sent (${reminder.milestone})` : `Remind (${reminder.badge})`}
                          </a>
                        );
                      })()}

                    {isProPlan && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPassMember(member);
                        }}
                        className="px-2.5 py-1.5 bg-[#060b0e] hover:bg-slate-900 text-cyan-300 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 border border-slate-800"
                      >
                        <QrCode className="w-3.5 h-3.5" /> Pass
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openPayForMember(member);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                        member.status === 'EXPIRED'
                          ? 'bg-cyan-400 hover:bg-cyan-300 text-[#060b0e] font-extrabold'
                          : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300'
                      }`}
                    >
                      {member.status === 'EXPIRED' ? 'Renew Now' : 'Renew'}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMemberStatus(member.id);
                      }}
                      className="px-2 py-1.5 bg-[#060b0e] hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg text-[10px] font-semibold transition-colors"
                    >
                      {member.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMemberToRemove(member);
                      }}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors"
                      title="Remove Member & All Data"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <SidebarLayout
      brandInitial={gymProfile?.logoInitial || 'GY'}
      brandName={gymProfile?.gymName || 'Iron Temple Gym'}
      brandSubtitle="GYM OWNER ADMIN"
      navItems={navItems}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      activeRole={activeRole}
      setActiveRole={setActiveRole}
      gyms={gyms}
      activeGym={gymProfile}
      onSelectGym={onSelectGym}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      searchPlaceholder="Search Roll No, Phone, or Member..."
      userProfile={{
        initial: ownerInitials || 'GO',
        name: gymProfile?.ownerName || 'Gym Owner',
        role: `${gymProfile?.saasPlan || 'PRO'} • ${gymProfile?.status || 'ACTIVE'}`
      }}
      dbConnected={dbConnected}
      onOpenLogin={onOpenLogin}
      allowPortalSwitch={allowPortalSwitch}
      onLogout={onLogout}
    >
      {gymProfile?.status === 'BLOCKED' ? (
        <div className="max-w-xl mx-auto my-12 glass-card rounded-3xl border border-rose-500/30 p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-extrabold bg-rose-500/20 text-rose-400 uppercase tracking-wider">
            Subscription / Payment Issue
          </span>
          <h2 className="text-2xl font-extrabold text-white">{gymProfile.gymName} Access Suspended</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Account for <strong className="text-slate-200">{gymProfile.ownerName}</strong> ({gymProfile.phone}) is
            currently paused due to a <strong className="text-rose-400">pending subscription payment or billing issue</strong>.
            Member check-ins, plan edits, and fee logging are disabled until renewal is confirmed.
          </p>
          <div className="bg-[#060b0e] rounded-2xl border border-slate-800 p-4 text-xs text-slate-300 flex items-center justify-between">
            <span>
              SaaS Plan: <strong>{gymProfile.saasPlan}</strong>
            </span>
            <span>
              Valid Until: <strong className="text-rose-400">{gymProfile.validUntil}</strong>
            </span>
          </div>
          <div className="pt-2 space-y-2.5">
            {(() => {
              const supportPhone =
                platformSettings?.supportWhatsApp || import.meta.env.VITE_PLATFORM_WHATSAPP_NUMBER || '';
              const supportWaUrl = buildWhatsAppUrl(
                supportPhone,
                `Hello GymCentric Team, I need help resolving the subscription payment for ${gymProfile.gymName} (${gymProfile.ownerName} • ${gymProfile.phone}).`
              );

              if (!supportWaUrl) {
                return (
                  <>
                    <button
                      type="button"
                      disabled
                      className="w-full py-2.5 px-4 bg-slate-800 text-slate-400 font-bold rounded-xl text-xs inline-flex items-center justify-center gap-2 cursor-not-allowed border border-slate-700"
                    >
                      <MessageCircle className="w-4 h-4" /> Platform WhatsApp Number Not Configured
                    </button>
                    <p className="text-[11px] text-amber-400/90">
                      Platform owner WhatsApp number is not set yet. Configure it in Super Admin (/admin → Support WhatsApp).
                    </p>
                  </>
                );
              }

              return (
                <>
                  <a
                    href={supportWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-[#060b0e] font-extrabold rounded-xl text-xs transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" /> Contact Platform Owner on WhatsApp
                  </a>
                  <p className="text-[11px] text-slate-500">
                    Already paid? Please contact the platform owner or support team to reactivate your gym workspace.
                  </p>
                </>
              );
            })()}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {toastMessage && (
            <div className="fixed top-4 right-4 z-[70] max-w-md flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#0b1418] border border-cyan-500/50 text-cyan-300 text-xs font-semibold shadow-2xl shadow-cyan-500/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span>{toastMessage}</span>
              </div>
              <button onClick={() => setToastMessage('')} className="text-cyan-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Hero Welcome Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-cyan-400">
                Your Gym Workspace
              </p>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight mt-1">
                Welcome back, {gymProfile?.ownerName?.split(' ')[0] || 'Owner'}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {gymProfile?.gymName} • {gymProfile?.saasPlan} Plan ({members.length}/{memberLimit} Members) • Isolated gym roster, plans, and fee ledger.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setAddMemberError('');
                  setIsAddModalOpen(true);
                }}
                disabled={isMemberLimitReached}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-400 hover:bg-cyan-300 disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-[#060b0e] font-extrabold rounded-xl text-xs transition-colors shadow-lg shadow-cyan-500/15"
                title={
                  isMemberLimitReached
                    ? `Limit reached (${members.length}/${memberLimit}). Delete old expired members first.`
                    : 'Register a new member'
                }
              >
                <Plus className="w-4 h-4" />
                {isMemberLimitReached ? `Limit Reached (${members.length}/${memberLimit})` : 'Add Member'}
              </button>

              <button
                onClick={() => {
                  const matched = gymPlans[0];
                  setPayForm({
                    memberId: members[0]?.id || '',
                    selectedPlanId: matched?.id || '',
                    amount: String(matched?.price || 1200),
                    mode: 'CASH',
                    extendDays: matched?.durationDays || 30,
                    notes: matched?.name || 'Standard Renewal'
                  });
                  setIsPaymentModalOpen(true);
                }}
                disabled={members.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0b1418] hover:bg-slate-900 disabled:opacity-50 border border-slate-700/80 text-cyan-300 font-bold rounded-xl text-xs transition-colors"
              >
                <CreditCard className="w-4 h-4 text-cyan-400" /> Record Fee
              </button>

              {isProPlan && (
                <>
                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#0b1418] hover:bg-slate-900 border border-slate-800 text-slate-200 font-semibold rounded-xl text-xs transition-colors"
                  >
                    <Camera className="w-4 h-4 text-cyan-400" /> Scan QR
                  </button>

                  <button
                    onClick={() => setIsRemindersModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold rounded-xl text-xs transition-colors"
                    title="Auto-written 3d / 2d / 1d / Expired WhatsApp reminders"
                  >
                    <BellRing className="w-3.5 h-3.5 text-emerald-400" />
                    Reminders
                    {dueReminders.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-[#060b0e]">
                        {unsentRemindersCount > 0 ? unsentRemindersCount : dueReminders.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setIsOfferModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#0b1418] hover:bg-slate-900 border border-slate-800 text-slate-200 font-semibold rounded-xl text-xs transition-colors"
                  >
                    <Send className="w-3.5 h-3.5 text-cyan-400" /> Broadcast
                  </button>
                </>
              )}
            </div>
          </div>

          {(isMemberLimitReached || isNearMemberLimit) && (
            <div
              className={`rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isMemberLimitReached
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-200'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    isMemberLimitReached ? 'text-rose-400' : 'text-amber-400'
                  }`}
                />
                <div className="text-xs">
                  <p className="font-extrabold">
                    {isMemberLimitReached
                      ? `Member Limit Reached (${members.length}/${memberLimit} on ${gymProfile?.saasPlan || 'BASE'} Plan)`
                      : `Approaching Member Limit (${members.length}/${memberLimit} on ${gymProfile?.saasPlan || 'BASE'} Plan)`}
                  </p>
                  <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
                    Delete those members who are expired and have not renewed for a long time to free up slots. Deleting a member removes all their data from both this site and the database.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('members');
                  setMemberStatusFilter(expiredMembers.length > 0 ? 'EXPIRED' : 'ALL');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex-shrink-0 transition-colors ${
                  isMemberLimitReached
                    ? 'bg-rose-500 hover:bg-rose-400 text-white'
                    : 'bg-amber-400 hover:bg-amber-300 text-[#060b0e]'
                }`}
              >
                Review Expired Members ({expiredMembers.length})
              </button>
            </div>
          )}

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Active Members"
                  value={activeMembers.length}
                  subtext="Currently active in gym"
                  icon={Users}
                  color="cyan"
                />
                <StatCard
                  title="Expiring in 3 Days"
                  value={expiringCount}
                  subtext={isProPlan ? 'WhatsApp reminder ready' : 'Renewals due within 3 days'}
                  icon={AlertTriangle}
                  color="amber"
                />
                <StatCard
                  title="Expired Members"
                  value={expiredMembers.length}
                  subtext="Pending fee renewal"
                  icon={XCircle}
                  color="rose"
                />
                <StatCard
                  title={`Fees Collected (${monthSection.shortLabel})`}
                  value={`₹${totalIncome.toLocaleString()}`}
                  subtext={`Cash: ₹${cashIncome.toLocaleString()} • UPI: ₹${upiIncome.toLocaleString()}`}
                  icon={IndianRupee}
                  color="emerald"
                />
              </div>

              <TrendChart
                eyebrow="Gym Activity"
                title="Active Check-in & Membership Trend"
                subtitle="This week"
                data={gymTrafficData}
                valueSuffix=" Active"
              />

              {topActiveConsistent.length > 0 && (
                <div className="glass-card p-4 rounded-2xl flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                        Top Consistent Active Members ({gymProfile?.saasPlan} Feature)
                      </h4>
                      <p className="text-[11px] text-slate-400">Monthly attendance recognition for active members.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {topActiveConsistent.map((top) => (
                      <div
                        key={top.id}
                        className="flex items-center gap-2 bg-[#060b0e] px-3 py-1.5 rounded-xl border border-slate-800 text-xs"
                      >
                        <span className="font-black text-amber-400">#{top.rank}</span>
                        <span className="font-bold text-slate-200">{top.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Members Snapshot */}
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-cyan-400">
                      Active Roster Only
                    </p>
                    <h3 className="text-sm font-bold text-white mt-0.5">
                      Active Members ({visibleActiveMembers.length})
                    </h3>
                  </div>

                  <div className="flex items-center bg-[#060b0e] p-1 rounded-xl border border-slate-800 text-xs">
                    {['ALL', 'MORNING', 'EVENING'].map((sh) => (
                      <button
                        key={sh}
                        onClick={() => setShiftFilter(sh)}
                        className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                          shiftFilter === sh
                            ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                            : 'text-slate-400 hover:text-white border border-transparent'
                        }`}
                      >
                        {sh}
                      </button>
                    ))}
                  </div>
                </div>
                {renderMemberRows(visibleActiveMembers)}
              </div>
            </>
          )}

          {/* MEMBERS TAB (ACTIVE, EXPIRED & RENEW) */}
          {activeTab === 'members' && (
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-cyan-400">
                    Member Directory
                  </p>
                  <h3 className="text-sm font-bold text-white mt-0.5">
                    {gymProfile?.gymName} Members ({visibleDirectoryMembers.length})
                    <span className="text-[11px] font-normal text-slate-400 ml-2">
                      ({members.length}/{memberLimit} Plan Limit)
                    </span>
                  </h3>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Status Filter: All / Active / Expired / Least Interact */}
                  <div className="flex items-center bg-[#060b0e] p-1 rounded-xl border border-slate-800 text-xs flex-wrap">
                    {[
                      { id: 'ALL', label: `All (${members.length})` },
                      { id: 'ACTIVE', label: `Active (${activeMembers.length})` },
                      { id: 'EXPIRED', label: `Expired (${expiredMembers.length})` },
                      { id: 'LEAST_INTERACT', label: `Least Interact (${leastInteractMembers.length})` }
                    ].map((st) => (
                      <button
                        key={st.id}
                        onClick={() => setMemberStatusFilter(st.id)}
                        className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                          memberStatusFilter === st.id
                            ? st.id === 'EXPIRED'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : st.id === 'LEAST_INTERACT'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                            : 'text-slate-400 hover:text-white border border-transparent'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {/* Shift Filter */}
                  <div className="flex items-center bg-[#060b0e] p-1 rounded-xl border border-slate-800 text-xs">
                    {['ALL', 'MORNING', 'EVENING'].map((sh) => (
                      <button
                        key={sh}
                        onClick={() => setShiftFilter(sh)}
                        className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                          shiftFilter === sh
                            ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                            : 'text-slate-400 hover:text-white border border-transparent'
                        }`}
                      >
                        {sh}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {renderMemberRows(visibleDirectoryMembers)}
            </div>
          )}

          {/* GYM PLANS TAB */}
          {activeTab === 'plans' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 glass-card rounded-2xl p-6 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-cyan-400">
                      Isolated Plan Menu
                    </p>
                    <h3 className="text-sm font-bold text-white mt-0.5">{gymProfile?.gymName} Plans</h3>
                  </div>
                  <span className="text-xs text-slate-400">{gymPlans.length} Plans</span>
                </div>

                <div className="space-y-2.5">
                  {gymPlans.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-[#060b0e] border border-slate-800 text-xs"
                    >
                      <div>
                        <p className="font-bold text-white text-sm">{p.name}</p>
                        <p className="text-[11px] text-slate-400">{p.durationDays} Days Validity</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-cyan-300 text-sm">₹{p.price.toLocaleString()}</span>
                        <button
                          onClick={() => handleDeletePlan(p.id)}
                          className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 glass-card rounded-2xl p-6">
                <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-cyan-400">Add Plan</p>
                <h3 className="text-sm font-bold text-white mt-0.5 mb-4">Create New Membership Plan</h3>
                <form onSubmit={handleCreatePlan} className="space-y-3.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Plan Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2 Months Fat Loss"
                      value={newPlanInput.name}
                      onChange={(e) => setNewPlanInput({ ...newPlanInput, name: e.target.value })}
                      className="w-full bg-[#060b0e] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Price (₹)
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="2200"
                        value={newPlanInput.price}
                        onChange={(e) => setNewPlanInput({ ...newPlanInput, price: e.target.value })}
                        className="w-full bg-[#060b0e] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Duration (Days)
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="30"
                        value={newPlanInput.durationDays}
                        onChange={(e) => setNewPlanInput({ ...newPlanInput, durationDays: e.target.value })}
                        className="w-full bg-[#060b0e] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-cyan-400 hover:bg-cyan-300 text-[#060b0e] font-extrabold rounded-xl text-xs transition-colors"
                  >
                    + Save Plan
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* FEE LEDGER TAB (1-MONTH SECTION) */}
          {activeTab === 'payments' && (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-cyan-400">
                    Gym Owner Billing • 1-Month History
                  </p>
                  <h3 className="text-sm font-bold text-white mt-0.5">
                    {monthSection.monthLabel} — Member Fee History
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="px-3 py-1 rounded-lg bg-[#060b0e] border border-slate-800 text-slate-300">
                    Cash: ₹{cashIncome.toLocaleString()}
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-[#060b0e] border border-slate-800 text-slate-300">
                    UPI: ₹{upiIncome.toLocaleString()}
                  </span>
                </div>
              </div>

              <MonthlyResetBanner monthLabel={monthSection.monthLabel} />

              {monthlyPayments.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500">
                  New {monthSection.monthLabel} history section started — no member payments recorded yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {monthlyPayments.map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-[#060b0e] border border-slate-800/80 text-xs"
                    >
                      <div>
                        <span className="font-bold text-white">{p.memberName}</span>
                        <span className="text-[10px] font-bold bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded ml-2">
                          #{p.rollNo}
                        </span>
                        {p.planName && <span className="text-slate-400 text-[11px] ml-2">({p.planName})</span>}
                      </div>
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className="text-slate-400 text-[11px]">{p.date}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                          {p.mode}
                        </span>
                        <span className="font-extrabold text-cyan-300">+₹{p.amount.toLocaleString()}</span>
                        <button
                          type="button"
                          onClick={() => openMemberReceipt(p)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[11px] font-bold flex items-center gap-1 transition-colors"
                          title="Send Receipt via WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> Receipt
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0b1418] border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Record Member Fee Payment</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSavePayment} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Select Member
                </label>
                <select
                  value={payForm.memberId}
                  onChange={(e) => setPayForm({ ...payForm, memberId: e.target.value })}
                  className="w-full bg-[#060b0e] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      #{m.rollNo} {m.name} ({m.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block mb-1">
                  Choose Saved Plan
                </label>
                <select
                  value={payForm.selectedPlanId}
                  onChange={(e) => {
                    const chosen = gymPlans.find((p) => p.id === e.target.value);
                    if (chosen) {
                      setPayForm({
                        ...payForm,
                        selectedPlanId: chosen.id,
                        amount: String(chosen.price),
                        extendDays: chosen.durationDays,
                        notes: chosen.name
                      });
                    }
                  }}
                  className="w-full bg-[#060b0e] border border-cyan-500/40 rounded-xl px-3.5 py-2 text-xs text-white font-semibold focus:outline-none focus:border-cyan-500"
                >
                  {gymPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ₹{p.price.toLocaleString()} ({p.durationDays} Days)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    className="w-full bg-[#060b0e] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Extend Days
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={payForm.extendDays}
                    onChange={(e) => setPayForm({ ...payForm, extendDays: Number(e.target.value) })}
                    className="w-full bg-[#060b0e] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayForm({ ...payForm, mode: 'CASH' })}
                    className={`py-2 rounded-xl text-xs font-bold border ${
                      payForm.mode === 'CASH'
                        ? 'bg-cyan-400 text-[#060b0e] border-cyan-400'
                        : 'bg-[#060b0e] text-slate-400 border-slate-800'
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayForm({ ...payForm, mode: 'UPI' })}
                    className={`py-2 rounded-xl text-xs font-bold border ${
                      payForm.mode === 'UPI'
                        ? 'bg-cyan-400 text-[#060b0e] border-cyan-400'
                        : 'bg-[#060b0e] text-slate-400 border-slate-800'
                    }`}
                  >
                    UPI QR
                  </button>
                </div>
              </div>

              <label className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#060b0e] border border-emerald-500/30 cursor-pointer">
                <span className="flex items-center gap-2 text-xs text-slate-200 font-semibold">
                  <MessageCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>
                    Send Receipt via WhatsApp to{' '}
                    {members.find((m) => m.id === payForm.memberId)?.name || 'Selected Member'}
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={sendWaReceiptOnPay}
                  onChange={(e) => setSendWaReceiptOnPay(e.target.checked)}
                  className="accent-emerald-400 w-4 h-4 rounded cursor-pointer"
                />
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-cyan-400 text-[#060b0e] font-extrabold rounded-xl text-xs hover:bg-cyan-300"
                >
                  Save &amp; Renew
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0b1418] border border-slate-800 rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Register Member ({gymProfile?.gymName})</h3>
              <button
                type="button"
                onClick={() => {
                  setAddMemberError('');
                  setIsAddModalOpen(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddMember} className="space-y-4">
              {/* Mobile Camera / Gallery Photo Capture with Ultra-Low Compression */}
              <div className="p-3 rounded-2xl bg-[#060b0e] border border-slate-800/90 flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {newMember.photoUrl ? (
                    <img src={newMember.photoUrl} alt="Member preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-5 h-5 text-slate-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-slate-200">
                    Member Photo{' '}
                    <span className="text-[10px] font-normal text-cyan-400">(Auto-compressed ≤12 KB)</span>
                  </p>
                  {compressedPhoto ? (
                    <p className="text-[10px] text-emerald-400 mt-0.5">
                      {formatBytes(compressedPhoto.originalBytes)} → {formatBytes(compressedPhoto.compressedBytes)}
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Capture with phone camera or pick from gallery
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold transition-colors">
                      <Camera className="w-3 h-3" />
                      {isCompressingPhoto ? 'Compressing...' : 'Camera'}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoFileSelected}
                        className="hidden"
                      />
                    </label>

                    <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition-colors">
                      <Upload className="w-3 h-3" /> Gallery
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoFileSelected}
                        className="hidden"
                      />
                    </label>

                    {newMember.photoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setCompressedPhoto(null);
                          setNewMember((prev) => ({ ...prev, photoUrl: '' }));
                        }}
                        className="text-[10px] font-semibold text-rose-400 hover:text-rose-300 px-1.5"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {photoError && <p className="text-[10px] text-rose-400 mt-1">{photoError}</p>}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Sethi"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  className="w-full bg-[#060b0e] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Roll No. / ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 106"
                    value={newMember.rollNo}
                    onChange={(e) => setNewMember({ ...newMember, rollNo: e.target.value })}
                    className="w-full bg-[#060b0e] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98765..."
                    value={newMember.phone}
                    onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                    className="w-full bg-[#060b0e] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Shift Slot
                  </label>
                  <select
                    value={newMember.shift}
                    onChange={(e) => setNewMember({ ...newMember, shift: e.target.value })}
                    className="w-full bg-[#060b0e] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="MORNING">Morning</option>
                    <option value="EVENING">Evening</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block mb-1">
                    Saved Plan
                  </label>
                  <select
                    value={newMember.selectedPlanId}
                    onChange={(e) => {
                      const p = gymPlans.find((x) => x.id === e.target.value);
                      if (p) {
                        setNewMember({
                          ...newMember,
                          selectedPlanId: p.id,
                          planName: p.name,
                          planPrice: p.price,
                          planDurationDays: p.durationDays
                        });
                      }
                    }}
                    className="w-full bg-[#060b0e] border border-cyan-500/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-semibold"
                  >
                    {gymPlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₹{p.price.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Validity / Days Left
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newMember.planDurationDays}
                    onChange={(e) =>
                      setNewMember({ ...newMember, planDurationDays: Math.max(1, Number(e.target.value) || 1) })
                    }
                    className="w-full bg-[#060b0e] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {[1, 2, 3, 15, 30].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setNewMember({ ...newMember, planDurationDays: d })}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                          Number(newMember.planDurationDays) === d
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : 'bg-[#060b0e] text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Fee Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newMember.planPrice}
                    onChange={(e) => setNewMember({ ...newMember, planPrice: Number(e.target.value) || 0 })}
                    className="w-full bg-[#060b0e] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1.5">
                    Auto-filled from plan; editable for remaining days.
                  </p>
                </div>
              </div>

              <label className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#060b0e] border border-emerald-500/30 cursor-pointer">
                <span className="flex items-center gap-2 text-xs text-slate-200 font-semibold">
                  <MessageCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>
                    {isProPlan
                      ? 'Send Welcome Greeting (Plan, Timing & ID) via WhatsApp'
                      : 'Send Fee Payment Receipt via WhatsApp'}
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={sendWaReceiptOnAdd}
                  onChange={(e) => setSendWaReceiptOnAdd(e.target.checked)}
                  className="accent-emerald-400 w-4 h-4 rounded cursor-pointer"
                />
              </label>

              {addMemberError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                  {addMemberError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMember || isCompressingPhoto || isMemberLimitReached}
                  className="flex-1 py-2.5 bg-cyan-400 text-[#060b0e] font-extrabold rounded-xl text-xs hover:bg-cyan-300 disabled:opacity-60"
                >
                  {isSavingMember
                    ? 'Uploading & Saving...'
                    : `Save Member (₹${Number(newMember.planPrice).toLocaleString()})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isProPlan && (
        <BroadcastMessageModal
          isOpen={isOfferModalOpen}
          onClose={() => setIsOfferModalOpen(false)}
          title={`Send Message (${gymProfile?.gymName || 'Gym'})`}
          subtitle="Choose whether to send to All, Active, Expired, or Remaining (expiring soon) members."
          groups={[
            {
              id: 'ALL',
              label: 'All',
              hint: 'Every member',
              recipients: members.map((m) => ({
                id: m.id,
                name: m.name,
                phone: m.phone,
                meta: `#${m.rollNo} • ${m.status}`
              })),
              defaultMessage: `Hello from ${gymProfile?.gymName}! Check out our latest fitness updates and membership offers.`
            },
            {
              id: 'ACTIVE',
              label: 'Active',
              hint: 'Active plans',
              recipients: activeMembers.map((m) => ({
                id: m.id,
                name: m.name,
                phone: m.phone,
                meta: `#${m.rollNo} • ${m.daysLeft}d left`
              })),
              defaultMessage: `Hi! Keep up the great consistency at ${gymProfile?.gymName}. Special active member offer: refer a friend and get 15 days free!`
            },
            {
              id: 'EXPIRED',
              label: 'Expired',
              hint: 'Need renewal',
              recipients: expiredMembers.map((m) => ({
                id: m.id,
                name: m.name,
                phone: m.phone,
                meta: `#${m.rollNo} • Expired`
              })),
              defaultMessage: `Hi! Your ${gymProfile?.gymName} membership has expired. Renew this week to restart your workouts with a special comeback discount!`
            },
            {
              id: 'REMAINING',
              label: 'Remaining',
              hint: 'Expiring ≤ 7d',
              recipients: activeMembers
                .filter((m) => m.daysLeft >= 0 && m.daysLeft <= 7)
                .map((m) => ({
                  id: m.id,
                  name: m.name,
                  phone: m.phone,
                  meta: `#${m.rollNo} • ${m.daysLeft}d left`
                })),
              defaultMessage: `Friendly reminder from ${gymProfile?.gymName}: your membership has only a few days remaining! Renew early to keep uninterrupted access.`
            }
          ]}
          onDispatch={(grp) => {
            showToast(`Message queued via WhatsApp for ${grp.recipients.length} ${grp.label} members!`);
          }}
        />
      )}

      {isProPlan && (
        <QrPassModal
          isOpen={!!selectedPassMember}
          onClose={() => setSelectedPassMember(null)}
          member={selectedPassMember}
          gymProfile={gymProfile}
        />
      )}

      {isProPlan && (
        <InAppQrScanner
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          members={members}
          onMemberFound={(member) => {
            setIsScannerOpen(false);
            setSelectedDetailMember(member);
          }}
        />
      )}

      <MemberDetailModal
        isOpen={!!selectedDetailMember}
        onClose={() => setSelectedDetailMember(null)}
        member={selectedDetailMember}
        payments={payments}
        onRenew={openPayForMember}
        onOpenPass={isProPlan ? setSelectedPassMember : undefined}
        onRemoveMember={(member) => setMemberToRemove(member)}
        onSendReceipt={(payment, member) => {
          setSelectedDetailMember(null);
          openMemberReceipt(payment, member);
        }}
      />

      <ConfirmDeleteModal
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleConfirmRemoveMember}
        title={`Remove ${memberToRemove?.name || 'Member'}?`}
        message={`Warning: All data of ${memberToRemove?.name} (#${memberToRemove?.rollNo}) — profile details, shift timing, membership history, and payment records — will be permanently deleted from this site and the database.`}
        confirmLabel="Remove Member & All Data"
      />

      <WhatsAppReceiptModal
        isOpen={!!receiptToSend}
        onClose={() => setReceiptToSend(null)}
        receipt={receiptToSend}
        onSent={(msg) => showToast(msg)}
        gymId={gymProfile?.id}
      />

      {isProPlan && (
        <ExpiryRemindersModal
          isOpen={isRemindersModalOpen}
          onClose={() => setIsRemindersModalOpen(false)}
          reminders={dueReminders}
          onMarkSent={handleMarkReminderSent}
        />
      )}
    </SidebarLayout>
  );
}
