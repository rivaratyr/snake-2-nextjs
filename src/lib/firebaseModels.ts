import { db } from "./firebase";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  DocumentReference,
  Timestamp,
} from "firebase/firestore";

// --- Interfaces ---

export interface UserProfile {
  userId: string;
  username: string;
  email?: string;
  walletAddress: string;
  points: number;
}

export interface Transaction {
  transactionId?: string;
  userId: string;
  amount: number;
  type: string;
  timestamp: Timestamp;
}

export interface GameResult {
  resultId?: string;
  userIds: string[];
  scores: Record<string, number>;
  winnerId: string;
  timestamp: Timestamp;
}

// --- User Profile Functions ---

export async function createOrUpdateUserProfile(profile: UserProfile) {
  const ref = doc(db, "users", profile.userId);
  await setDoc(ref, profile, { merge: true });
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const ref = doc(db, "users", userId);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function updateUserPoints(userId: string, points: number) {
  const ref = doc(db, "users", userId);
  await updateDoc(ref, { points });
}

// --- Transaction Functions ---

export async function addTransaction(tx: Omit<Transaction, "transactionId">) {
  const ref = await addDoc(collection(db, "transactions"), tx);
  return ref.id;
}

export async function getUserTransactions(userId: string): Promise<Transaction[]> {
  const q = collection(db, "transactions");
  const snap = await getDocs(q);
  return snap.docs
    .map((doc) => ({ ...(doc.data() as Transaction), transactionId: doc.id }))
    .filter((tx) => tx.userId === userId);
}

// --- Game Result Functions ---

export async function addGameResult(result: Omit<GameResult, "resultId">) {
  const ref = await addDoc(collection(db, "gameResults"), result);
  return ref.id;
}

export async function getUserGameResults(userId: string): Promise<GameResult[]> {
  const q = collection(db, "gameResults");
  const snap = await getDocs(q);
  return snap.docs
    .map((doc) => ({ ...(doc.data() as GameResult), resultId: doc.id }))
    .filter((res) => res.userIds.includes(userId));
}
