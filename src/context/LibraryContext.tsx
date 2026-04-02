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
      console.error('Firestore books error:', error);
    });

    const unsubTx = onSnapshot(collection(db, 'transactions'), (snapshot) => {
      const txData: Transaction[] = [];
      snapshot.forEach(doc => {
        txData.push({ id: doc.id, ...doc.data() } as Transaction);
      });
      txData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(txData);
    }, (error) => {
      console.error('Firestore transactions error:', error);
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
    await setDoc(doc(db, 'books', id), newBook);
  };

  const importBooks = async (booksData: Omit<Book, 'id' | 'createdAt' | 'available'>[]) => {
    // Firestore batch limit is 500 operations, we use chunks of 100 to be safe
    const CHUNK_SIZE = 100;
    
    for (let i = 0; i < booksData.length; i += CHUNK_SIZE) {
      const chunk = booksData.slice(i, i + CHUNK_SIZE);
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
  };

  const updateBook = async (id: string, updates: Partial<Book>) => {
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
  };

  const deleteBook = async (id: string) => {
    await deleteDoc(doc(db, 'books', id));
  };

  const recordTransaction = async (txData: Omit<Transaction, 'id' | 'date'>) => {
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
  };

  const deleteTransaction = async (id: string) => {
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
