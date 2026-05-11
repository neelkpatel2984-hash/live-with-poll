import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, remove, get } from 'firebase/database';
import { db, roomPath, roomHostBundlePath, roomMetaPath } from '@shared/firebase/config.js';
import {
  readHostCredential,
  removeHostRoomFromList,
  readHostRoomList,
} from '@shared/utils/helpers.js';
import GlassCard from '@shared/components/GlassCard.jsx';
import BackButton from '@shared/components/BackButton.jsx';

async function canManageRoom(roomCode) {
  const cred = readHostCredential(roomCode);
  if (!cred?.token) return false;
  const metaSnap = await get(ref(db, roomMetaPath(roomCode)));
  if (!metaSnap.exists()) return false;
  const data = metaSnap.val();
  if (data.adminToken) return data.adminToken === cred.token;
  if (cred.bundleKey) {
    const tSnap = await get(ref(db, `${roomHostBundlePath(roomCode, cred.bundleKey)}/adminToken`));
    return tSnap.val() === cred.token;
  }
  return false;
}

export default function HostRooms() {
  const [codes, setCodes] = useState(() => readHostRoomList());
  const [busyCode, setBusyCode] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const rows = useMemo(
    () =>
      codes.map((code) => ({
        code,
        hasCred: !!readHostCredential(code)?.token,
      })),
    [codes]
  );

  function refreshList() {
    setCodes(readHostRoomList());
  }

  async function handleDelete(roomCode) {
    if (confirmDelete !== roomCode) {
      setConfirmDelete(roomCode);
      return;
    }
    setBusyCode(roomCode);
    try {
      const ok = await canManageRoom(roomCode);
      if (!ok) {
        removeHostRoomFromList(roomCode);
        refreshList();
        setConfirmDelete(null);
        return;
      }
      await remove(ref(db, roomPath(roomCode)));
      removeHostRoomFromList(roomCode);
      try {
        localStorage.removeItem(`livepoll_admin_${roomCode}`);
      } catch {
        /* ignore */
      }
      refreshList();
    } finally {
      setBusyCode('');
      setConfirmDelete(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <GlassCard>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Host</p>
            <h1 className="text-2xl font-bold text-neutral-50">Your rooms</h1>
            <p className="mt-1 text-sm text-neutral-400">
              Rooms opened in this browser are listed here. Delete removes the Firebase session.
            </p>
          </div>
          <BackButton to="/">Back</BackButton>
        </div>
        <Link
          to="/"
          className="inline-flex rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white no-underline"
        >
          Create new room
        </Link>
      </GlassCard>

      {rows.length === 0 ? (
        <GlassCard>
          <p className="text-sm text-neutral-400">No rooms tracked yet. Create a room from host home.</p>
        </GlassCard>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map(({ code, hasCred }) => (
            <GlassCard key={code} as="li" className="!py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-lg font-bold text-red-300">{code}</p>
                  {!hasCred ? (
                    <p className="mt-1 text-xs text-amber-300/90">
                      No admin token in this browser — open the dashboard once from this device to
                      manage.
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/admin/${code}`}
                    className="glass-input rounded-lg px-3 py-2 text-xs font-semibold text-neutral-100 no-underline"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to={`/admin/${code}/results`}
                    className="glass-input rounded-lg px-3 py-2 text-xs font-semibold text-neutral-100 no-underline"
                  >
                    Results
                  </Link>
                  <button
                    type="button"
                    disabled={!hasCred || busyCode === code}
                    onClick={() => handleDelete(code)}
                    className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-950/40 disabled:opacity-50"
                  >
                    {confirmDelete === code ? 'Click again to confirm delete' : 'Delete room'}
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </ul>
      )}
    </div>
  );
}
