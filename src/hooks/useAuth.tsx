"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { 
  User, 
  signInWithRedirect, 
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged 
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Xử lý kết quả trả về sau khi redirect
    getRedirectResult(auth).catch((error) => {
      console.error("Lỗi sau khi chuyển hướng đăng nhập:", error);
    });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      // Sử dụng Redirect thay vì Popup để tránh bị trình duyệt chặn
      await signInWithRedirect(auth, googleProvider);
    } catch (error) {
      console.error("Lỗi đăng nhập Google:", error);
      alert("Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
