import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  TwitterAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  increment,
  addDoc,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { RadioStation, PodcastShow, AlarmConfig, UserProfile, ThemeType, QueuedStation, VisualizerSkin, SyncStatusInfo, SyncState, ActivePlaybackSession, StationChatMessage, VisualizerCustomColors, PodcastProgress } from '../types';
import { storageService } from './storageService';

let memoryDeviceId: string | null = null;
export function getDeviceId(): string {
  if (memoryDeviceId) return memoryDeviceId;
  try {
    let id = localStorage.getItem('neotune_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
      localStorage.setItem('neotune_device_id', id);
    }
    memoryDeviceId = id;
    return id;
  } catch {
    if (!memoryDeviceId) {
      memoryDeviceId = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
    }
    return memoryDeviceId;
  }
}

export function getDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Web Player';
  const ua = navigator.userAgent;
  let platformName = 'Web Device';
  if (/iPhone|iPad|iPod/.test(ua)) platformName = 'iOS Device';
  else if (/Android/.test(ua)) platformName = 'Android Phone';
  else if (/Macintosh|Mac OS X/.test(ua)) platformName = 'Macbook / Mac';
  else if (/Windows/.test(ua)) platformName = 'Windows PC';
  else if (/Linux/.test(ua)) platformName = 'Linux Workstation';

  let browserName = 'Browser';
  if (/Chrome/.test(ua) && !/Edg/.test(ua)) browserName = 'Chrome';
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browserName = 'Safari';
  else if (/Firefox/.test(ua)) browserName = 'Firefox';
  else if (/Edg/.test(ua)) browserName = 'Edge';

  return `${browserName} (${platformName})`;
}


// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Initialize Firebase Analytics if supported in the current environment
let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  isAnalyticsSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}
export { analytics };

// Initialize Firestore with Offline Persistence (IndexedDB multi-tab cache)
function initFirestoreWithOfflineCache(): Firestore {
  try {
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      },
      firebaseConfig.firestoreDatabaseId || undefined
    );
  } catch (err) {
    console.warn('Firestore offline persistence init notice (falling back):', err);
    return firebaseConfig.firestoreDatabaseId
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
  }
}

export const db: Firestore = initFirestoreWithOfflineCache();

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const githubProvider = new GithubAuthProvider();
const twitterProvider = new TwitterAuthProvider();

export interface RemoteContentConfig {
  trendingStations: RadioStation[];
  featuredPodcasts: PodcastShow[];
  genreTags?: string[];
  announcement?: {
    id: string;
    message: string;
    type: 'info' | 'warning' | 'promo';
  };
  announcementBanner?: string;
  lastUpdated?: number;
}

class FirebaseService {
  private currentUser: UserProfile | null = null;
  private authListeners: Array<(user: UserProfile | null) => void> = [];
  private remoteConfigListeners: Array<(config: RemoteContentConfig) => void> = [];
  private syncListeners: Array<(status: SyncStatusInfo) => void> = [];
  private isInitialized = false;
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private syncState: SyncState = 'local';
  private lastSyncTime: number = Date.now();
  private userDocUnsubscribe: (() => void) | null = null;
  public isSyncingFavorites = false;
  public isQuotaExceeded = false;
  private activeSubscriptions: Set<() => void> = new Set();
  
  private activeConflict: {
    localFavorites: RadioStation[];
    cloudFavorites: RadioStation[];
    localUpdatedAt: number;
    cloudUpdatedAt: number;
  } | null = null;
  private conflictListeners: Array<(conflict: any | null) => void> = [];

  public getActiveConflict() {
    return this.activeConflict;
  }

  public subscribeConflict(cb: (conflict: any | null) => void): () => void {
    this.conflictListeners.push(cb);
    cb(this.activeConflict);
    return () => {
      this.conflictListeners = this.conflictListeners.filter(l => l !== cb);
    };
  }

  private notifyConflictListeners() {
    this.conflictListeners.forEach(cb => {
      try { cb(this.activeConflict); } catch {}
    });
  }

  public simulateConflict() {
    if (!this.currentUser) {
      this.currentUser = {
        uid: 'demo_user',
        email: 'demo@neotune.fm',
        displayName: 'Demo Listener',
        photoURL: '',
        isAnonymous: false,
      };
      this.notifyAuthListeners();
    }
    const localFavorites = storageService.getFavorites();
    const cloudFavorites: RadioStation[] = [
      {
        id: 'conflict_mock_1',
        name: '📻 Cloud Jazz Fusion',
        genre: 'Jazz',
        country: 'United States',
        streamUrl: 'https://stream.jazzfusion.fm',
        imageUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=300&auto=format&fit=crop&q=80',
        bitrate: '192 kbps',
        codec: 'AAC',
        isFavorite: true,
        customTags: ['Smooth', 'Instrumental']
      },
      {
        id: 'conflict_mock_2',
        name: '⚡ Cyber Bassline FM',
        genre: 'Electronic',
        country: 'Germany',
        streamUrl: 'https://stream.cyberbass.de',
        imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80',
        bitrate: '320 kbps',
        codec: 'MP3',
        isFavorite: true,
        customTags: ['Cyberpunk', 'Bass']
      }
    ];

    this.activeConflict = {
      localFavorites: localFavorites.length > 0 ? localFavorites : [
        {
          id: 'conflict_mock_local_1',
          name: '🎸 Local Garage Grunge',
          genre: 'Rock',
          country: 'United Kingdom',
          streamUrl: 'https://stream.garagegrunge.co.uk',
          imageUrl: 'https://images.unsplash.com/photo-1524567214243-9823354e4aa3?w=300&auto=format&fit=crop&q=80',
          bitrate: '128 kbps',
          codec: 'MP3',
          isFavorite: true,
          customTags: ['90s', 'Alternative']
        }
      ],
      cloudFavorites,
      localUpdatedAt: Date.now() - 3600000,
      cloudUpdatedAt: Date.now()
    };
    this.updateSyncStatus('error', 'Sync conflict detected. User intervention required.');
    this.notifyConflictListeners();
  }

