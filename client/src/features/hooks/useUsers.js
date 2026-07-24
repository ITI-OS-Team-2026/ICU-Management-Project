import { useState, useEffect, useCallback } from 'react';
import { usersService } from '../services/usersService';

export function useUsers() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await usersService.getUsers();
      setUsers(data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const createUser = async (data) => {
    const newUser = await usersService.createUser(data);
    setUsers((prev) => [...prev, newUser]);
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

  return { users, isLoading, error, refetch: fetchUsers, createUser, updateUser, deleteUser };
}
