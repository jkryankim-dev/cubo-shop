"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";

import { auth } from "@/lib/firebase";
import { getCustomerProfile, isShopAdmin } from "@/lib/auth";
import type { ShopCustomer } from "@/types";

interface AuthContextValue {
  /** Firebase Auth user (로그인 상태 판단) */
  user: User | null;
  /** Firestore shop_customers 프로필 */
  profile: ShopCustomer | null;
  /** 관리자 여부 */
  admin: boolean;
  /** 첫 로딩 중 (true 일 때는 깜빡임 방지를 위해 UI 가드) */
  loading: boolean;
  /**
   * 사업자 회원 + 사업자등록증 승인 완료 상태.
   * true 인 회원만 가격을 볼 수 있고 결제 가능 (관리자는 별도).
   */
  approvedBusiness: boolean;
  /** 프로필을 다시 읽어옴 (사업자등록증 업로드 후 등) */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ShopCustomer | null>(null);
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadProfile(uid: string) {
    const [p, isAdmin] = await Promise.all([
      getCustomerProfile(uid),
      isShopAdmin(uid),
    ]);
    setProfile(p);
    setAdmin(isAdmin);
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          await loadProfile(u.uid);
        } catch (err) {
          console.error("[auth] 프로필 로드 실패:", err);
          setProfile(null);
          setAdmin(false);
        }
      } else {
        setProfile(null);
        setAdmin(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function refreshProfile() {
    if (!user) return;
    await loadProfile(user.uid);
  }

  const approvedBusiness =
    profile?.grade === "business" &&
    profile?.businessLicense?.status === "approved";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        admin,
        loading,
        approvedBusiness,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth 는 AuthProvider 내부에서만 사용 가능합니다.");
  }
  return ctx;
}
