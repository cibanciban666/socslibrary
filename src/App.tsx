/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router';
import { LibraryProvider } from './context/LibraryContext';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Books from './pages/Books';
import Transactions from './pages/Transactions';

export default function App() {
  return (
    <LibraryProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/books" element={<Books />} />
            <Route path="/transactions" element={<Transactions />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </LibraryProvider>
  );
}
