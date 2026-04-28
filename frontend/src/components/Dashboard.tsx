import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../AuthContext';
import api from '../api';
import ExpenseForm from './ExpenseForm';

interface Expense {
  _id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  createdAt: string;
}

const CATEGORIES = [
  'All Categories',
  'Food',
  'Transport',
  'Shopping',
  'Entertainment',
  'Health',
  'Utilities',
  'Other',
];

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Food': return 'bg-red-100 text-red-800';
    case 'Transport': return 'bg-orange-100 text-orange-800';
    case 'Shopping': return 'bg-yellow-100 text-yellow-800';
    case 'Entertainment': return 'bg-green-100 text-green-800';
    case 'Health': return 'bg-blue-100 text-blue-800';
    case 'Utilities': return 'bg-purple-100 text-purple-800';
    default: return 'bg-pink-100 text-pink-800';
  }
};

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter & Sort state
  const [filterCategory, setFilterCategory] = useState('All Categories');
  const [sortOrder, setSortOrder] = useState('date_desc'); // 'date_desc' or 'date_asc'

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      let query = `/expenses?sort=${sortOrder}`;
      if (filterCategory !== 'All Categories') {
        query += `&category=${filterCategory}`;
      }

      const response = await api.get(query);
      setExpenses(response.data.data.expenses);
    } catch (err: any) {
      setError('Failed to load expenses.');
    } finally {
      setIsLoading(false);
    }
  }, [filterCategory, sortOrder]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Calculate total sum (convert from Paise to Rupees)
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0) / 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center mb-8 border-b-4 border-blue-500">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            Expense Tracker
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Welcome back, {user?.name}</p>
        </div>
        <button
          onClick={logout}
          className="text-red-600 font-bold px-5 py-2 border-2 border-red-200 rounded-lg hover:bg-red-50 hover:border-red-600 transition-all"
        >
          Logout
        </button>
      </nav>

      <main className="max-w-5xl mx-auto px-4 pb-12">
        {/* Total Sum Widget */}
        <div className="bg-gradient-to-r from-green-400 to-emerald-600 rounded-xl shadow-lg p-6 mb-8 text-white flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold opacity-90">Total Expenses</h2>
            <p className="text-4xl font-extrabold mt-1">₹{totalExpenses.toFixed(2)}</p>
          </div>
          <div className="bg-white/20 p-4 rounded-full">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Expense Form */}
        <ExpenseForm onExpenseAdded={fetchExpenses} />

        {/* Expenses Controls & List */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h3 className="text-2xl font-bold text-gray-800">Your Expenses</h3>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 font-medium"
              >
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 font-medium"
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
              </select>
            </div>
          </div>
          
          {error && <div className="text-red-600 mb-4 font-medium bg-red-50 p-3 rounded">{error}</div>}
          
          {isLoading ? (
            <div className="text-center py-12 text-gray-500 font-medium animate-pulse">Loading expenses...</div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12 text-gray-500 font-medium bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              No expenses found. Add one above!
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase tracking-wider">
                    <th className="py-4 px-6 font-semibold">Date</th>
                    <th className="py-4 px-6 font-semibold">Category</th>
                    <th className="py-4 px-6 font-semibold">Description</th>
                    <th className="py-4 px-6 font-semibold text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {expenses.map((exp) => (
                    <tr key={exp._id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6 text-gray-600 font-medium">
                        {new Date(exp.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${getCategoryColor(exp.category)}`}>
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-800 font-medium">{exp.description}</td>
                      <td className="py-4 px-6 text-right font-bold text-gray-900 text-lg">
                        ₹{(exp.amount / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
