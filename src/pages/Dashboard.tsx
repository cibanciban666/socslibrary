import React from 'react';
import { useLibrary } from '@/src/context/LibraryContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Book, ArrowDownRight, ArrowUpRight, Library } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function Dashboard() {
  const { books, transactions } = useLibrary();

  const totalBooks = books.reduce((acc, book) => acc + book.stock, 0);
  const totalAvailable = books.reduce((acc, book) => acc + book.available, 0);
  const totalBorrowed = totalBooks - totalAvailable;

  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Buku Fisik</CardTitle>
            <Library className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalBooks}</div>
            <p className="text-xs text-gray-500 mt-1">Total judul buku di kampus</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Buku Tersedia</CardTitle>
            <Book className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalAvailable}</div>
            <p className="text-xs text-gray-500 mt-1">Siap untuk dipinjam</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Buku Dipinjam</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalBorrowed}</div>
            <p className="text-xs text-gray-500 mt-1">Sedang berada di luar perpustakaan</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aktivitas Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">Belum ada aktivitas sirkulasi.</p>
          ) : (
            <div className="space-y-4">
              {recentTransactions.map((tx) => {
                const book = books.find(b => b.id === tx.bookId);
                return (
                  <div key={tx.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50/50">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-full ${tx.type === 'IN' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                        {tx.type === 'IN' ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {tx.type === 'IN' ? 'Buku Masuk (Dikembalikan/Baru)' : 'Buku Keluar (Dipinjam)'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {book?.title || 'Buku tidak diketahui'} • {tx.quantity} eksemplar
                          {tx.borrowerName && ` • Oleh: ${tx.borrowerName}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(tx.date), 'dd MMM yyyy, HH:mm', { locale: id })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
