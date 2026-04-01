import React, { useState } from 'react';
import { useLibrary, Transaction } from '@/src/context/LibraryContext';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { Badge } from '@/src/components/ui/badge';
import { ArrowDownRight, ArrowUpRight, Search, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function Transactions() {
  const { books, transactions, recordTransaction, deleteTransaction } = useLibrary();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txType, setTxType] = useState<'IN' | 'OUT'>('OUT');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    bookId: '',
    quantity: 1,
    borrowerName: '',
    notes: '',
  });

  const filteredTransactions = transactions.filter(tx => {
    const book = books.find(b => b.id === tx.bookId);
    const searchLower = search.toLowerCase();
    return (
      book?.title.toLowerCase().includes(searchLower) ||
      tx.borrowerName?.toLowerCase().includes(searchLower) ||
      tx.notes?.toLowerCase().includes(searchLower)
    );
  });

  const handleOpenModal = (type: 'IN' | 'OUT') => {
    setTxType(type);
    setFormData({ bookId: '', quantity: 1, borrowerName: '', notes: '' });
    setError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      recordTransaction({
        bookId: formData.bookId,
        type: txType,
        quantity: formData.quantity,
        borrowerName: txType === 'OUT' ? formData.borrowerName : undefined,
        notes: formData.notes,
      });
      handleCloseModal();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Hapus riwayat transaksi ini? Stok buku akan dikembalikan ke kondisi sebelum transaksi.')) {
      deleteTransaction(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Cari riwayat transaksi..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex space-x-2 w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => handleOpenModal('OUT')}>
            <ArrowUpRight className="h-4 w-4 mr-2" />
            Buku Keluar (Pinjam)
          </Button>
          <Button className="w-full sm:w-auto bg-green-600 hover:bg-green-700" onClick={() => handleOpenModal('IN')}>
            <ArrowDownRight className="h-4 w-4 mr-2" />
            Buku Masuk (Kembali)
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Buku</TableHead>
              <TableHead className="text-center">Jumlah</TableHead>
              <TableHead>Peminjam / Keterangan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Belum ada riwayat sirkulasi.
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((tx) => {
                const book = books.find(b => b.id === tx.bookId);
                return (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(tx.date), 'dd MMM yyyy', { locale: id })}
                      <div className="text-xs text-gray-500">{format(new Date(tx.date), 'HH:mm', { locale: id })}</div>
                    </TableCell>
                    <TableCell>
                      {tx.type === 'IN' ? (
                        <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-200">Masuk</Badge>
                      ) : (
                        <Badge variant="warning" className="bg-orange-100 text-orange-800 hover:bg-orange-200">Keluar</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {book?.title || <span className="text-red-500 italic">Buku telah dihapus</span>}
                    </TableCell>
                    <TableCell className="text-center font-semibold">{tx.quantity}</TableCell>
                    <TableCell>
                      {tx.type === 'OUT' && (
                        <div className="font-medium text-gray-900">{tx.borrowerName || '-'}</div>
                      )}
                      {tx.notes && <div className="text-xs text-gray-500 mt-1">{tx.notes}</div>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(tx.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold flex items-center">
                {txType === 'IN' ? (
                  <><ArrowDownRight className="h-5 w-5 mr-2 text-green-600" /> Catat Buku Masuk</>
                ) : (
                  <><ArrowUpRight className="h-5 w-5 mr-2 text-orange-600" /> Catat Buku Keluar</>
                )}
              </h2>
              <Button variant="ghost" size="icon" onClick={handleCloseModal}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Pilih Buku <span className="text-red-500">*</span></label>
                <select 
                  required 
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  value={formData.bookId}
                  onChange={e => setFormData({...formData, bookId: e.target.value})}
                >
                  <option value="" disabled>-- Pilih Buku --</option>
                  {books.map(book => (
                    <option key={book.id} value={book.id} disabled={txType === 'OUT' && book.available === 0}>
                      {book.title} ({txType === 'OUT' ? `Tersedia: ${book.available}` : `Stok Total: ${book.stock}`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Jumlah Eksemplar <span className="text-red-500">*</span></label>
                <Input 
                  type="number" 
                  min="1" 
                  required 
                  value={formData.quantity} 
                  onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 1})} 
                />
              </div>

              {txType === 'OUT' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nama Peminjam <span className="text-red-500">*</span></label>
                  <Input 
                    required 
                    placeholder="Nama mahasiswa / dosen"
                    value={formData.borrowerName} 
                    onChange={e => setFormData({...formData, borrowerName: e.target.value})} 
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Keterangan (Opsional)</label>
                <Input 
                  placeholder={txType === 'IN' ? "Kondisi buku, denda, dll" : "Tujuan peminjaman, dll"}
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                />
              </div>

              <div className="pt-4 flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleCloseModal}>Batal</Button>
                <Button type="submit" className={txType === 'IN' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}>
                  Simpan Transaksi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
