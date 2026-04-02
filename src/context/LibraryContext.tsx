import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc, getDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  stock: number;
  available: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  bookId: string;
  type: 'IN' | 'OUT';
  quantity: number;
  borrowerName?: string;
  date: string;
  notes?: string;
}

interface LibraryContextType {
  books: Book[];
  transactions: Transaction[];
  addBook: (book: Omit<Book, 'id' | 'createdAt' | 'available'>) => Promise<void>;
  importBooks: (books: Omit<Book, 'id' | 'createdAt' | 'available'>[]) => Promise<void>;
  updateBook: (id: string, book: Partial<Book>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  recordTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const LibraryProvider = ({ children }: { children: ReactNode }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthReady(true);
      } else {
        signInAnonymously(auth).catch(console.error);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;

    const unsubBooks = onSnapshot(collection(db, 'books'), (snapshot) => {
      const booksData: Book[] = [];
      snapshot.forEach(doc => {
        booksData.push({ id: doc.id, ...doc.data() } as Book);
      });
      setBooks(booksData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'books');
    });

    const unsubTx = onSnapshot(collection(db, 'transactions'), (snapshot) => {
      const txData: Transaction[] = [];
      snapshot.forEach(doc => {
        txData.push({ id: doc.id, ...doc.data() } as Transaction);
      });
      // Sort by date descending
      txData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(txData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return () => {
      unsubBooks();
      unsubTx();
    };
  }, [isAuthReady]);

  const addBook = async (bookData: Omit<Book, 'id' | 'createdAt' | 'available'>) => {
    const id = uuidv4();
    const newBook = {
      ...bookData,
      available: bookData.stock,
      createdAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'books', id), newBook);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `books/${id}`);
    }
  };

  const importBooks = async (booksData: Omit<Book, 'id' | 'createdAt' | 'available'>[]) => {
    try {
      // Firestore batch limit is 500 operations
      const BATCH_SIZE = 400;
      for (let i = 0; i < booksData.length; i += BATCH_SIZE) {
        const chunk = booksData.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        
        chunk.forEach(data => {
          const id = uuidv4();
          const newBook = {
            ...data,
            available: data.stock,
            createdAt: new Date().toISOString(),
          };
          batch.set(doc(db, 'books', id), newBook);
        });
        
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'books');
    }
  };

  const updateBook = async (id: string, updates: Partial<Book>) => {
    try {
      const bookRef = doc(db, 'books', id);
      const bookSnap = await getDoc(bookRef);
      if (!bookSnap.exists()) throw new Error("Book not found");
      
      const book = bookSnap.data() as Book;
      let newAvailable = book.available;
      
      if (updates.stock !== undefined && updates.stock !== book.stock) {
        const diff = updates.stock - book.stock;
        newAvailable = book.available + diff;
      }
      
      await updateDoc(bookRef, { ...updates, available: newAvailable });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `books/${id}`);
    }
  };

  const deleteBook = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'books', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `books/${id}`);
    }
  };

  const recordTransaction = async (txData: Omit<Transaction, 'id' | 'date'>) => {
    try {
      const bookRef = doc(db, 'books', txData.bookId);
      const bookSnap = await getDoc(bookRef);
      if (!bookSnap.exists()) throw new Error("Buku tidak ditemukan");

      const book = bookSnap.data() as Book;
      if (txData.type === 'OUT' && book.available < txData.quantity) {
        throw new Error("Stok buku tidak mencukupi untuk dipinjam");
      }

      const txId = uuidv4();
      const newTx = {
        ...txData,
        date: new Date().toISOString(),
      };

      const newAvailable = txData.type === 'IN' 
        ? book.available + txData.quantity 
        : book.available - txData.quantity;

      const batch = writeBatch(db);
      batch.set(doc(db, 'transactions', txId), newTx);
      batch.update(bookRef, { available: newAvailable });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'transactions');
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const txRef = doc(db, 'transactions', id);
      const txSnap = await getDoc(txRef);
      if (!txSnap.exists()) return;

      const tx = txSnap.data() as Transaction;
      const bookRef = doc(db, 'books', tx.bookId);
      const bookSnap = await getDoc(bookRef);
      
      const batch = writeBatch(db);
      batch.delete(txRef);

      if (bookSnap.exists()) {
        const book = bookSnap.data() as Book;
        const newAvailable = tx.type === 'IN' 
          ? book.available - tx.quantity 
          : book.available + tx.quantity;
        batch.update(bookRef, { available: newAvailable });
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `transactions/${id}`);
    }
  };

  return (
    <LibraryContext.Provider value={{ books, transactions, addBook, importBooks, updateBook, deleteBook, recordTransaction, deleteTransaction }}>
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (context === undefined) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
};
