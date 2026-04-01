import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  addBook: (book: Omit<Book, 'id' | 'createdAt' | 'available'>) => void;
  importBooks: (books: Omit<Book, 'id' | 'createdAt' | 'available'>[]) => void;
  updateBook: (id: string, book: Partial<Book>) => void;
  deleteBook: (id: string) => void;
  recordTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
  deleteTransaction: (id: string) => void;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export const LibraryProvider = ({ children }: { children: ReactNode }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data from server on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/books').then(res => res.json()),
      fetch('/api/transactions').then(res => res.json())
    ]).then(([b, t]) => {
      setBooks(b);
      setTransactions(t);
      setIsLoaded(true);
    }).catch(err => {
      console.error("Failed to load data from server", err);
      setIsLoaded(true);
    });
  }, []);

  // Save books to server whenever they change
  useEffect(() => {
    if (isLoaded) {
      fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(books)
      }).catch(err => console.error("Failed to save books", err));
    }
  }, [books, isLoaded]);

  // Save transactions to server whenever they change
  useEffect(() => {
    if (isLoaded) {
      fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactions)
      }).catch(err => console.error("Failed to save transactions", err));
    }
  }, [transactions, isLoaded]);

  const addBook = (bookData: Omit<Book, 'id' | 'createdAt' | 'available'>) => {
    const newBook: Book = {
      ...bookData,
      id: uuidv4(),
      available: bookData.stock,
      createdAt: new Date().toISOString(),
    };
    setBooks(prev => [...prev, newBook]);
  };

  const importBooks = (booksData: Omit<Book, 'id' | 'createdAt' | 'available'>[]) => {
    const newBooks: Book[] = booksData.map(data => ({
      ...data,
      id: uuidv4(),
      available: data.stock,
      createdAt: new Date().toISOString(),
    }));
    setBooks(prev => [...prev, ...newBooks]);
  };

  const updateBook = (id: string, updates: Partial<Book>) => {
    setBooks(prev => prev.map(book => {
      if (book.id === id) {
        // Recalculate available if stock is updated
        let newAvailable = book.available;
        if (updates.stock !== undefined && updates.stock !== book.stock) {
          const diff = updates.stock - book.stock;
          newAvailable = book.available + diff;
        }
        return { ...book, ...updates, available: newAvailable };
      }
      return book;
    }));
  };

  const deleteBook = (id: string) => {
    setBooks(prev => prev.filter(book => book.id !== id));
    // Optionally delete related transactions or keep them for history
  };

  const recordTransaction = (txData: Omit<Transaction, 'id' | 'date'>) => {
    const book = books.find(b => b.id === txData.bookId);
    if (!book) throw new Error("Buku tidak ditemukan");

    if (txData.type === 'OUT' && book.available < txData.quantity) {
      throw new Error("Stok buku tidak mencukupi untuk dipinjam");
    }

    const newTx: Transaction = {
      ...txData,
      id: uuidv4(),
      date: new Date().toISOString(),
    };

    setTransactions(prev => [newTx, ...prev]);

    // Update book availability
    setBooks(prev => prev.map(b => {
      if (b.id === txData.bookId) {
        return {
          ...b,
          available: txData.type === 'IN' 
            ? b.available + txData.quantity 
            : b.available - txData.quantity
        };
      }
      return b;
    }));
  };

  const deleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    // Revert book availability
    setBooks(prev => prev.map(b => {
      if (b.id === tx.bookId) {
        return {
          ...b,
          available: tx.type === 'IN' 
            ? b.available - tx.quantity 
            : b.available + tx.quantity
        };
      }
      return b;
    }));

    setTransactions(prev => prev.filter(t => t.id !== id));
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