  public async resolveConflict(keep: 'local' | 'cloud'): Promise<void> {
    if (!this.activeConflict) return;

    try {
      this.updateSyncStatus('syncing', `Resolving conflict in favor of ${keep} preferences...`);
      
      if (keep === 'local') {
        const favoritesToKeep = this.activeConflict.localFavorites;
        storageService.saveFavorites(favoritesToKeep);
        
        if (this.currentUser && !this.isQuotaExceeded && this.currentUser.uid !== 'demo_user') {
          const userRef = doc(db, 'users', this.currentUser.uid);
          await setDoc(userRef, { 
            favorites: favoritesToKeep, 
            favoritesCount: favoritesToKeep.length, 
            updatedAt: Date.now() 
          }, { merge: true });
        }
      } else {
        const favoritesToKeep = this.activeConflict.cloudFavorites;
        storageService.saveFavorites(favoritesToKeep);
      }

      this.activeConflict = null;
      this.updateSyncStatus('synced', 'Preferences resolved and successfully synchronized');
      this.notifyConflictListeners();
    } catch (e) {
      console.error('Failed to resolve conflict:', e);
      this.updateSyncStatus('error', 'Failed to resolve conflict');
    }
  }

  private trackSubscription(unsub: () => void): () => void {
    this.activeSubscriptions.add(unsub);
    return () => {
      this.activeSubscriptions.delete(unsub);
      unsub();
    };
  }

