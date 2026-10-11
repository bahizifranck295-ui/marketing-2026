import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AttendanceRecord } from '../../types';
import { Edit3, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { StatusBadge } from '../common/Badge';

interface CorrectAttendanceModalProps {
  record: AttendanceRecord | null;
  onClose: () => void;
}

export const CorrectAttendanceModal: React.FC<CorrectAttendanceModalProps> = ({ record, onClose }) => {
  const { correctAttendance, calculateStatus, employees } = useApp();

  const [actualIn, setActualIn] = useState<string>('');
  const [actualOut, setActualOut] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [wasAbsent, setWasAbsent] = useState<boolean>(false);

  useEffect(() => {
    if (record) {
      setActualIn(record.actualCheckIn || '');
      setActualOut(record.actualCheckOut || '');
      setReason(record.correctionReason || '');
      setWasAbsent(!record.actualCheckIn);
    }
  }, [record]);

  if (!record) return null;

  const emp = employees.find(e => e.matricule === record.employeeId);
  const tolerance = emp ? emp.toleranceMinutes : 10;

  // Projected status calculation
  const projected = calculateStatus(record.expectedCheckIn, wasAbsent ? null : (actualIn || null), tolerance);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Veuillez renseigner un motif obligatoire pour cette correction administrative.');
      return;
    }

    correctAttendance(
      record.id,
      wasAbsent ? null : (actualIn || null),
      actualOut || null,
      reason
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="glass-card rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 space-y-4 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                Correction Administrative de Pointage
              </h2>
              <p className="text-[11px] text-gray-500">Traçabilité obligatoire au journal d'audit</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
        </div>

        {/* Record Overview */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 space-y-1">
          <p><span className="text-gray-400">Employé :</span> <b>{record.employeeName}</b> ({record.employeeId})</p>
          <p><span className="text-gray-400">Date :</span> <span className="font-mono">{record.date}</span></p>
          <p><span className="text-gray-400">Horaire prévu :</span> <span className="font-mono">{record.expectedCheckIn} - {record.expectedCheckOut}</span> (Tolérance: {tolerance}m)</p>
          {record.rawPunchInTime && (
            <p className="text-[10px] text-gray-400 font-mono">Pointage brut ZKTeco : {record.rawPunchInTime}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Absent toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="absentCheck"
              checked={wasAbsent}
              onChange={(e) => setWasAbsent(e.target.checked)}
              className="rounded text-[#7C4DFF]"
            />
            <label htmlFor="absentCheck" className="text-gray-700 dark:text-gray-300 font-semibold cursor-pointer">
              Déclarer l'employé absent pour cette journée (aucun pointage)
            </label>
          </div>

          {!wasAbsent && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-600 dark:text-gray-400 font-bold mb-1">Heure d'entrée corrigée</label>
                <input
                  type="time"
                  value={actualIn}
                  onChange={(e) => setActualIn(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-mono font-bold text-center"
                />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-400 font-bold mb-1">Heure de sortie</label>
                <input
                  type="time"
                  value={actualOut}
                  onChange={(e) => setActualOut(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-mono font-bold text-center"
                />
              </div>
            </div>
          )}

          {/* Projected recalculation preview */}
          <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 flex items-center justify-between">
            <span className="font-semibold text-gray-600 dark:text-gray-300">Nouveau statut calculé :</span>
            <div className="flex items-center gap-2">
              <StatusBadge status={projected.status} size="sm" />
              {projected.lateMinutes > 0 && (
                <span className="text-[11px] font-mono text-amber-600 font-bold">
                  (+{projected.lateMinutes} min)
                </span>
              )}
            </div>
          </div>

          {/* Mandatory reason */}
          <div>
            <label className="block text-gray-600 dark:text-gray-400 font-bold mb-1">
              Motif de la modification (obligatoire) *
            </label>
            <textarea
              rows={2}
              required
              placeholder="ex. Oubli de pointage à la machine, arrivée vérifiée sur carnet du gardien..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#7C4DFF] text-white font-bold hover:bg-[#6a38f3]"
            >
              Enregistrer la Correction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
