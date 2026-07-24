import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AppUser extends User {
  appRole?: 'admin' | 'editor' | 'viewer' | 'pending';
  isActive?: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  logOut: async () => {},
});

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for mock authentication in development/local environments
    const params = new URLSearchParams(window.location.search);
    const mockAuthParam = params.get('mock-auth');
    if (mockAuthParam === 'admin' || localStorage.getItem('mockUser') === 'admin') {
      if (mockAuthParam === 'admin') {
        localStorage.setItem('mockUser', 'admin');
      }
      const mockUser: AppUser = {
        uid: 'mock-admin-uid',
        email: 'escuderojuanmartin@gmail.com',
        displayName: 'Administrador (Desarrollo)',
        emailVerified: true,
        isAnonymous: false,
        metadata: {},
        providerData: [],
        appRole: 'admin',
        isActive: true,
      } as any;
      setUser(mockUser);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user document from Firestore to get role
        // We use the email as the document ID directly to ease finding and assigning users
        const userDocRef = doc(db, 'users', firebaseUser.email!);
        let userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          // If the user doesn't exist in DB, create a pending user 
          // If their email is the admin email, they become an admin instantly.
          const isAdmin = firebaseUser.email?.toLowerCase() === 'escuderojuanmartin@gmail.com';
          try {
             await setDoc(userDocRef, {
               email: firebaseUser.email,
               name: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
               role: isAdmin ? 'admin' : 'pending',
               status: 'Activo',
               active: isAdmin, // true if admin, false otherwise
               createdAt: Date.now(),
               updatedAt: Date.now()
             });
          } catch(e) { console.error("Error creating user profile", e); }
          userDoc = await getDoc(userDocRef);
        } else {
           // Self-heal the admin account if it somehow got stuck as pending/inactive due to earlier rules
           const data = userDoc.data();
           let toUpdate: any = { updatedAt: Date.now() };
           let needsUpdate = false;
           
           if (!data?.name) {
              toUpdate.name = firebaseUser.displayName || firebaseUser.email?.split('@')[0];
              needsUpdate = true;
           }

           // If user was previously invited, change status to active on login
           if (data?.status === 'Invitado') {
              toUpdate.status = 'Activo';
              toUpdate.active = true;
              needsUpdate = true;
           }

           if (firebaseUser.email?.toLowerCase() === 'escuderojuanmartin@gmail.com' && (!data?.active || data?.role !== 'admin')) {
               toUpdate.role = 'admin';
               toUpdate.active = true;
               needsUpdate = true;
           }
           if (needsUpdate) {
              try {
                 await setDoc(userDocRef, toUpdate, { merge: true });
                 userDoc = await getDoc(userDocRef);
               } catch(e) {}
           }
        }

        const appUser = firebaseUser as AppUser;
        const data = userDoc.data();
        if (data) {
           appUser.appRole = data.role;
           appUser.isActive = data.active;
        }
        
        // Failsafe: Always grant local admin access to the initial admin email
        if (firebaseUser.email?.toLowerCase() === 'escuderojuanmartin@gmail.com') {
           appUser.appRole = 'admin';
           appUser.isActive = true;
        }

        setUser(appUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    // Removed hd constraint to allow any google account
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in', error);
      alert('Error en el inicio de sesión. Intente nuevamente.');
    }
  };

  const logOut = async () => {
    localStorage.removeItem('mockUser');
    await signOut(auth);
    window.location.href = window.location.pathname;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
