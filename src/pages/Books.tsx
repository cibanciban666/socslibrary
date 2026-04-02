import React, { useState, useRef } from 'react';
import { useLibrary, Book } from '@/src/context/LibraryContext';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { Badge } from '@/src/components/ui/badge';
import { Plus, Search, Edit2, Trash2, X, Upload, Download } from 'lucide-react';

export default function Books() {
  const { books, addBook, updateBook, deleteBook, importBooks } = useLibrary();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    category: '',
    stock: 1,
  });

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(search.toLowerCase()) || 
    b.author.toLowerCase().includes(search.toLowerCase()) ||
    b.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenModal = (book?: Book) => {
    if (book) {
      setEditingBook(book);
      setFormData({
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        category: book.category,
        stock: book.stock,
      });
    } else {
      setEditingBook(null);
      setFormData({ title: '', author: '', isbn: '', category: '', stock: 1 });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBook(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBook) {
      updateBook(editingBook.id, formData);
    } else {
      addBook(formData);
    }
    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus buku ini? Semua data terkait mungkin akan terpengaruh.')) {
      deleteBook(id);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Parse locally to update the UI and Database
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
    e.target.value = ''; // reset input
  };

  const parseCSV = (csvText: string) => {
    try {
      const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) throw new Error("File CSV kosong atau tidak memiliki data");

      const parsedBooks = [];
      
      // Basic CSV parser that handles quotes
      const parseLine = (line: string) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      for (let i = 1; i < lines.length; i++) {
        const row = parseLine(lines[i]);
        
        // Skip empty rows (like the ones at the end of the provided data)
        if (row.length < 2 || (!row[1] && !row[2])) continue;

        // Map to the specific CSV format:
        // No(0), Title(1), Author(2), Publisher(3), Language(4), ISBN(5), Added Date(6), Copy Index(7), BookShelf(8)
        parsedBooks.push({
          title: row[1] || 'Tanpa Judul',
          author: row[2] || 'Anonim',
          isbn: row[5] || '',
          category: row[8] || 'Umum',
          stock: 1, // Defaulting to 1 as per the data structure (each row seems to be a single copy)
        });
      }

      if (parsedBooks.length > 0) {
        // Group by title to calculate total stock for identical books
        const groupedBooks = parsedBooks.reduce((acc, current) => {
          const existing = acc.find((b: any) => b.title === current.title && b.author === current.author);
          if (existing) {
            existing.stock += 1;
          } else {
            acc.push(current);
          }
          return acc;
        }, [] as any[]);

        importBooks(groupedBooks);
        alert(`Berhasil mengimpor ${groupedBooks.length} judul buku (Total ${parsedBooks.length} eksemplar)!`);
      } else {
        alert("Tidak ada data buku yang valid untuk diimpor.");
      }
    } catch (error) {
      alert("Gagal membaca file CSV. Pastikan formatnya benar.");
      console.error(error);
    }
  };

  const downloadTemplate = () => {
    const template = "Judul,Penulis,ISBN,Kategori,Stok\nBuku Contoh 1,Penulis A,123456789,Fiksi,5\nBuku Contoh 2,Penulis B,987654321,Sains,3";
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_import_buku.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Cari judul, penulis, atau kategori..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto mt-4 sm:mt-0">
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
          <Button variant="outline" onClick={downloadTemplate} title="Download Template CSV" className="flex-1 sm:flex-none">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleImportClick} className="flex-1 sm:flex-none">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Buku
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Judul Buku</TableHead>
              <TableHead>Penulis</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-center">Stok Total</TableHead>
              <TableHead className="text-center">Tersedia</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBooks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  Tidak ada data buku ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filteredBooks.map((book) => (
                <TableRow key={book.id}>
                  <TableCell className="font-medium">
                    {book.title}
                    {book.isbn && <span className="block text-xs text-gray-500 font-normal">ISBN: {book.isbn}</span>}
                  </TableCell>
                  <TableCell>{book.author}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{book.category}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{book.stock}</TableCell>
                  <TableCell className="text-center font-semibold text-blue-600">{book.available}</TableCell>
                  <TableCell className="text-center">
                    {book.available > 0 ? (
                      <Badge variant="success">Tersedia</Badge>
                    ) : (
                      <Badge variant="destructive">Dipinjam</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(book)}>
                      <Edit2 className="h-4 w-4 text-gray-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(book.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold">{editingBook ? 'Edit Buku' : 'Tambah Buku Baru'}</h2>
              <Button variant="ghost" size="icon" onClick={handleCloseModal}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Judul Buku <span className="text-red-500">*</span></label>
                <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Penulis <span className="text-red-500">*</span></label>
                <Input required value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">ISBN (Opsional)</label>
                <Input value={formData.isbn} onChange={e => setFormData({...formData, isbn: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Kategori <span className="text-red-500">*</span></label>
                <Input required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="Contoh: Fiksi, Sains, Sejarah" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Total Stok Fisik <span className="text-red-500">*</span></label>
                <Input type="number" min="1" required value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value) || 0})} />
                {editingBook && <p className="text-xs text-gray-500">Mengubah stok akan menyesuaikan jumlah buku yang tersedia secara otomatis.</p>}
              </div>
              <div className="pt-4 flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleCloseModal}>Batal</Button>
                <Button type="submit">Simpan</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
