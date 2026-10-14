import React from 'react';
import { useApp } from '../../context/AppContext';

/**
 * Photo de l'employé partout où son nom apparaît. Sans photo : son initiale.
 * On passe soit l'employé, soit son matricule (les pointages ne gardent que le matricule).
 */
export const EmployeeAvatar: React.FC<{
  matricule?: string;
  name?: string;
  photoUrl?: string;
  size?: number;
  rounded?: 'full' | 'xl';
}> = ({ matricule, name = '', photoUrl, size = 28, rounded = 'full' }) => {
  const { employees } = useApp();
  const emp = matricule ? employees.find(e => e.matricule === matricule) : undefined;
  const src = photoUrl ?? emp?.photoUrl;
  const label = name || (emp ? `${emp.nom} ${emp.prenom}` : '');
  const radius = rounded === 'full' ? 'rounded-full' : 'rounded-xl';
  const style = { width: size, height: size, minWidth: size };

  if (src) {
    return <img src={src} alt={`Photo de ${label}`} style={style} className={`${radius} object-cover border border-slate-200 bg-slate-100`} />;
  }
  return (
    <span
      style={{ ...style, fontSize: Math.max(10, Math.round(size * 0.4)) }}
      className={`${radius} inline-flex items-center justify-center bg-brand/10 text-brand font-bold`}
      aria-hidden
    >
      {label.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
};

/** Réduit une photo choisie par l'utilisateur (carré centré, JPEG) pour la garder légère dans les données */
export function resizePhoto(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Ce fichier n\'est pas une image lisible'));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Image non prise en charge'));
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