  constructor() {
    this.init();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.updateSyncStatus('syncing', 'Reconnected to network. Syncing preferences...');
        this.syncOfflineQueueOnReconnection()
          .then(() => this.pullAllCloudPreferences())
          .then(() => {
            this.updateSyncStatus('synced', 'All preferences synchronized');
          })
          .catch(() => {
            this.updateSyncStatus('synced', 'Preferences active');
          });
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.updateSyncStatus('offline', 'Offline mode. Changes saved locally.');
      });
    }
  }

  private init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    onAuthStateChanged(auth, async (user: User | null) => {
      if (this.userDocUnsubscribe) {
        this.userDocUnsubscribe();
        this.userDocUnsubscribe = null;
      }

      if (user) {
        this.updateSyncStatus('syncing', 'Connecting to Firestore cloud...');
        // Fetch Firestore profile in case photoURL or displayName was updated in Firestore
        let remoteDisplayName = user.displayName;
        let remotePhotoURL = user.photoURL;

        try {
          const userSnap = await getDoc(doc(db, 'users', user.uid));
          if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.displayName) remoteDisplayName = data.displayName;
            if (data.photoURL) remotePhotoURL = data.photoURL;
          }
        } catch (e) {
          console.warn('Profile fetch note:', e);
        }

        this.currentUser = {
          uid: user.uid,
          email: user.email,
          displayName: remoteDisplayName || user.email?.split('@')[0] || 'Audiophile',
          photoURL: remotePhotoURL,
          isAnonymous: user.isAnonymous,
          syncedAt: Date.now()
        };

        // Sync initial user profile document in Firestore with offline persistence
        try {
          await setDoc(
            doc(db, 'users', user.uid),
            {
              email: user.email,
              displayName: this.currentUser.displayName,
              photoURL: this.currentUser.photoURL,
              lastLoginAt: Date.now()
            },
            { merge: true }
          );
        } catch (err) {
          this.handleFirebaseSyncError('profile init write', err);
        }

        // Attach real-time listener to user preferences for cross-device synchronization
        this.attachUserDocListener(user.uid);

        // Trigger initial bidirectional reconciliation
        this.syncOfflineQueueOnReconnection().catch(() => {});
        this.pullAllCloudPreferences().catch(() => {});
      } else {
        this.currentUser = null;
        this.updateSyncStatus('local', 'Local storage mode (Sign in for cross-device cloud sync)');
      }

      this.notifyAuthListeners();
    });
  }

  // Real-time listener for user document to keep preferences synced across all open tabs/devices
  private attachUserDocListener(uid: string) {
    try {
      const userRef = doc(db, 'users', uid);
      this.userDocUnsubscribe = onSnapshot(
        userRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            this.handleRealtimeCloudUpdate(data);
            this.updateSyncStatus('synced', 'Preferences actively synced with Firestore');
          }
        },
        (err) => {
          this.handleFirebaseSyncError('sync user profile listener', err);
          if (!this.isOnline) {
            this.updateSyncStatus('offline', 'Offline mode');
          }
        }
      );
    } catch (e) {
      console.warn('Attach listener err:', e);
    }
  }

  private handleRealtimeCloudUpdate(data: any) {
    if (!data) return;
    try {
      // 1. Check for Conflicts first before syncing favorites
      if (Array.isArray(data.favorites)) {
        const localFavs = storageService.getFavorites();
        
        // Let's compare sets of stations to detect any content divergence
        const localIds = localFavs.map(s => s.id).sort().join(',');
        const cloudIds = data.favorites.map((s: any) => s.id).sort().join(',');
        
        if (localFavs.length > 0 && data.favorites.length > 0 && localIds !== cloudIds && !this.activeConflict) {
          console.warn('[FirebaseService] Real-time sync conflict detected!');
          const maxLocalTime = localFavs.reduce((max, s) => Math.max(max, (s as any).dateAdded || 0, (s as any).lastListenedTimestamp || 0), 0) || (Date.now() - 10000);
          this.activeConflict = {
            localFavorites: localFavs,
            cloudFavorites: data.favorites,
            localUpdatedAt: maxLocalTime,
            cloudUpdatedAt: data.updatedAt || Date.now()
          };
          this.updateSyncStatus('error', 'Sync conflict detected. Manual resolution required.');
          this.notifyConflictListeners();
          return; // Freeze automatic updates to protect both data versions
        }
      }

      // 2. Sync Favorites if no conflict or already resolved
      if (Array.isArray(data.favorites) && data.favorites.length > 0) {
        const localFavs = storageService.getFavorites();
        const map = new Map<string, RadioStation>();
        localFavs.forEach(s => map.set(s.id, s));
        data.favorites.forEach((s: RadioStation) => map.set(s.id, s));
        const merged = Array.from(map.values());
        storageService.saveFavorites(merged);
      }

      // 2. Sync Alarm config if available
      if (data.alarmConfig && typeof data.alarmConfig === 'object') {
        const localAlarm = storageService.getAlarmConfig();
        if (data.alarmUpdatedAt && (!localAlarm || (data.alarmUpdatedAt > (localAlarm as any).updatedAt || 0))) {
          storageService.saveAlarmConfig({
            ...data.alarmConfig,
            days: data.alarmConfig.days || [1, 2, 3, 4, 5]
          });
        }
      }

      // 3. Sync Settings if available
      if (data.settings && typeof data.settings === 'object') {
        if (data.settings.theme) storageService.saveTheme(data.settings.theme);
        if (data.settings.eqPreset) storageService.saveEQPreset(data.settings.eqPreset);
        if (typeof data.settings.batterySaver === 'boolean') storageService.setBatterySaver(data.settings.batterySaver);
      }

      this.lastSyncTime = Date.now();
    } catch (err) {
      console.warn('Error handling realtime cloud update:', err);
    }
  }

  public async pullAllCloudPreferences(): Promise<void> {
    if (!this.currentUser) return;
    try {
      this.updateSyncStatus('syncing', 'Syncing preferences from cloud...');
      const userSnap = await getDoc(doc(db, 'users', this.currentUser.uid));
      if (userSnap.exists()) {
        this.handleRealtimeCloudUpdate(userSnap.data());
      }
      this.updateSyncStatus('synced', 'All preferences up to date');
    } catch (e) {
      console.warn('Pull cloud preferences note:', e);
      this.updateSyncStatus('synced', 'Synced with local cache');
    }
  }

  private handleFirebaseSyncError(action: string, error: any) {
    const isQuotaExceeded = error && (
      (error.code === 'resource-exhausted') || 
      (error.message && error.message.toLowerCase().includes('quota exceeded')) ||
      (error.message && error.message.toLowerCase().includes('resource-exhausted')) ||
      (error.message && error.message.toLowerCase().includes('resource_exhausted'))
    );

    if (isQuotaExceeded) {
      this.isQuotaExceeded = true;
      console.warn(`[FirebaseService] Quota exceeded during ${action}. Falling back to offline local mode.`);
      this.updateSyncStatus('error', 'Cloud database quota reached. Operating in Local Mode.');
      
      // Clean up internal user doc listener
      if (this.userDocUnsubscribe) {
        try { this.userDocUnsubscribe(); } catch {}
        this.userDocUnsubscribe = null;
      }

      // Automatically unsubscribe all tracked realtime snapshot listeners to halt SDK connection attempts
      this.activeSubscriptions.forEach((unsub) => {
        try { unsub(); } catch {}
      });
      this.activeSubscriptions.clear();
    } else {
      console.error(`[FirebaseService] Failed to ${action}:`, error);
      this.updateSyncStatus('synced', 'Saved to local cache');
    }
  }

  public updateSyncStatus(state: SyncState, message: string) {
    this.syncState = state;
    if (state === 'synced') {
      this.lastSyncTime = Date.now();
    }
    const info: SyncStatusInfo = {
      state,
      lastSyncTime: this.lastSyncTime,
      message,
      isRealtime: !!this.userDocUnsubscribe
    };
    this.syncListeners.forEach(cb => {
      try { cb(info); } catch {}
    });
  }

  public getSyncStatus(): SyncStatusInfo {
    return {
      state: !this.isOnline ? 'offline' : (this.currentUser ? this.syncState : 'local'),
      lastSyncTime: this.lastSyncTime,
      message: !this.isOnline
        ? 'Offline mode. Changes saved locally.'
        : (this.currentUser ? (this.syncState === 'syncing' ? 'Syncing with Firestore...' : 'Real-time sync active') : 'Local storage mode (Sign in to sync)'),
      isRealtime: !!this.userDocUnsubscribe && !!this.currentUser
    };
  }

  public subscribeSyncStatus(cb: (status: SyncStatusInfo) => void): () => void {
    this.syncListeners.push(cb);
    cb(this.getSyncStatus());
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== cb);
    };
  }

  public async triggerSyncNow(): Promise<void> {
    if (this.isQuotaExceeded) {
      this.updateSyncStatus('error', 'Cloud database quota reached. Operating in Local Mode.');
      return;
    }
    if (!this.currentUser) {
      this.updateSyncStatus('local', 'Local storage active');
      return;
    }
    this.updateSyncStatus('syncing', 'Actively pushing and pulling Firestore updates...');
    try {
      const favorites = storageService.getFavorites();
      const alarm = storageService.getAlarmConfig();
      const theme = storageService.getTheme();
      const eqPreset = storageService.getEQPreset();

      await setDoc(
        doc(db, 'users', this.currentUser.uid),
        {
          favorites,
          favoritesCount: favorites.length,
          alarmConfig: alarm,
          alarmUpdatedAt: Date.now(),
          settings: { theme, eqPreset },
          updatedAt: Date.now()
        },
        { merge: true }
      );

      await this.syncOfflineQueueOnReconnection();
      await this.pullAllCloudPreferences();
      this.updateSyncStatus('synced', 'Successfully synced across all devices');
    } catch (e) {
      console.warn('Trigger sync error:', e);
      this.updateSyncStatus('synced', 'Synced with offline persistent cache');
    }
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  // --- Authentication ---
  public async signInWithGoogle(): Promise<UserProfile | null> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return this.mapUser(result.user);
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      throw new Error(err.message || 'Failed to sign in with Google');
    }
  }

  public async signInWithGithub(): Promise<UserProfile | null> {
    try {
      const result = await signInWithPopup(auth, githubProvider);
      return this.mapUser(result.user);
    } catch (err: any) {
      console.error('GitHub Sign In Error:', err);
      throw new Error(err.message || 'Failed to sign in with GitHub');
    }
  }

  public async signInWithTwitter(): Promise<UserProfile | null> {
    try {
      const result = await signInWithPopup(auth, twitterProvider);
      return this.mapUser(result.user);
    } catch (err: any) {
      console.error('Twitter Sign In Error:', err);
      throw new Error(err.message || 'Failed to sign in with Twitter');
    }
  }

  // --- Station Sharing Analytics ---
  public async trackStationShare(station: RadioStation): Promise<void> {
    if (!station || !station.id) return;
    try {
      const docRef = doc(db, 'shared_stations', station.id);
      await setDoc(
        docRef,
        {
          id: station.id,
          name: station.name,
          genre: station.genre || 'Live Radio',
          country: station.country || 'Global',
          countryCode: station.countryCode || '',
          streamUrl: station.streamUrl,
          imageUrl: station.imageUrl,
          bitrate: station.bitrate || '128k',
          codec: station.codec || 'MP3',
          shareCount: increment(1),
          lastSharedAt: Date.now()
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Track station share analytics note:', e);
    }
  }

  public async fetchTopSharedStations(limitCount = 6): Promise<RadioStation[]> {
    try {
      const q = query(
        collection(db, 'shared_stations'),
        orderBy('shareCount', 'desc'),
        limit(limitCount)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map(d => {
          const data = d.data();
          return {
            id: data.id,
            name: data.name,
            genre: data.genre || 'Live Radio',
            country: data.country || 'Global',
            countryCode: data.countryCode,
            streamUrl: data.streamUrl,
            imageUrl: data.imageUrl,
            bitrate: data.bitrate || '128k',
            codec: data.codec || 'MP3',
            isFavorite: storageService.isFavorite(data.id),
            customTags: data.customTags || [],
            clickcount: data.shareCount || 1
          } as RadioStation;
        });
      }
    } catch (e) {
      console.warn('Fetch top shared stations note:', e);
    }
    return [];
  }

  public async getPopularOrTrendingStations(limitCount: number = 20): Promise<RadioStation[]> {
    try {
      const topShared = await this.fetchTopSharedStations(limitCount);
      if (topShared && topShared.length >= 6) {
        return topShared;
      }
      const remote = await this.fetchRemoteConfig();
      if (remote && remote.trendingStations && remote.trendingStations.length > 0) {
        return remote.trendingStations;
      }
    } catch (e) {
      console.warn('Get popular/trending stations note:', e);
    }
    return [];
  }

  public async signInWithEmail(email: string, pass: string): Promise<UserProfile | null> {
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      return this.mapUser(result.user);
    } catch (err: any) {
      console.error('Email Sign In Error:', err);
      throw new Error(this.humanizeAuthError(err.code || err.message));
    }
  }

  public async signUpWithEmail(email: string, pass: string, name?: string): Promise<UserProfile | null> {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      if (name && result.user) {
        try {
          await updateProfile(result.user, { displayName: name });
        } catch {}
        await setDoc(
          doc(db, 'users', result.user.uid),
          { displayName: name, email, createdAt: Date.now() },
          { merge: true }
        );
      }
      return this.mapUser(result.user);
    } catch (err: any) {
      console.error('Sign Up Error:', err);
      throw new Error(this.humanizeAuthError(err.code || err.message));
    }
  }

  public async logout(): Promise<void> {
    await signOut(auth);
    this.currentUser = null;
    this.notifyAuthListeners();
  }

  public async signOut(): Promise<void> {
    return this.logout();
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public onAuthStateChanged(cb: (user: UserProfile | null) => void): () => void {
    this.authListeners.push(cb);
    cb(this.currentUser);
    return () => {
      this.authListeners = this.authListeners.filter(l => l !== cb);
    };
  }

  private notifyAuthListeners() {
    this.authListeners.forEach(cb => cb(this.currentUser));
  }

  private mapUser(user: User): UserProfile {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email?.split('@')[0] || 'NeoTune Member',
      photoURL: user.photoURL,
      isAnonymous: user.isAnonymous,
      syncedAt: Date.now()
    };
  }

  private humanizeAuthError(code: string): string {
    if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) {
      return 'Invalid email or password.';
    }
    if (code.includes('email-already-in-use')) {
      return 'An account already exists with this email.';
    }
    if (code.includes('weak-password')) {
      return 'Password should be at least 6 characters.';
    }
    if (code.includes('invalid-email')) {
      return 'Please enter a valid email address.';
    }
    return code || 'Authentication failed. Please try again.';
  }

  // --- User Profile View & Cloud Update ---
  public async updateUserProfile(updates: { displayName?: string; photoURL?: string }): Promise<UserProfile | null> {
    if (!this.currentUser || !auth.currentUser) return null;
    try {
      const authUpdates: { displayName?: string; photoURL?: string } = {};
      if (updates.displayName !== undefined) authUpdates.displayName = updates.displayName.trim();
      if (updates.photoURL !== undefined) authUpdates.photoURL = updates.photoURL.trim();

      // 1. Update Firebase Auth Profile
      if (!this.isQuotaExceeded && Object.keys(authUpdates).length > 0) {
        await updateProfile(auth.currentUser, authUpdates);
      }

      // 2. Update Firestore User Document (offline supported & auto-synced)
      if (!this.isQuotaExceeded) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const firestoreUpdates: any = {
          updatedAt: Date.now()
        };
        if (updates.displayName !== undefined) firestoreUpdates.displayName = updates.displayName.trim();
        if (updates.photoURL !== undefined) firestoreUpdates.photoURL = updates.photoURL.trim();

        await setDoc(userRef, firestoreUpdates, { merge: true });
      }

      // 3. Update active user profile
      this.currentUser = {
        ...this.currentUser,
        displayName: updates.displayName !== undefined ? updates.displayName.trim() : this.currentUser.displayName,
        photoURL: updates.photoURL !== undefined ? updates.photoURL.trim() : this.currentUser.photoURL,
        syncedAt: Date.now()
      };

      this.notifyAuthListeners();
      return this.currentUser;
    } catch (err: any) {
      console.error('Failed to update user profile:', err);
      throw new Error(err.message || 'Profile update failed.');
    }
  }

  public subscribeUserProfile(cb: (profile: any) => void): () => void {
    if (!this.currentUser || this.isQuotaExceeded) return () => {};
    try {
      const userRef = doc(db, 'users', this.currentUser.uid);
      const unsub = onSnapshot(
        userRef,
        (snap) => {
          if (snap.exists()) {
            cb(snap.data());
          }
        },
        (err) => {
          this.handleFirebaseSyncError('profile listener', err);
        }
      );
      return this.trackSubscription(unsub);
    } catch {
      return () => {};
    }
  }

  // --- Firestore Cloud Sync: Favorites & Theme ---
  public async syncFavoritesToCloud(favorites: RadioStation[]): Promise<void> {
    if (!this.currentUser || this.isQuotaExceeded) return;
    this.isSyncingFavorites = true;
    this.updateSyncStatus('syncing', 'Syncing favorites to Firestore...');
    try {
      const userRef = doc(db, 'users', this.currentUser.uid);
      await setDoc(userRef, { favorites, favoritesCount: favorites.length, updatedAt: Date.now() }, { merge: true });
      this.updateSyncStatus('synced', 'Favorites synchronized across devices');
    } catch (e) {
      this.handleFirebaseSyncError('sync favorites', e);
    } finally {
      // Delay releasing the lock to allow snapshot loop to settle
      setTimeout(() => {
        this.isSyncingFavorites = false;
      }, 1500);
    }
  }

  public async saveUserThemeToCloud(theme: ThemeType, customColors?: VisualizerCustomColors): Promise<void> {
    if (!this.currentUser || this.isQuotaExceeded) return;
    try {
      const userRef = doc(db, 'users', this.currentUser.uid);
      await setDoc(
        userRef,
        {
          settings: {
            theme,
            customColors: customColors || storageService.getVisualizerCustomColors(),
            updatedAt: Date.now()
          }
        },
        { merge: true }
      );
    } catch (e) {
      this.handleFirebaseSyncError('save user theme', e);
    }
  }

  public async getCloudFavorites(): Promise<RadioStation[] | null> {
    if (!this.currentUser || this.isQuotaExceeded) return null;
    try {
      const userSnap = await getDoc(doc(db, 'users', this.currentUser.uid));
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (Array.isArray(data.favorites)) {
          return data.favorites;
        }
      }
    } catch (e) {
      this.handleFirebaseSyncError('sync favorites get', e);
    }
    return null;
  }

  public async fetchFavoritesFromCloud(): Promise<RadioStation[] | null> {
    return this.getCloudFavorites();
  }

  public subscribeFavorites(cb: (favorites: RadioStation[]) => void): () => void {
    if (!this.currentUser || this.isQuotaExceeded) return () => {};
    try {
      const userRef = doc(db, 'users', this.currentUser.uid);
      const unsub = onSnapshot(userRef, (snap) => {
        if (snap.exists() && Array.isArray(snap.data().favorites)) {
          cb(snap.data().favorites);
        }
      }, (err) => {
        this.handleFirebaseSyncError('favorites listener', err);
      });
      return this.trackSubscription(unsub);
    } catch {
      return () => {};
    }
  }

  // --- Firestore Cloud Sync: Settings & Theme ---
  public async syncSettingsToCloud(settings: {
    theme?: ThemeType;
    language?: string;
    eqPreset?: string;
    volume?: number;
    batterySaver?: boolean;
    autoPlay?: boolean;
    normalizeAudio?: boolean;
  }): Promise<void> {
    if (!this.currentUser || this.isQuotaExceeded) return;
    this.updateSyncStatus('syncing', 'Syncing settings to Firestore...');
    try {
      await setDoc(doc(db, 'users', this.currentUser.uid), { settings, updatedAt: Date.now() }, { merge: true });
      this.updateSyncStatus('synced', 'Settings synchronized across devices');
    } catch (e) {
      this.handleFirebaseSyncError('sync settings', e);
    }
  }

  public async getCloudSettings(): Promise<any | null> {
    if (!this.currentUser || this.isQuotaExceeded) return null;
    try {
      const snap = await getDoc(doc(db, 'users', this.currentUser.uid));
      if (snap.exists() && snap.data().settings) {
        return snap.data().settings;
      }
    } catch (e) {
      this.handleFirebaseSyncError('sync settings get', e);
    }
    return null;
  }

  public async fetchSettingsFromCloud(): Promise<any | null> {
    return this.getCloudSettings();
  }

  // --- Firestore Cloud Sync: Recurring Alarms ---
  public async syncAlarmToCloud(alarm: AlarmConfig): Promise<void> {
    if (!this.currentUser || this.isQuotaExceeded) return;
    this.updateSyncStatus('syncing', 'Syncing alarm to Firestore...');
    try {
      await setDoc(
        doc(db, 'users', this.currentUser.uid),
        { alarmConfig: alarm, alarmUpdatedAt: Date.now() },
        { merge: true }
      );
      this.updateSyncStatus('synced', 'Alarm synchronized across devices');
    } catch (e) {
      this.handleFirebaseSyncError('sync alarm', e);
    }
  }

  public async getCloudAlarm(): Promise<AlarmConfig | null> {
    if (!this.currentUser || this.isQuotaExceeded) return null;
    try {
      const snap = await getDoc(doc(db, 'users', this.currentUser.uid));
      if (snap.exists() && snap.data().alarmConfig) {
        return snap.data().alarmConfig as AlarmConfig;
      }
    } catch (e) {
      this.handleFirebaseSyncError('sync alarm get', e);
    }
    return null;
  }

  public subscribeUserAlarm(cb: (alarm: AlarmConfig) => void): () => void {
    if (!this.currentUser || this.isQuotaExceeded) return () => {};
    try {
      const userRef = doc(db, 'users', this.currentUser.uid);
      const unsub = onSnapshot(
        userRef,
        (snap) => {
          if (snap.exists() && snap.data().alarmConfig) {
            cb(snap.data().alarmConfig as AlarmConfig);
          }
        },
        (err) => {
          this.handleFirebaseSyncError('alarm listener', err);
        }
      );
      return this.trackSubscription(unsub);
    } catch {
      return () => {};
    }
  }

  // --- Firestore Cloud Sync: Podcast Episode Progress ---
  public async syncPodcastProgressToCloud(progress: PodcastProgress): Promise<void> {
    if (!this.currentUser || this.isQuotaExceeded) return;
    try {
      const sanitizedId = encodeURIComponent(progress.stationIdOrUrl).replace(/\./g, '%2E');
      await setDoc(
        doc(db, 'users', this.currentUser.uid, 'podcastProgress', sanitizedId),
        progress,
        { merge: true }
      );
    } catch (e) {
      this.handleFirebaseSyncError('sync podcast progress', e);
    }
  }

  public async getCloudPodcastProgress(showOrEpisodeId: string): Promise<PodcastProgress | null> {
    if (!this.currentUser || this.isQuotaExceeded) return null;
    try {
      const sanitizedId = encodeURIComponent(showOrEpisodeId).replace(/\./g, '%2E');
      const snap = await getDoc(doc(db, 'users', this.currentUser.uid, 'podcastProgress', sanitizedId));
      if (snap.exists()) {
        return snap.data() as PodcastProgress;
      }
    } catch (e) {
      this.handleFirebaseSyncError('get podcast progress', e);
    }
    return null;
  }

  // --- Firestore Cloud Sync: Recent Stations (Last 10 Played across devices) ---
  public async addRecentStationToCloud(station: RadioStation): Promise<void> {
    if (!this.currentUser || this.isQuotaExceeded) return;
    try {
      const userRef = doc(db, 'users', this.currentUser.uid);
      const snap = await getDoc(userRef);
      let existingRecents: RadioStation[] = [];
      if (snap.exists() && Array.isArray(snap.data().recentStations)) {
        existingRecents = snap.data().recentStations;
      }

      // Filter out duplicate station id, insert new station at index 0, limit to last 10
      const filtered = existingRecents.filter(s => s.id !== station.id);
      const updatedRecents = [
        { ...station, lastListenedTimestamp: Date.now() },
        ...filtered
      ].slice(0, 10);

      await setDoc(
        userRef,
        {
          recentStations: updatedRecents,
          recentStationsCount: updatedRecents.length,
          lastPlayedAt: Date.now()
        },
        { merge: true }
      );
    } catch (e) {
      this.handleFirebaseSyncError('add recent station', e);
    }
  }

  public async syncRecentStationsToCloud(recents: RadioStation[]): Promise<void> {
    if (!this.currentUser || this.isQuotaExceeded) return;
    try {
      const userRef = doc(db, 'users', this.currentUser.uid);
      const top10 = recents.slice(0, 10);
      await setDoc(
        userRef,
        {
          recentStations: top10,
          recentStationsCount: top10.length,
          lastPlayedAt: Date.now()
        },
        { merge: true }
      );
    } catch (e) {
      this.handleFirebaseSyncError('sync recents', e);
    }
  }

  public async getCloudRecentStations(): Promise<RadioStation[] | null> {
    if (!this.currentUser || this.isQuotaExceeded) return null;
    try {
      const snap = await getDoc(doc(db, 'users', this.currentUser.uid));
      if (snap.exists() && Array.isArray(snap.data().recentStations)) {
        return snap.data().recentStations as RadioStation[];
      }
    } catch (e) {
      this.handleFirebaseSyncError('sync recents get', e);
    }
    return null;
  }

  public subscribeRecentStations(cb: (stations: RadioStation[]) => void): () => void {
    if (!this.currentUser || this.isQuotaExceeded) return () => {};
    try {
      const userRef = doc(db, 'users', this.currentUser.uid);
      const unsub = onSnapshot(
        userRef,
        (snap) => {
          if (snap.exists() && Array.isArray(snap.data().recentStations)) {
            cb(snap.data().recentStations as RadioStation[]);
          }
        },
        (err) => {
          this.handleFirebaseSyncError('recent stations listener', err);
        }
      );
      return this.trackSubscription(unsub);
    } catch {
      return () => {};
    }
  }

  public async clearCloudRecentStations(): Promise<void> {
    if (!this.currentUser) return;
    try {
      const userRef = doc(db, 'users', this.currentUser.uid);
      await setDoc(userRef, { recentStations: [], recentStationsCount: 0 }, { merge: true });
    } catch (e) {
      console.error('Clear cloud recents note:', e);
    }
  }

  // --- Firestore Cloud Sync: Queued for Later Stations ---
  public async addQueuedStationToCloud(station: RadioStation): Promise<void> {
    if (!this.currentUser || this.isQuotaExceeded) return;
    try {
      const userRef = doc(db, 'users', this.currentUser.uid);
      const snap = await getDoc(userRef);
      let existingQueue: QueuedStation[] = [];
      if (snap.exists() && Array.isArray(snap.data().queuedStations)) {
        existingQueue = snap.data().queuedStations;
      }

      const filtered = existingQueue.filter(s => s.id !== station.id);
      const newItem: QueuedStation = {
        ...station,
        queuedAt: Date.now(),
        syncStatus: 'synced'
      };
      const updated = [newItem, ...filtered].slice(0, 50);

      await setDoc(
        userRef,
        {
          queuedStations: updated,
          queuedStationsCount: updated.length,
          queueUpdatedAt: Date.now()
        },
        { merge: true }
      );
    } catch (e) {
      this.handleFirebaseSyncError('add queued station', e);
    }
  }

  public async removeQueuedStationFromCloud(stationId: string): Promise<void> {
    if (!this.currentUser) return;
    try {
      const userRef = doc(db, 'users', this.currentUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists() && Array.isArray(snap.data().queuedStations)) {
        const updated = (snap.data().queuedStations as QueuedStation[]).filter(s => s.id !== stationId);
        await setDoc(
          userRef,
          {
            queuedStations: updated,
            queuedStationsCount: updated.length,
            queueUpdatedAt: Date.now()
          },
          { merge: true }
        );
      }
    } catch (e) {
      console.warn('Remove queued station from Firestore note:', e);
    }
  }

  public async getCloudQueuedStations(): Promise<QueuedStation[] | null> {
    if (!this.currentUser || this.isQuotaExceeded) return null;
    try {
      const snap = await getDoc(doc(db, 'users', this.currentUser.uid));
      if (snap.exists() && Array.isArray(snap.data().queuedStations)) {
        return snap.data().queuedStations as QueuedStation[];
      }
    } catch (e) {
      this.handleFirebaseSyncError('sync queued get', e);
    }
    return null;
  }

  public subscribeQueuedStations(cb: (stations: QueuedStation[]) => void): () => void {
    if (!this.currentUser || this.isQuotaExceeded) return () => {};
    try {
      const userRef = doc(db, 'users', this.currentUser.uid);
      const unsub = onSnapshot(
        userRef,
        (snap) => {
          if (snap.exists() && Array.isArray(snap.data().queuedStations)) {
            cb(snap.data().queuedStations as QueuedStation[]);
          }
        },
        (err) => {
          this.handleFirebaseSyncError('queued stations listener', err);
        }
      );
      return this.trackSubscription(unsub);
    } catch {
      return () => {};
    }
  }

  public async syncOfflineQueueOnReconnection(): Promise<void> {
    if (!this.currentUser || this.isQuotaExceeded) return;
    try {
      const localQueue = storageService.getQueuedStations();
      const localPending = localQueue.filter(s => s.syncStatus === 'local');

      if (localPending.length === 0) return;

      const cloudQueue = (await this.getCloudQueuedStations()) || [];
      const map = new Map<string, QueuedStation>();
      cloudQueue.forEach(s => map.set(s.id, s));
      localQueue.forEach(s => {
        map.set(s.id, { ...s, syncStatus: 'synced' });
      });

      const mergedList = Array.from(map.values()).slice(0, 50);
      storageService.saveQueuedStations(mergedList);

      const userRef = doc(db, 'users', this.currentUser.uid);
      await setDoc(
        userRef,
        {
          queuedStations: mergedList,
          queuedStationsCount: mergedList.length,
          queueUpdatedAt: Date.now()
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Sync offline queue note:', e);
    }
  }

  // --- Active Cross-Device Playback Session ---
  public async updateActivePlaybackSession(station: RadioStation | null, isPlaying: boolean): Promise<void> {
    if (!this.currentUser || this.isQuotaExceeded) return;
    try {
      const userRef = doc(db, 'users', this.currentUser.uid);
      const sessionData = isPlaying && station ? {
        deviceId: getDeviceId(),
        deviceName: getDeviceName(),
        station,
        isPlaying: true,
        updatedAt: Date.now()
      } : {
        deviceId: getDeviceId(),
        deviceName: getDeviceName(),
        isPlaying: false,
        updatedAt: Date.now()
      };

      await setDoc(userRef, { activePlaybackSession: sessionData }, { merge: true });
    } catch (e) {
      this.handleFirebaseSyncError('update active playback session', e);
    }
  }

  public subscribeActivePlaybackSession(cb: (session: ActivePlaybackSession | null) => void): () => void {
    if (!this.currentUser || this.isQuotaExceeded) return () => {};
    try {
      const userRef = doc(db, 'users', this.currentUser.uid);
      const unsub = onSnapshot(
        userRef,
        (snap) => {
          if (snap.exists() && snap.data().activePlaybackSession) {
            const session = snap.data().activePlaybackSession as ActivePlaybackSession;
            cb(session);
          } else {
            cb(null);
          }
        },
        (err) => {
          this.handleFirebaseSyncError('active session listener', err);
        }
      );
      return this.trackSubscription(unsub);
    } catch {
      return () => {};
    }
  }


  // --- Remote Config: Dynamic Trending Stations & Featured Podcasts ---
  public async fetchRemoteConfig(): Promise<RemoteContentConfig | null> {
    if (this.isQuotaExceeded) return null;
    try {
      const docRef = doc(db, 'remote_config', 'content');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as RemoteContentConfig;
        this.notifyRemoteConfig(data);
        return data;
      }
    } catch (e) {
      this.handleFirebaseSyncError('remote config fetch', e);
    }
    return null;
  }

  public subscribeRemoteConfig(cb: (config: RemoteContentConfig) => void): () => void {
    if (this.isQuotaExceeded) return () => {};
    try {
      const docRef = doc(db, 'remote_config', 'content');
      const unsubscribe = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as RemoteContentConfig;
          cb(data);
        }
      }, (err) => {
        this.handleFirebaseSyncError('remote config listener', err);
      });
      return this.trackSubscription(unsubscribe);
    } catch {
      return () => {};
    }
  }

  private notifyRemoteConfig(config: RemoteContentConfig) {
    this.remoteConfigListeners.forEach(cb => cb(config));
  }

  // --- Cloud Messaging & Push Notifications for Recurring Alarms ---
  public async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch {
      return false;
    }
  }

  public scheduleAlarmNotification(alarm: AlarmConfig): void {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    // Check if alarm day matches today
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sun ... 6 = Sat
    const recurringDays = alarm.days && alarm.days.length > 0 ? alarm.days : [0, 1, 2, 3, 4, 5, 6];

    if (recurringDays.includes(dayOfWeek)) {
      new Notification('🔔 NeoTune Live Radio Alarm', {
        body: `Time to wake up! Playing ${alarm.stationName || 'your live radio stream'}`,
        icon: alarm.stationImageUrl || '/favicon.ico',
        tag: 'neotune-alarm',
        requireInteraction: true
      });
    }
  }

  // --- Real-time Station Community Live Chat ---
  public subscribeStationChat(stationId: string, cb: (messages: StationChatMessage[]) => void): () => void {
    if (!stationId) return () => {};
    try {
      const chatRef = collection(db, 'station_chats', stationId, 'messages');
      const q = query(chatRef, orderBy('createdAt', 'asc'), limit(50));

      const unsub = onSnapshot(
        q,
        (snap) => {
          const msgs: StationChatMessage[] = snap.docs.map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              stationId,
              userId: data.userId || 'anon',
              userName: data.userName || 'Listener',
              userPhoto: data.userPhoto || undefined,
              text: data.text || '',
              createdAt: data.createdAt || Date.now()
            };
          });
          cb(msgs);
        },
        (err) => {
          this.handleFirebaseSyncError('station chat listener', err);
        }
      );
      return this.trackSubscription(unsub);
    } catch (e) {
      console.warn('Subscribe station chat error:', e);
      return () => {};
    }
  }

  public async sendStationChatMessage(stationId: string, text: string, customName?: string, customPhoto?: string): Promise<void> {
    if (!stationId || !text.trim()) return;
    try {
      const cleanText = text.trim().slice(0, 300); // Sanitize max length
      const user = this.currentUser;
      const userName = customName || user?.displayName || 'Listener ' + Math.floor(1000 + Math.random() * 9000);
      const userId = user?.uid || getDeviceId();
      const userPhoto = customPhoto || user?.photoURL || undefined;

      const chatRef = collection(db, 'station_chats', stationId, 'messages');
      await addDoc(chatRef, {
        stationId,
        userId,
        userName,
        userPhoto,
        text: cleanText,
        createdAt: Date.now()
      });
    } catch (e) {
      console.error('Failed to send station chat message:', e);
      throw e;
    }
  }
}

export const firebaseService = new FirebaseService();

