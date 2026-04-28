import { useState, useEffect, useContext } from 'react';
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

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchExpenses = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Sort=date_desc is handled by the backend if requested,
      // but let's pass it to guarantee we get newest first.
      const response = await api.get('/expenses?sort=date_desc');
      setExpenses(response.data.data.expenses);
    } catch (err: any) {
      setError('Failed to load expenses.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Expense Tracker</h1>
          <p className="text-sm text-gray-500">Welcome back, {user?.name}</p>
        </div>
        <button
          onClick={logout}
          className="text-red-600 hover:text-red-800 font-medium px-4 py-2 border border-red-600 rounded-md hover:bg-red-50 transition"
        >
          Logout
        </button>
      </nav>

      <main className="max-w-5xl mx-auto px-4">
        {/* Expense Form */}
        <ExpenseForm onExpenseAdded={fetchExpenses} />

        {/* Expenses List */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-6 text-gray-800">Your Expenses</h3>
          
          {error && <div className="text-red-600 mb-4">{error}</div>}
          
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading expenses...</div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No expenses found. Add one above!</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 border-b">
                    <th className="py-3 px-4 font-medium">Date</th>
                    <th className="py-3 px-4 font-medium">Category</th>
                    <th className="py-3 px-4 font-medium">Description</th>
                    <th className="py-3 px-4 font-medium text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp) => (
                    <tr key={exp._id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(exp.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-800">{exp.description}</td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        {/* Convert Paise to Rupees for display */}
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
