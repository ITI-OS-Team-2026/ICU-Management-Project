import { useState, useEffect, useCallback } from 'react';
import { usersService } from '../services/usersService';

export function useUsers(initialFilters = {}) {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [usersData, statsData] = await Promise.all([
        usersService.getUsers(filters),
        usersService.getUserStats()
      ]);
      
      setUsers(usersData);
      setStats(statsData);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to fetch users data');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createUser = async (data) => {
    const newUser = await usersService.createUser(data);
    await fetchData();
    return newUser;
  };

  const updateUser = async (id, data) => {
    const updatedUser = await usersService.updateUser(id, data);
    setUsers((prev) => prev.map((u) => (u.id === id ? updatedUser : u)));
    return updatedUser;
  };

  const deleteUser = async (id) => {
    await usersService.deleteUser(id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const resetPassword = async (id, newPassword) => {
    await usersService.resetPassword(id, newPassword);
  };

  return { 
    users, 
    stats, 
    filters, 
    setFilters, 
    isLoading, 
    error, 
    refetch: fetchData, 
    createUser, 
    updateUser, 
    deleteUser,
    resetPassword
  };
}
